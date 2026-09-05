import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const toModuleUrl = (source) => {
	return `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
};

const packageMetadata = JSON.parse(await readFile(
	new URL('../package.json', import.meta.url),
	'utf8',
));

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
		formData.append('ct_callback_error_code', result.errorCode);
		formData.append('ct_callback_id', result.callbackRequestId);
		formData.append('ct_callback_source', result.source);
		formData.append('ct_submission_id', result.submissionId);
		formData.append('ct_session_id', result.sessionId);
		formData.append('ct_route_key', result.routeKey);
		formData.append('ct_mod_id', result.modId);
		formData.append('ct_site_id', result.siteId);
		formData.append('ct_client_version', ${JSON.stringify(packageMetadata.version)});
	};
`);

const analyticsModuleUrl = toModuleUrl(`
	export const reachGoal = (goal, payload = {}) => {
		globalThis.__formGoalCalls.push({ goal, payload });
	};
	export const getFormDataObject = (formData, formId) => {
		const eventProperties = {};
		formData.forEach((value, key) => {
			if (key === 'ct_client_version') {
				return;
			}
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
const clientErrorReportModuleUrl = toModuleUrl(`
	export const reportClientFormError = async () => true;
	export const getFormResponseDiagnostics = () => ({});
`);

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
	)
	.replace(
		"from './form/client-error-report'",
		`from ${JSON.stringify(clientErrorReportModuleUrl)}`,
	)
	.replace(
		"from './form/lead-attempt'",
		`from ${JSON.stringify(new URL('../lib/form/lead-attempt.js', import.meta.url).href)}`,
	);

test('form public API exports safe response diagnostics', async () => {
	const previousDocument = globalThis.document;
	globalThis.document = { getElementById: () => null };
	try {
		const { getFormResponseDiagnostics, reportClientFormError } = await import(toModuleUrl(instrumentedFormSource));
		assert.equal(typeof getFormResponseDiagnostics, 'function');
		assert.equal(typeof reportClientFormError, 'function');
	} finally {
		globalThis.document = previousDocument;
	}
});

test('phoneChecker uses the same actionable format message as submit validation', async () => {
	const previousDocument = globalThis.document;
	const errorField = {
		innerText: '',
		classList: { remove() {} },
	};
	const form = {
		querySelector(selector) {
			return selector === '.phone' ? errorField : null;
		},
	};
	const phone = {
		value: '+7 12',
		closest(selector) {
			return selector === 'form' ? form : null;
		},
	};
	globalThis.document = {
		getElementById() { return null; },
		querySelectorAll() { return []; },
	};

	try {
		const { phoneChecker } = await import(toModuleUrl(instrumentedFormSource));
		assert.equal(phoneChecker(phone), false);
		assert.equal(
			errorField.innerText,
			'Укажите номер телефона в формате +7 999 999-99-99',
		);
	} finally {
		globalThis.document = previousDocument;
	}
});

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
	globalThis.fetch = async (url, options) => {
		globalThis.__formRequest = { url, options };
		return {
			async text() {
				return JSON.stringify({
					answer: 'ok',
					calltouch_callback: {
						status: 'client_success',
					},
				});
			},
		};
	};

	try {
		const { connectForms } = await import(toModuleUrl(instrumentedFormSource));
		connectForms('/lead/', {
			callback() {},
			ct_routeKey: 'route-one',
			validation: () => true,
		});
		assert.equal(form.noValidate, true);
		await listeners.submit({
			preventDefault() {},
		});

		const successGoal = globalThis.__formGoalCalls.find(
			(call) => call.goal === 'form_success',
		);
		assert.ok(successGoal);
		assert.equal(successGoal.payload.eventCategory, 'CallbackLead');
		assert.equal('sendCalltouchLead' in successGoal.payload, false);
		assert.equal(successGoal.payload.sourceName, 'page');
		assert.equal(successGoal.payload.siteId, 'site-one');
		assert.equal(successGoal.payload.eventProperties.phone, '+7 900 000-00-01');
		assert.equal(successGoal.payload.eventProperties.name, 'Иван');
		assert.equal(successGoal.payload.eventProperties.utm_source, 'integration-test');
		assert.equal(successGoal.payload.eventProperties.ct_callback_status, 'success');
		assert.equal(successGoal.payload.eventProperties.ct_callback_source, 'client');
		assert.equal('ct_client_version' in successGoal.payload.eventProperties, false);
		assert.equal(successGoal.payload.eventProperties.formID, 'callback-form');

		const wirePayload = globalThis.__formRequest.options.body;
		assert.equal(wirePayload.get('ct_callback'), null);
		assert.equal(wirePayload.get('ct_callback_status'), 'success');
		assert.equal(wirePayload.get('ct_callback_id'), 'callback-one');
		assert.equal(wirePayload.get('ct_callback_source'), 'client');
		assert.equal(wirePayload.get('ct_client_version'), packageMetadata.version);
	} finally {
		delete globalThis.__formGoalCalls;
		delete globalThis.__formRequest;
		globalThis.document = previousGlobals.document;
		globalThis.fetch = previousGlobals.fetch;
		globalThis.FormData = previousGlobals.FormData;
		globalThis.window = previousGlobals.window;
	}
});

test('connectForms emits one privacy-safe form_required for blocked client submit', async () => {
	const previousGlobals = {
		document: globalThis.document,
		FormData: globalThis.FormData,
		window: globalThis.window,
	};
	const listeners = {};
	const form = {
		id: 'required-form',
		fields: {},
		addEventListener(event, callback) {
			listeners[event] = callback;
		},
		querySelector(selector) {
			if (selector === '[type="submit"]') {
				return {
					tagName: 'BUTTON',
					innerText: 'Отправить',
					setAttribute() {},
					removeAttribute() {},
				};
			}
			return null;
		},
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

	try {
		const { connectForms } = await import(toModuleUrl(instrumentedFormSource));
		connectForms('/lead/', {
			validation: () => ({
				isValid: false,
				invalidFields: ['phone', 'email'],
			}),
		});
		await listeners.submit({ preventDefault() {} });

		assert.deepEqual(globalThis.__formGoalCalls, [{
			goal: 'form_required',
			payload: {
				eventProperties: {
					validationSource: 'client',
					formID: 'required-form',
					invalidFields: 'phone,email',
					invalidCount: 2,
				},
			},
		}]);
	} finally {
		delete globalThis.__formGoalCalls;
		globalThis.document = previousGlobals.document;
		globalThis.FormData = previousGlobals.FormData;
		globalThis.window = previousGlobals.window;
	}
});

test('connectForms categorizes a lead network failure without exposing error details', async () => {
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
		id: 'network-form',
		fields: { phone: '+7 900 000-00-01' },
		addEventListener(event, callback) {
			listeners[event] = callback;
		},
		querySelector(selector) {
			if (selector === '[type="submit"]') return button;
			if (selector === '[name="phone"]') return { value: this.fields.phone };
			return null;
		},
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
		getElementById() { return null; },
		querySelectorAll(selector) {
			return selector === 'form:not(.vue-form)' ? [form] : [];
		},
	};
	globalThis.fetch = async () => {
		throw new Error('private response body must not enter analytics');
	};

	try {
		const { connectForms } = await import(toModuleUrl(instrumentedFormSource));
		connectForms('/lead/', {
			callback_error() {},
			validation: () => true,
		});
		await listeners.submit({ preventDefault() {} });

		const errorGoal = globalThis.__formGoalCalls.find(
			(call) => call.goal === 'form_error',
		);
		assert.deepEqual(errorGoal, {
			goal: 'form_error',
			payload: {
				eventProperties: {
					errorSource: 'network',
					errorStage: 'lead_request',
					formID: 'network-form',
				},
			},
		});
		assert.equal(JSON.stringify(errorGoal).includes('private response body'), false);
	} finally {
		delete globalThis.__formGoalCalls;
		globalThis.document = previousGlobals.document;
		globalThis.fetch = previousGlobals.fetch;
		globalThis.FormData = previousGlobals.FormData;
		globalThis.window = previousGlobals.window;
	}
});
