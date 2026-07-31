import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const toModuleUrl = (source) => {
	return `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
};

const loadAnalytics = async () => {
	const source = await readFile(
		new URL('../lib/analytics.js', import.meta.url),
		'utf8',
	);
	const calltouchMockUrl = toModuleUrl(`
		export const sendToCallTouch = async (payload) => {
			globalThis.__sentCalltouchPayloads.push(payload);
		};
	`);
	return import(toModuleUrl(source.replace(
		"from './calltouch'",
		`from ${JSON.stringify(calltouchMockUrl)}`,
	)));
};

const createDocument = (gtmInstalled) => ({
	querySelectorAll(selector) {
		if (selector === 'script' && gtmInstalled) {
			return [{ src: 'https://www.googletagmanager.com/gtm.js?id=GTM-TEST' }];
		}
		return [];
	},
});

test('non-GTM Calltouch sender honors the explicit false flag', async () => {
	globalThis.__sentCalltouchPayloads = [];
	globalThis.window = {
		calltouch_params: {
			site_id: 'site-one',
			mod_id: 'mod-one',
		},
		dataLayer: [],
		isGTMInstalled: false,
	};
	globalThis.document = createDocument(false);
	globalThis.Ya = {
		_metrika: {
			getCounters: () => [],
		},
	};
	globalThis.ym = () => {};

	try {
		const { reachGoal } = await loadAnalytics();
		reachGoal('form_success', {
			eventCategory: 'Lead',
			sendCalltouchLead: false,
		});
		await Promise.resolve();
		assert.equal(globalThis.__sentCalltouchPayloads.length, 0);
	} finally {
		delete globalThis.__sentCalltouchPayloads;
		delete globalThis.window;
		delete globalThis.document;
		delete globalThis.Ya;
		delete globalThis.ym;
	}
});

test('GTM dataLayer receives the callback payload without decision fields', async () => {
	globalThis.__sentCalltouchPayloads = [];
	globalThis.window = {
		calltouch_params: {
			site_id: 'site-one',
			mod_id: 'mod-one',
		},
		dataLayer: [],
		isGTMInstalled: true,
	};
	globalThis.document = createDocument(true);

	try {
		const { reachGoal } = await loadAnalytics();
		reachGoal('form_success', {
			eventCategory: 'CallbackLead',
			eventProperties: {
				phone: '79000000001',
			},
			sourceName: 'page',
		});
		const event = window.dataLayer.at(-1);
		assert.equal(event.event, 'reachGoal-form_success');
		assert.equal(event.eventCategory, 'CallbackLead');
		assert.equal('sendCalltouchLead' in event, false);
		assert.equal(event.sourceName, 'page');
		assert.equal(event.eventProperties.phone, '79000000001');
		assert.equal(globalThis.__sentCalltouchPayloads.length, 0);
	} finally {
		delete globalThis.__sentCalltouchPayloads;
		delete globalThis.window;
		delete globalThis.document;
	}
});
