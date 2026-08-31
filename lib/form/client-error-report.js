const endpoint = 'https://l.alexsab.ru/lead/client-error/';
const storagePrefix = 'alexsab:client-form-error:';
const allowedSources = new Set(['client', 'network', 'server']);
const allowedStages = new Set([
	'lead_request',
	'lead_response',
	'maxposter_request',
	'maxposter_response',
	'response_parse',
	'response_read',
	'success_handler',
]);
const allowedResponseKinds = new Set([
	'empty', 'html', 'invalid_json', 'legacy_sentinel', 'text', 'unknown',
]);

const toLeadPath = (url) => {
	try {
		const path = new URL(url, window.location.origin).pathname;
		return /^\/lead\/[A-Za-z0-9._/-]{1,200}$/.test(path) ? path : '';
	} catch (error) {
		return '';
	}
};

const responseByteLength = (value) => {
	if (typeof TextEncoder === 'function') return new TextEncoder().encode(value).length;
	return value.length;
};

export const getFormResponseDiagnostics = ({ responseText, response, url } = {}) => {
	const text = typeof responseText === 'string' ? responseText : '';
	const contentType = response?.headers?.get?.('content-type') || '';
	let responseKind = 'unknown';
	if (text === '') responseKind = 'empty';
	else if (text === '-_-') responseKind = 'legacy_sentinel';
	else if (/\btext\/html\b/i.test(contentType) || /^\s*<!doctype html|^\s*<html\b/i.test(text)) responseKind = 'html';
	else if (/\bapplication\/json\b/i.test(contentType)) responseKind = 'invalid_json';
	else if (/^\s*[^<]/.test(text)) responseKind = 'text';
	return {
		leadPath: toLeadPath(url),
		responseKind,
		responseBytes: responseByteLength(text),
	};
};

const normalizeContext = ({ formID, errorSource, errorStage, httpStatus, leadPath, responseKind, responseBytes } = {}) => {
	if (!allowedSources.has(errorSource) || !allowedStages.has(errorStage)) return null;
	const payload = {
		version: 1,
		goal: 'form_error',
		errorSource,
		errorStage,
		formID: String(formID || '').slice(0, 100),
		pagePath: String(window.location.pathname || '/').split(/[?#]/, 1)[0].slice(0, 200),
	};
	if (Number.isInteger(httpStatus) && httpStatus >= 100 && httpStatus <= 599) {
		payload.httpStatus = httpStatus;
	}
	if (typeof leadPath === 'string' && /^\/lead\/[A-Za-z0-9._/-]{1,200}$/.test(leadPath)) {
		payload.leadPath = leadPath;
	}
	if (allowedResponseKinds.has(responseKind)) {
		payload.responseKind = responseKind;
	}
	if (Number.isInteger(responseBytes) && responseBytes >= 0 && responseBytes <= 1048576) {
		payload.responseBytes = responseBytes;
	}
	return payload;
};

export const reportClientFormError = async (context) => {
	if (typeof window === 'undefined' || typeof fetch !== 'function') return false;
	const payload = normalizeContext(context);
	if (!payload) return false;

	const dedupeKey = storagePrefix + [
		payload.formID,
		payload.errorSource,
		payload.errorStage,
		payload.httpStatus || '',
		payload.leadPath || '',
		payload.responseKind || '',
		payload.pagePath,
	].join(':');
	try {
		if (window.sessionStorage?.getItem(dedupeKey)) return false;
		window.sessionStorage?.setItem(dedupeKey, '1');
	} catch (error) {
		// Storage can be unavailable in private mode; server limits still apply.
	}

	try {
		await fetch(endpoint, {
			method: 'POST',
			mode: 'no-cors',
			credentials: 'omit',
			keepalive: true,
			headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
			body: JSON.stringify(payload),
		});
		return true;
	} catch (error) {
		return false;
	}
};
