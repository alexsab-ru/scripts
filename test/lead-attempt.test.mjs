import assert from 'node:assert/strict';
import test from 'node:test';
import { leadAttempt, finishLeadAttempt } from '../lib/form/lead-attempt.js';
test('retry retains request ID and callback result; changed input starts new attempt', async () => {
	const owner = {}; const data = new FormData(); data.set('phone', '79991234567');
	let calls = 0; const callback = async () => ({ status: 'success', id: ++calls });
	const first = await leadAttempt(owner, '/api/leads', data, callback);
	const retry = await leadAttempt(owner, '/api/leads', data, callback);
	assert.deepEqual(retry, first); assert.equal(calls, 1);
	data.set('phone', '79991234568');
	assert.notEqual((await leadAttempt(owner, '/api/leads', data, callback)).requestId, first.requestId);
	assert.equal(calls, 2);
	finishLeadAttempt(owner);
	await leadAttempt(owner, '/api/leads', data, callback); assert.equal(calls, 3);
});
test('legacy endpoints keep calling callback and receive no new field', async () => {
	const owner = {}; let calls = 0;
	const callback = async () => ++calls;
	assert.deepEqual(await leadAttempt(owner, 'https://l.alexsab.ru/lead/dev/', new FormData(), callback), { calltouch: 1 });
	assert.deepEqual(await leadAttempt(owner, 'https://l.alexsab.ru/lead/dev/', new FormData(), callback), { calltouch: 2 });
});
