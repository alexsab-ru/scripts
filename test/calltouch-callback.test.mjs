import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const toModuleUrl = (source) => {
	return `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
};

const calltouchModuleSource = await readFile(
	new URL('../lib/calltouch/calltouch-module.js', import.meta.url),
	'utf8',
);
const calltouchModuleUrl = toModuleUrl(calltouchModuleSource);
const callbackModuleSource = await readFile(
	new URL('../lib/calltouch/create-request.js', import.meta.url),
	'utf8',
);
const callbackModule = await import(toModuleUrl(
	callbackModuleSource.replace(
		"'./calltouch-module.js'",
		JSON.stringify(calltouchModuleUrl),
	),
));
const urlParamsModule = await import(toModuleUrl(await readFile(
	new URL('../lib/form/url-params.js', import.meta.url),
	'utf8',
)));

const {
	appendCalltouchResultToFormData,
	attemptCalltouchCallback,
	createRequest,
	resolveCalltouchProject,
} = callbackModule;
const { isBlockedUrlParam } = urlParamsModule;

const withWindow = async (browserWindow, callback) => {
	const previousWindow = globalThis.window;
	globalThis.window = browserWindow;
	try {
		return await callback();
	} finally {
		if (previousWindow === undefined) {
			delete globalThis.window;
		} else {
			globalThis.window = previousWindow;
		}
	}
};

const workingGlobalCtw = (createRequestCallback) => ({
	getRouteKeyData(routeKey, callback) {
		callback(true, {
			widgetFound: true,
			widgetData: {
				callCenterWorkingMode: 'working_hours',
			},
		});
	},
	createRequest(routeKey, phone, fields, callback) {
		createRequestCallback({ routeKey, phone, fields, callback });
	},
});

test('resolves a single configured Calltouch project', { concurrency: false }, async () => {
	await withWindow({
		calltouch_params: {
			mod_id: ['mod-one'],
			site_id: ['site-one'],
		},
	}, async () => {
		assert.deepEqual(resolveCalltouchProject(), {
			modId: 'mod-one',
			siteId: 'site-one',
			isMultiProject: false,
		});
	});
});

test('resolves a selected multi-project pair by site id', { concurrency: false }, async () => {
	await withWindow({
		calltouch_params: {
			mod_id: ['mod-one', 'mod-two'],
			site_id: ['site-one', 'site-two'],
		},
	}, async () => {
		assert.deepEqual(resolveCalltouchProject({ siteId: 'site-two' }), {
			modId: 'mod-two',
			siteId: 'site-two',
			isMultiProject: true,
		});
	});
});

test('uses the scoped ctw instance for the selected multi-project pair', { concurrency: false }, async () => {
	let sessionModId = '';
	let globalInstanceUsed = false;
	await withWindow({
		calltouch_params: {
			mod_id: ['mod-one', 'mod-two'],
			site_id: ['site-one', 'site-two'],
		},
		ct(command, modId) {
			if (command === 'calltracking_params') {
				sessionModId = modId;
			}
			return { sessionId: 'session-two' };
		},
		ctw: workingGlobalCtw(() => {
			globalInstanceUsed = true;
		}),
		'ctw_mod-two': {
			createRequest(routeKey, phone, fields, callback) {
				callback(true, { callbackRequestId: 'callback-two' });
			},
		},
	}, async () => {
		const result = await attemptCalltouchCallback({
			routeKey: 'route-two',
			siteId: 'site-two',
			phone: '79000000002',
			timeoutMs: 50,
		});
		assert.equal(result.status, 'success');
		assert.equal(result.modId, 'mod-two');
		assert.equal(result.siteId, 'site-two');
		assert.equal(result.sessionId, 'session-two');
		assert.equal(sessionModId, 'mod-two');
		assert.equal(globalInstanceUsed, false);
	});
});

test('does not guess a project in a multi-project setup', { concurrency: false }, async () => {
	await withWindow({
		calltouch_params: {
			mod_id: ['mod-one', 'mod-two'],
			site_id: ['site-one', 'site-two'],
		},
	}, async () => {
		const result = await attemptCalltouchCallback({
			routeKey: 'route',
			phone: '+7 900 000-00-01',
			timeoutMs: 20,
		});
		assert.equal(result.status, 'not_configured');
		assert.equal(result.errorCode, 'project_ambiguous');
	});
});

test('returns success and acquires session id in parallel', { concurrency: false }, async () => {
	let receivedRequest;
	await withWindow({
		calltouch_params: {
			mod_id: 'mod-one',
			site_id: 'site-one',
		},
		ct() {
			return { sessionId: 'session-one' };
		},
		ctw: workingGlobalCtw(({ routeKey, phone, fields, callback }) => {
			receivedRequest = { routeKey, phone, fields };
			setTimeout(() => callback(true, { callbackRequestId: 'callback-one' }), 5);
		}),
	}, async () => {
		const result = await attemptCalltouchCallback({
			routeKey: 'route-one',
			phone: '+7 900 000-00-01',
			name: 'Иван',
			timeoutMs: 100,
		});
		assert.equal(result.status, 'success');
		assert.equal(result.errorCode, '');
		assert.equal(result.callbackRequestId, 'callback-one');
		assert.equal(result.sessionId, 'session-one');
		assert.equal(result.modId, 'mod-one');
		assert.equal(result.siteId, 'site-one');
		assert.deepEqual(receivedRequest, {
			routeKey: 'route-one',
			phone: '79000000001',
			fields: [{ name: 'Name', value: 'Иван' }],
		});
	});
});

test('waits for a delayed ctw instance within the total budget', { concurrency: false }, async () => {
	await withWindow({
		calltouch_params: {
			mod_id: 'mod-one',
			site_id: 'site-one',
		},
		ct() {
			return { sessionId: 'session-one' };
		},
	}, async () => {
		setTimeout(() => {
			window.ctw = workingGlobalCtw(({ callback }) => {
				callback(true, { callbackRequestId: 'callback-delayed' });
			});
		}, 15);
		const startedAt = Date.now();
		const result = await attemptCalltouchCallback({
			routeKey: 'route-one',
			phone: '79000000001',
			timeoutMs: 100,
			pollIntervalMs: 5,
		});
		assert.equal(result.status, 'success');
		assert.equal(result.callbackRequestId, 'callback-delayed');
		assert.ok(Date.now() - startedAt < 100);
	});
});

test('returns a technical failure when ctw is unavailable', { concurrency: false }, async () => {
	await withWindow({}, async () => {
		const result = await attemptCalltouchCallback({
			routeKey: 'route-one',
			phone: '79000000001',
			timeoutMs: 20,
			pollIntervalMs: 2,
		});
		assert.equal(result.status, 'technical_failure');
		assert.equal(result.errorCode, 'ctw_unavailable');
	});
});

test('bounds a callback that never responds', { concurrency: false }, async () => {
	await withWindow({
		ctw: workingGlobalCtw(() => {}),
	}, async () => {
		const startedAt = Date.now();
		const result = await attemptCalltouchCallback({
			routeKey: 'route-one',
			phone: '79000000001',
			timeoutMs: 25,
		});
		assert.equal(result.status, 'technical_failure');
		assert.equal(result.errorCode, 'ctw_timeout');
		assert.ok(Date.now() - startedAt < 100);
	});
});

test('classifies documented business failures as rejected', { concurrency: false }, async (t) => {
	for (const errorCode of [
		'request_throttle_timeout',
		'request_throttle_count',
		'request_phone_blacklisted',
		'request_widget_not_found',
		'validation_error',
	]) {
		await t.test(errorCode, { concurrency: false }, async () => {
			await withWindow({
				ctw: workingGlobalCtw(({ callback }) => {
					callback(false, { type: errorCode });
				}),
			}, async () => {
				const result = await attemptCalltouchCallback({
					routeKey: 'route-one',
					phone: '79000000001',
					timeoutMs: 50,
				});
				assert.equal(result.status, 'rejected');
				assert.equal(result.errorCode, errorCode);
			});
		});
	}
});

test('classifies known transport failures as technical', { concurrency: false }, async (t) => {
	for (const errorCode of ['server_error', 'unknown_error', 'network_error']) {
		await t.test(errorCode, { concurrency: false }, async () => {
			await withWindow({
				ctw: workingGlobalCtw(({ callback }) => {
					callback(false, { type: errorCode });
				}),
			}, async () => {
				const result = await attemptCalltouchCallback({
					routeKey: 'route-one',
					phone: '79000000001',
					timeoutMs: 50,
				});
				assert.equal(result.status, 'technical_failure');
				assert.equal(result.errorCode, errorCode);
			});
		});
	}
});

// Незнакомый код не должен провоцировать серверный ретрай: сервер повторяет
// попытку только на technical_failure.
test('classifies unrecognized error codes as unknown', { concurrency: false }, async (t) => {
	for (const errorCode of ['another_error', 'some_future_calltouch_code']) {
		await t.test(errorCode, { concurrency: false }, async () => {
			await withWindow({
				ctw: workingGlobalCtw(({ callback }) => {
					callback(false, { type: errorCode });
				}),
			}, async () => {
				const result = await attemptCalltouchCallback({
					routeKey: 'route-one',
					phone: '79000000001',
					timeoutMs: 50,
				});
				assert.equal(result.status, 'unknown');
				assert.equal(result.errorCode, errorCode);
			});
		});
	}
});

test('classifies disabled or missing widgets as rejected', { concurrency: false }, async (t) => {
	const cases = [
		{
			expected: 'widget_not_found',
			data: { widgetFound: false },
		},
		{
			expected: 'widget_unavailable',
			data: {
				widgetFound: true,
				widgetData: {
					callCenterWorkingMode: 'non_working_hours',
					collectNonWorkingRequests: false,
				},
			},
		},
	];
	for (const currentCase of cases) {
		await t.test(currentCase.expected, { concurrency: false }, async () => {
			await withWindow({
				ctw: {
					getRouteKeyData(routeKey, callback) {
						callback(true, currentCase.data);
					},
				},
			}, async () => {
				const result = await attemptCalltouchCallback({
					routeKey: 'route-one',
					phone: '79000000001',
					timeoutMs: 50,
				});
				assert.equal(result.status, 'rejected');
				assert.equal(result.errorCode, currentCase.expected);
			});
		});
	}
});

test('appends only the structured callback contract', () => {
	const formData = new FormData();
	formData.append('phone', '79000000001');
	formData.append('ct_callback', 'attacker');
	formData.append('ct_callback_status', 'attacker');
	formData.append('ct_secret_future_field', 'attacker');
	formData.append('ctw_createRequest', '{"stack":"raw"}');

	appendCalltouchResultToFormData(formData, {
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

	assert.equal(formData.get('phone'), '79000000001');
	assert.equal(formData.get('ct_callback'), 'true');
	assert.equal(formData.get('ct_callback_status'), 'success');
	assert.equal(formData.get('ct_callback_id'), 'callback-one');
	assert.equal(formData.get('ct_submission_id'), 'submission-one');
	assert.equal(formData.get('ct_session_id'), 'session-one');
	assert.equal(formData.get('ct_route_key'), 'route-one');
	assert.equal(formData.get('ct_mod_id'), 'mod-one');
	assert.equal(formData.get('ct_site_id'), 'site-one');
	assert.equal(formData.has('ct_secret_future_field'), false);
	assert.equal(formData.has('ctw_createRequest'), false);
});

test('blocks current and future Calltouch service URL parameters', () => {
	assert.equal(isBlockedUrlParam('ct_callback'), true);
	assert.equal(isBlockedUrlParam('CT_SESSION_ID'), true);
	assert.equal(isBlockedUrlParam('ct_future_field'), true);
	assert.equal(isBlockedUrlParam('ctw_createRequest'), true);
	assert.equal(isBlockedUrlParam('utm_source'), false);
	assert.equal(isBlockedUrlParam('custom', ['custom']), true);
});

test('keeps createRequest resolve/reject semantics', { concurrency: false }, async () => {
	await withWindow({
		ctw: workingGlobalCtw(({ callback }) => {
			callback(true, { callbackRequestId: 'legacy-id', ignored: 'raw-data' });
		}),
	}, async () => {
		assert.deepEqual(
			await createRequest('route-one', '79000000001', ''),
			{ callbackRequestId: 'legacy-id' },
		);
	});

	await withWindow({
		ctw: workingGlobalCtw(({ callback }) => {
			callback(false, { type: 'validation_error' });
		}),
	}, async () => {
		await assert.rejects(
			createRequest('route-one', '79000000001', ''),
			(error) => error === 'были переданы некорректные данные',
		);
	});
});
