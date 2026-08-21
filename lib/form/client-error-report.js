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

const normalizeContext = ({ formID, errorSource, errorStage, httpStatus } = {}) => {
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
