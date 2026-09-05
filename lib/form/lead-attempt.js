// State stays in memory and contains only a fingerprint, request ID and callback result.
// Opt-in by endpoint: legacy receiver behavior is unchanged.
const attempts = new WeakMap();
export async function leadAttempt(owner, url, data, callback) {
	if (new URL(url, globalThis.location?.href || 'https://local.invalid').pathname !== '/api/leads') {
		return { calltouch: await callback() };
	}
	const values = [];
	for (const [key, value] of data.entries()) {
		if (key === 'request_id') continue;
		if (typeof value === 'string') values.push([key, value]);
		else values.push([key, value.name, value.type, Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await value.arrayBuffer())))]);
	}
	values.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
	const fingerprint = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(values))))).join(',');
	let attempt = attempts.get(owner);
	if (!attempt || attempt.fingerprint !== fingerprint) {
		attempt = { fingerprint, requestId: crypto.randomUUID(), calltouch: Promise.resolve().then(callback) };
		attempts.set(owner, attempt);
	}
	return { requestId: attempt.requestId, calltouch: await attempt.calltouch };
}
export function finishLeadAttempt(owner) { attempts.delete(owner); }
