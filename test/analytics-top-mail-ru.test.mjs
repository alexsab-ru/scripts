import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../lib/analytics.js', import.meta.url), 'utf8');
const mockUrl = `data:text/javascript;base64,${Buffer.from(
	'export const sendToCallTouch = async () => {};'
).toString('base64')}`;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source.replace(
	"from './calltouch'", `from ${JSON.stringify(mockUrl)}`
)).toString('base64')}`;

async function withAnalytics(options, run) {
	const metrikaCalls = [];
	const { scriptsConfig, ...windowOptions } = options;
	globalThis.window = { dataLayer: [], isGTMInstalled: false, ...windowOptions };
	globalThis.document = {
		querySelectorAll: () => [],
		getElementById: id => id === 'scripts_json' && scriptsConfig !== undefined
			? { textContent: JSON.stringify(scriptsConfig) }
			: null,
	};
	globalThis.Ya = { _metrika: { getCounters: () => [{ id: 123 }] } };
	globalThis.ym = (...args) => metrikaCalls.push(args);
	try {
		await run(await import(moduleUrl), metrikaCalls);
	} finally {
		delete globalThis.window;
		delete globalThis.document;
		delete globalThis.Ya;
		delete globalThis.ym;
	}
}

const pixelConfig = ids => ({
	'top.mail.ru': { fn: '_tm', prod: true, value: ids.map(id => ({ id })) },
});

test('goals reach every configured VK pixel alongside Metrika without form data', async () => {
	await withAnalytics({ scriptsConfig: pixelConfig([' 456 ', '', null, 789, '456']) }, async ({ reachGoal }, metrikaCalls) => {
		reachGoal('form_success', { eventProperties: { phone: '79000000001' } });
		assert.deepEqual(window._tmr, [
			{ type: 'reachGoal', id: '456', goal: 'form_success' },
			{ type: 'reachGoal', id: '789', goal: 'form_success' },
		]);
		assert.equal(metrikaCalls.length, 1);
		assert.equal(metrikaCalls[0][2], 'form_success');
	});
});

test('initialized pageView IDs take precedence over JSON and are deduplicated', async () => {
	const queue = [
		null,
		{ type: 'pageView', id: '' },
		{ type: 'pageView', id: '456' },
		{ type: 'pageView', id: '456' },
		{ type: 'pageView', id: 789 },
		{ type: 'reachGoal', id: '999', goal: 'old_goal' },
	];
	await withAnalytics({ scriptsConfig: pixelConfig(['111']), _tmr: queue }, async ({ reachGoal }, metrikaCalls) => {
		// При наличии pageView JSON вообще не читается.
		document.getElementById = () => { throw new Error('unexpected JSON read'); };
		reachGoal('form_success');
		assert.deepEqual(queue.slice(6), [
			{ type: 'reachGoal', id: '456', goal: 'form_success' },
			{ type: 'reachGoal', id: 789, goal: 'form_success' },
		]);
		assert.equal(metrikaCalls.length, 1);
	});
});

test('an empty pixel queue uses JSON until pageView IDs become available', async () => {
	const queue = [];
	await withAnalytics({ scriptsConfig: pixelConfig(['456']), _tmr: queue }, async ({ reachGoal }) => {
		reachGoal('form_open');
		queue.push({ type: 'pageView', id: '789' });
		reachGoal('form_close');
		assert.deepEqual(queue, [
			{ type: 'reachGoal', id: '456', goal: 'form_open' },
			{ type: 'pageView', id: '789' },
			{ type: 'reachGoal', id: '789', goal: 'form_close' },
		]);
	});
});

test('VK goals also work through GTM and retain the existing pixel queue', async () => {
	const queue = [{ type: 'pageView', id: '456' }];
	await withAnalytics({ scriptsConfig: pixelConfig(['456']), _tmr: queue, isGTMInstalled: true }, async ({ reachGoal }, metrikaCalls) => {
		reachGoal('phone_click');
		assert.equal(window._tmr, queue);
		assert.deepEqual(queue, [
			{ type: 'pageView', id: '456' },
			{ type: 'reachGoal', id: '456', goal: 'phone_click' },
		]);
		assert.equal(window.dataLayer.at(-1).event, 'reachGoal-phone_click');
		assert.equal(metrikaCalls.length, 0);
	});
});

test('a loaded pixel API receives goals through push', async () => {
	const calls = [];
	const pixelApi = { push: event => calls.push(event) };
	await withAnalytics({ scriptsConfig: pixelConfig(['456']), _tmr: pixelApi }, async ({ reachGoal }) => {
		reachGoal('form_open');
		assert.equal(window._tmr, pixelApi);
		assert.deepEqual(calls, [{ type: 'reachGoal', id: '456', goal: 'form_open' }]);
	});
});

test('missing or empty VK configuration leaves Metrika working without creating a queue', async () => {
	for (const options of [{}, { scriptsConfig: {} }, { scriptsConfig: pixelConfig(['', ' ', null]) }]) {
		await withAnalytics(options, async ({ reachGoal }, metrikaCalls) => {
			reachGoal('form_click');
			assert.equal('_tmr' in window, false);
			assert.equal(metrikaCalls.length, 1);
		});
	}
});

test('pixel failure does not interrupt Metrika', async () => {
	const originalError = console.error;
	const errors = [];
	console.error = message => errors.push(message);
	try {
		await withAnalytics({ scriptsConfig: pixelConfig(['456']), _tmr: { push() { throw new Error('blocked'); } } }, async ({ reachGoal }, metrikaCalls) => {
			assert.doesNotThrow(() => reachGoal('form_change'));
			assert.equal(metrikaCalls.length, 1);
			assert.deepEqual(errors, ['form_change - error send goal to Top.Mail.Ru']);
		});
	} finally {
		console.error = originalError;
	}
});

test('invalid scripts JSON does not interrupt Metrika', async () => {
	const originalError = console.error;
	console.error = () => {};
	try {
		await withAnalytics({}, async ({ reachGoal }, metrikaCalls) => {
			document.getElementById = () => ({ textContent: '{invalid' });
			assert.doesNotThrow(() => reachGoal('form_click'));
			assert.equal('_tmr' in window, false);
			assert.equal(metrikaCalls.length, 1);
		});
	} finally {
		console.error = originalError;
	}
});
