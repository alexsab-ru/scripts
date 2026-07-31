import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const toModuleUrl = (source) => {
	return `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
};

const cookieModuleUrl = toModuleUrl(`
	export const getCookie = () => null;
	export const setCookie = () => {};
	export const deleteCookie = () => {};
	export const setAgreeCookie = () => {};
`);

const calltouchModuleUrl = toModuleUrl(`
	export const attemptCalltouchCallback = async () => ({
		status: 'success',
		errorCode: '',
		callbackRequestId: 'callback-one',
		source: 'client',
		submissionId: 'submission-one',
		sessionId: 'session-one',
		routeKey: 'route-one',
		modId: 'mod-one',
		siteId: 'site-one',
	});
	export const appendCalltouchResultToFormData = (formData, result) => {
		formData.append('ct_callback_status', result.status);
		formData.append('ct_callback_id', result.callbackRequestId);
		formData.append('ct_session_id', result.sessionId);
		formData.append('ct_callback', 'true');
	};
`);

const analyticsModuleUrl = toModuleUrl(`
	export const reachGoal = (goal, payload = {}) => {
		globalThis.__formGoalCalls.push({ goal, payload });
	};
	export const getFormDataObject = (formData, formId) => {
		const eventProperties = {};
		formData.forEach((value, key) => {
			eventProperties[key] = value;
		});
		eventProperties.formID = formId;
		return {
			eventCategory: 'Lead',
			eventProperties,
			sourceName: 'page',
		};
	};
`);

const callbackAnalyticsSource = await readFile(
	new URL('../lib/form/calltouch-analytics.js', import.meta.url),
	'utf8',
);
const callbackAnalyticsModuleUrl = toModuleUrl(callbackAnalyticsSource);
const urlParamsSource = await readFile(
	new URL('../lib/form/url-params.js', import.meta.url),
	'utf8',
);
const urlParamsModuleUrl = toModuleUrl(urlParamsSource);

const formSource = await readFile(
	new URL('../lib/form.js', import.meta.url),
	'utf8',
);
const instrumentedFormSource = formSource
	.replace(
		"from './cookie'",
		`from ${JSON.stringify(cookieModuleUrl)}`,
	)
	.replace(
		"from './calltouch'",
		`from ${JSON.stringify(calltouchModuleUrl)}`,
	)
	.replace(
		"from './analytics'",
		`from ${JSON.stringify(analyticsModuleUrl)}`,
	)
	.replace(
		"from './form/calltouch-analytics'",
		`from ${JSON.stringify(callbackAnalyticsModuleUrl)}`,
	)
	.replace(
		"from './form/url-params'",
		`from ${JSON.stringify(urlParamsModuleUrl)}`,
	);

class FakeFormData {
	constructor(form) {
		this.values = new Map(form ? Object.entries(form.fields) : []);
	}

	append(key, value) {
		this.values.set(key, value);
	}

	delete(key) {
		this.values.delete(key);
	}

	get(key) {
		return this.values.get(key) || null;
	}

	set(key, value) {
		this.values.set(key, value);
	}

	entries() {
		return this.values.entries();
	}

	forEach(callback) {
		this.values.forEach((value, key) => callback(value, key, this));
	}

	[Symbol.iterator]() {
		return this.entries();
	}
}

test('connectForms keeps the complete payload after client callback success', async () => {
	const previousGlobals = {
		document: globalThis.document,
		fetch: globalThis.fetch,
		FormData: globalThis.FormData,
		window: globalThis.window,
	};
	const listeners = {};
	const button = {
		tagName: 'BUTTON',
		innerText: 'Отправить',
		setAttribute() {},
		removeAttribute() {},
	};
	const form = {
		id: 'callback-form',
		fields: {
			phone: '+7 900 000-00-01',
			name: 'Иван',
			utm_source: 'integration-test',
		},
		addEventListener(event, callback) {
			listeners[event] = callback;
		},
		querySelector(selector) {
			if (selector === '[type="submit"]') {
				return button;
			}
			if (selector === '[name="phone"]') {
				return { value: this.fields.phone };
			}
			if (selector === '[name="name"]') {
				return { value: this.fields.name };
			}
			return null;
		},
		reset() {},
	};

	globalThis.__formGoalCalls = [];
	globalThis.FormData = FakeFormData;
	globalThis.window = {
		location: {
			hostname: 'dev.alexsab.ru',
			origin: 'https://dev.alexsab.ru',
			pathname: '/',
			search: '',
		},
	};
	globalThis.document = {
		getElementById() {
			return null;
		},
		querySelectorAll(selector) {
			return selector === 'form:not(.vue-form)' ? [form] : [];
		},
	};
	globalThis.fetch = async () => ({
		async text() {
			return JSON.stringify({
				answer: 'ok',
				calltouch_callback: {
					status: 'client_success',
				},
			});
		},
	});

	try {
		const { connectForms } = await import(toModuleUrl(instrumentedFormSource));
		connectForms('/lead/', {
			callback() {},
			ct_routeKey: 'route-one',
			validation: () => true,
		});
		await listeners.submit({
			preventDefault() {},
		});

		const successGoal = globalThis.__formGoalCalls.find(
			(call) => call.goal === 'form_success',
		);
		assert.ok(successGoal);
		assert.equal(successGoal.payload.eventCategory, 'CallbackLead');
		assert.equal(successGoal.payload.sendCalltouchLead, false);
		assert.equal(successGoal.payload.sourceName, 'page');
		assert.equal(successGoal.payload.siteId, 'site-one');
		assert.equal(successGoal.payload.eventProperties.phone, '+7 900 000-00-01');
		assert.equal(successGoal.payload.eventProperties.name, 'Иван');
		assert.equal(successGoal.payload.eventProperties.utm_source, 'integration-test');
		assert.equal(successGoal.payload.eventProperties.ct_callback_status, 'success');
		assert.equal(successGoal.payload.eventProperties.formID, 'callback-form');
	} finally {
		delete globalThis.__formGoalCalls;
		globalThis.document = previousGlobals.document;
		globalThis.fetch = previousGlobals.fetch;
		globalThis.FormData = previousGlobals.FormData;
		globalThis.window = previousGlobals.window;
	}
});
