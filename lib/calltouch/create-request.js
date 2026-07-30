import { waitForCallTouchSessionId } from './calltouch-module.js';

const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_POLL_INTERVAL_MS = 50;

const REJECTED_ERROR_CODES = new Set([
	'request_throttle_timeout',
	'request_throttle_count',
	'request_phone_blacklisted',
	'validation_error',
	'widget_not_found',
	'widget_disabled',
	'widget_unavailable',
]);

const TECHNICAL_ERROR_CODES = new Set([
	'ctw_unavailable',
	'ctw_create_request_unavailable',
	'ctw_route_api_unavailable',
	'ctw_timeout',
	'network_error',
	'server_error',
	'unknown_error',
	'route_lookup_failed',
	'unexpected_error',
]);

const getValueOrEmpty = (value) => {
	if (value === undefined || value === null || value === 'undefined') {
		return '';
	}
	return String(value).trim();
};

const toArray = (value) => {
	if (Array.isArray(value)) {
		return value;
	}
	return value === undefined || value === null ? [] : [value];
};

const createSubmissionId = () => {
	if (
		typeof globalThis !== 'undefined'
		&& globalThis.crypto
		&& typeof globalThis.crypto.randomUUID === 'function'
	) {
		return globalThis.crypto.randomUUID();
	}
	return `ct-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const normalizePhone = (phoneValue) => {
	const digits = getValueOrEmpty(phoneValue).replace(/\D/g, '');
	if (digits.length < 10) {
		return '';
	}
	return `7${digits.slice(-10)}`;
};

const getWindow = () => {
	return typeof window === 'undefined' ? null : window;
};

const getCalltouchParamPairs = () => {
	const browserWindow = getWindow();
	if (!browserWindow || !browserWindow.calltouch_params) {
		return [];
	}

	const modIds = toArray(browserWindow.calltouch_params.mod_id);
	const siteIds = toArray(browserWindow.calltouch_params.site_id);
	const pairCount = Math.max(modIds.length, siteIds.length);
	const pairs = [];

	for (let index = 0; index < pairCount; index += 1) {
		const modId = getValueOrEmpty(modIds[index]);
		const siteId = getValueOrEmpty(siteIds[index]);
		if (modId || siteId) {
			pairs.push({ modId, siteId });
		}
	}

	return pairs;
};

/**
 * Resolves a Calltouch project without silently selecting the first project in
 * a multi-project setup. A single configured pair remains the legacy default.
 */
export const resolveCalltouchProject = (options = {}) => {
	const eventProperties = options.eventProperties || {};
	const explicitModId = getValueOrEmpty(
		options.modId
		|| eventProperties.ct_mod_id
		|| eventProperties.mod_id
		|| eventProperties.modId,
	);
	const explicitSiteId = getValueOrEmpty(
		options.siteId
		|| eventProperties.ct_site_id
		|| eventProperties.site_id
		|| eventProperties.siteId,
	);
	const pairs = getCalltouchParamPairs();
	let selectedPair = null;

	if (explicitModId) {
		selectedPair = pairs.find((pair) => pair.modId === explicitModId) || null;
	} else if (explicitSiteId) {
		selectedPair = pairs.find((pair) => pair.siteId === explicitSiteId) || null;
	} else if (pairs.length === 1) {
		selectedPair = pairs[0];
	}

	return {
		modId: explicitModId || (selectedPair ? selectedPair.modId : ''),
		siteId: explicitSiteId || (selectedPair ? selectedPair.siteId : ''),
		isMultiProject: pairs.length > 1,
	};
};

const normalizeErrorCode = (value, fallback = 'unknown_error') => {
	const normalized = getValueOrEmpty(value)
		.toLowerCase()
		.replace(/[^a-z0-9_]+/g, '_')
		.replace(/^_+|_+$/g, '');
	return normalized || fallback;
};

const classifyError = (code) => {
	if (REJECTED_ERROR_CODES.has(code)) {
		return 'rejected';
	}
	if (TECHNICAL_ERROR_CODES.has(code)) {
		return 'technical_failure';
	}
	return 'technical_failure';
};

const getCtwInstance = (project) => {
	const browserWindow = getWindow();
	if (!browserWindow) {
		return null;
	}

	if (project.modId) {
		const scopedInstance = browserWindow[`ctw_${project.modId}`];
		if (scopedInstance) {
			return scopedInstance;
		}
		if (project.isMultiProject) {
			return null;
		}
	}

	return browserWindow.ctw || null;
};

const waitForCtwInstance = (project, deadline, pollIntervalMs) => {
	return new Promise((resolve) => {
		const tick = () => {
			const instance = getCtwInstance(project);
			if (instance) {
				resolve(instance);
				return;
			}
			if (Date.now() >= deadline) {
				resolve(null);
				return;
			}
			setTimeout(tick, Math.min(pollIntervalMs, Math.max(0, deadline - Date.now())));
		};
		tick();
	});
};

const withDeadline = (promise, deadline, timeoutValue) => {
	const remainingMs = Math.max(0, deadline - Date.now());
	return new Promise((resolve) => {
		const timer = setTimeout(() => resolve(timeoutValue), remainingMs);
		Promise.resolve(promise).then((value) => {
			clearTimeout(timer);
			resolve(value);
		}).catch(() => {
			clearTimeout(timer);
			resolve(timeoutValue);
		});
	});
};

const checkRouteKey = (ctwInstance, routeKey, deadline) => {
	if (typeof ctwInstance.getRouteKeyData !== 'function') {
		return Promise.resolve({ ok: false, code: 'ctw_route_api_unavailable' });
	}

	return withDeadline(new Promise((resolve) => {
		try {
			ctwInstance.getRouteKeyData(routeKey, (success, response) => {
				const data = response || {};
				if (!success) {
					resolve({
						ok: false,
						code: normalizeErrorCode(data.type, 'route_lookup_failed'),
					});
					return;
				}
				if (!data.widgetFound) {
					resolve({ ok: false, code: 'widget_not_found' });
					return;
				}
				if (
					data.widgetData
					&& data.widgetData.callCenterWorkingMode !== 'working_hours'
					&& data.widgetData.collectNonWorkingRequests === false
				) {
					resolve({ ok: false, code: 'widget_unavailable' });
					return;
				}
				resolve({ ok: true, code: '' });
			});
		} catch (error) {
			resolve({ ok: false, code: 'unexpected_error' });
		}
	}), deadline, { ok: false, code: 'ctw_timeout' });
};

const executeCreateRequest = (ctwInstance, options, deadline) => {
	if (typeof ctwInstance.createRequest !== 'function') {
		return Promise.resolve({ ok: false, code: 'ctw_create_request_unavailable' });
	}

	return withDeadline(new Promise((resolve) => {
		try {
			const customFields = options.name
				? [{ name: 'Name', value: options.name }]
				: [];
			ctwInstance.createRequest(
				options.routeKey,
				options.phone,
				customFields,
				(success, response) => {
					const data = response || {};
					if (success) {
						resolve({
							ok: true,
							callbackRequestId: getValueOrEmpty(data.callbackRequestId),
						});
						return;
					}
					resolve({
						ok: false,
						code: normalizeErrorCode(data.type),
					});
				},
			);
		} catch (error) {
			resolve({ ok: false, code: 'unexpected_error' });
		}
	}), deadline, { ok: false, code: 'ctw_timeout' });
};

const buildResult = (base, status, errorCode = '', callbackRequestId = '') => {
	return {
		status,
		errorCode,
		callbackRequestId,
		source: 'client',
		submissionId: base.submissionId,
		sessionId: base.sessionId || '',
		routeKey: base.routeKey,
		modId: base.modId,
		siteId: base.siteId,
	};
};

/**
 * Creates a callback request and always resolves with a stable, serializable
 * result. No raw Calltouch response or Error object is exposed to lead payloads.
 */
export const attemptCalltouchCallback = async (options = {}) => {
	const timeoutMs = Math.max(1, Number(options.timeoutMs) || DEFAULT_TIMEOUT_MS);
	const pollIntervalMs = Math.max(
		1,
		Number(options.pollIntervalMs) || DEFAULT_POLL_INTERVAL_MS,
	);
	const deadline = Date.now() + timeoutMs;
	const project = resolveCalltouchProject(options);
	const base = {
		submissionId: getValueOrEmpty(options.submissionId) || createSubmissionId(),
		sessionId: getValueOrEmpty(options.sessionId),
		routeKey: getValueOrEmpty(options.routeKey || options.ctRouteKey),
		modId: project.modId,
		siteId: project.siteId,
	};

	if (!base.routeKey) {
		return buildResult(base, 'not_configured', 'route_key_missing');
	}
	if (project.isMultiProject && !base.modId && !base.siteId) {
		return buildResult(base, 'not_configured', 'project_ambiguous');
	}

	const phone = normalizePhone(options.phone || options.phoneValue);
	if (!phone) {
		return buildResult(base, 'rejected', 'validation_error');
	}

	const sessionPromise = base.sessionId
		? Promise.resolve(base.sessionId)
		: waitForCallTouchSessionId(base.modId, timeoutMs, pollIntervalMs);
	const ctwInstance = await waitForCtwInstance(project, deadline, pollIntervalMs);

	if (!ctwInstance) {
		base.sessionId = await withDeadline(sessionPromise, deadline, '');
		return buildResult(base, 'technical_failure', 'ctw_unavailable');
	}

	const usesScopedInstance = Boolean(
		project.modId
		&& getWindow()
		&& getWindow()[`ctw_${project.modId}`] === ctwInstance,
	);
	if (!usesScopedInstance || typeof ctwInstance.getRouteKeyData === 'function') {
		const routeResult = await checkRouteKey(ctwInstance, base.routeKey, deadline);
		if (!routeResult.ok) {
			base.sessionId = await withDeadline(sessionPromise, deadline, '');
			return buildResult(
				base,
				classifyError(routeResult.code),
				routeResult.code,
			);
		}
	}

	const requestResult = await executeCreateRequest(ctwInstance, {
		routeKey: base.routeKey,
		phone,
		name: getValueOrEmpty(options.name || options.nameValue),
	}, deadline);
	base.sessionId = await withDeadline(sessionPromise, deadline, '');

	if (requestResult.ok) {
		return buildResult(
			base,
			'success',
			'',
			requestResult.callbackRequestId,
		);
	}

	return buildResult(
		base,
		classifyError(requestResult.code),
		requestResult.code,
	);
};

/**
 * Appends the structured callback contract and removes any user-provided
 * Calltouch service fields first.
 */
export const appendCalltouchResultToFormData = (formData, result) => {
	const keysToDelete = [];
	for (const [key] of formData.entries()) {
		if (/^ct_/i.test(key) || /^ctw_/i.test(key)) {
			keysToDelete.push(key);
		}
	}
	keysToDelete.forEach((key) => formData.delete(key));

	const fields = {
		ct_callback_status: result.status,
		ct_callback_error_code: result.errorCode,
		ct_callback_id: result.callbackRequestId,
		ct_callback_source: result.source,
		ct_submission_id: result.submissionId,
		ct_session_id: result.sessionId,
		ct_route_key: result.routeKey,
		ct_mod_id: result.modId,
		ct_site_id: result.siteId,
	};

	Object.entries(fields).forEach(([key, value]) => {
		if (value !== undefined && value !== null && value !== '') {
			formData.append(key, String(value));
		}
	});
	if (result.status === 'success') {
		formData.append('ct_callback', 'true');
	}

	return formData;
};

/**
 * Legacy Promise API. It still resolves on success and rejects on failure,
 * while the new helper exposes the structured status contract.
 */
export const createRequest = (
	routeKey,
	phoneValue,
	nameValue = '',
	verbose = false,
	modId = '',
) => {
	return attemptCalltouchCallback({
		routeKey,
		phone: phoneValue,
		name: nameValue,
		modId,
	}).then((result) => {
		verbose && console.log('Calltouch callback result:', result);
		if (result.status === 'success') {
			return { callbackRequestId: result.callbackRequestId };
		}
		const legacyMessages = {
			ctw_unavailable: 'window.ctw is not defined',
			ctw_create_request_unavailable: 'window.ctw.createRequest is not defined',
			ctw_route_api_unavailable: 'window.ctw.getRouteKeyData is not defined',
			request_throttle_timeout: 'Достигнут лимит создания заявок, попробуйте позже',
			request_throttle_count: 'Достигнут лимит создания заявок, попробуйте позже',
			request_phone_blacklisted: 'номер телефона находится в черном списке',
			validation_error: 'были переданы некорректные данные',
			widget_not_found: `не найден включенный виджет ${routeKey}, либо услуга обратного звонка не активна`,
			widget_unavailable: `не найден включенный виджет ${routeKey}, либо услуга обратного звонка не активна`,
		};
		return Promise.reject(
			legacyMessages[result.errorCode]
			|| `Во время выполнения запроса произошла ошибка: ${result.errorCode}`,
		);
	});
};
