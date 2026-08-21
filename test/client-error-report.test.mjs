import assert from 'node:assert/strict';
import test from 'node:test';

const { reportClientFormError } = await import('../lib/form/client-error-report.js');

test('client error reporter sends a bounded payload once per session', async () => {
	const previousWindow = globalThis.window;
	const previousFetch = globalThis.fetch;
	const stored = new Map();
	const requests = [];
	globalThis.window = {
		location: { pathname: '/models/test/?phone=must-not-pass' },
		sessionStorage: {
			getItem: (key) => stored.get(key) || null,
			setItem: (key, value) => stored.set(key, value),
		},
	};
	globalThis.fetch = async (url, options) => {
		requests.push({ url, options });
	};

	try {
		const context = {
			formID: 'callback-form',
			errorSource: 'network',
			errorStage: 'lead_request',
			httpStatus: 503,
			error: 'private error text',
		};
		assert.equal(await reportClientFormError(context), true);
		assert.equal(await reportClientFormError(context), false);
		assert.equal(requests.length, 1);
		assert.equal(requests[0].options.mode, 'no-cors');
		assert.equal(requests[0].options.credentials, 'omit');
		assert.deepEqual(JSON.parse(requests[0].options.body), {
			version: 1,
			goal: 'form_error',
			errorSource: 'network',
			errorStage: 'lead_request',
			formID: 'callback-form',
			pagePath: '/models/test/',
			httpStatus: 503,
		});
		assert.equal(requests[0].options.body.includes('private error text'), false);
		assert.equal(requests[0].options.body.includes('must-not-pass'), false);
	} finally {
		globalThis.window = previousWindow;
		globalThis.fetch = previousFetch;
	}
});

test('client error reporter rejects unknown categories', async () => {
	const previousWindow = globalThis.window;
	globalThis.window = { location: { pathname: '/' } };
	try {
		assert.equal(await reportClientFormError({
			errorSource: 'unknown',
			errorStage: 'lead_request',
		}), false);
	} finally {
		globalThis.window = previousWindow;
	}
});
