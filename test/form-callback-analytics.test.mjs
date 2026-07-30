import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(
	new URL('../lib/form/calltouch-analytics.js', import.meta.url),
	'utf8',
);
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const { resolveFormSuccessAnalytics } = await import(moduleUrl);

const leadPayload = {
	eventCategory: 'Lead',
	eventProperties: {
		phone: '79000000001',
	},
};

test('suppresses Lead API after client callback success', () => {
	const decision = resolveFormSuccessAnalytics({
		clientCallbackStatus: 'success',
		serverCallbackStatus: 'failed',
		leadPayload,
	});

	assert.deepEqual(decision, {
		goal: 'form_success',
		payload: {},
		sendCalltouchLead: false,
	});
});

test('suppresses Lead API for confirmed server callback statuses', async (t) => {
	for (const serverCallbackStatus of ['client_success', 'server_success']) {
		await t.test(serverCallbackStatus, () => {
			const decision = resolveFormSuccessAnalytics({
				clientCallbackStatus: 'technical_failure',
				serverCallbackStatus,
				leadPayload,
			});
			assert.deepEqual(decision, {
				goal: 'form_success',
				payload: {},
				sendCalltouchLead: false,
			});
		});
	}
});

test('sends one Lead payload when callback failed or was not attempted', async (t) => {
	for (const serverCallbackStatus of ['failed', 'not_attempted']) {
		await t.test(serverCallbackStatus, () => {
			const decision = resolveFormSuccessAnalytics({
				clientCallbackStatus: 'technical_failure',
				serverCallbackStatus,
				leadPayload,
			});
			assert.equal(decision.goal, 'form_success');
			assert.equal(decision.payload, leadPayload);
			assert.equal(decision.sendCalltouchLead, true);
		});
	}
});

test('preserves legacy Lead behavior when the server contract is absent', () => {
	const decision = resolveFormSuccessAnalytics({
		clientCallbackStatus: 'technical_failure',
		leadPayload,
	});

	assert.equal(decision.goal, 'form_success');
	assert.equal(decision.payload, leadPayload);
	assert.equal(decision.sendCalltouchLead, true);
});

test('never sends Lead API for an attention response', async (t) => {
	await t.test('ordinary attention phone', () => {
		const decision = resolveFormSuccessAnalytics({
			serverCallbackStatus: 'failed',
			attention: true,
			attentionTestPhone: false,
			leadPayload,
		});
		assert.deepEqual(decision, {
			goal: 'form_attention',
			payload: undefined,
			sendCalltouchLead: false,
		});
	});

	await t.test('configured attention test phone', () => {
		const decision = resolveFormSuccessAnalytics({
			serverCallbackStatus: 'failed',
			attention: true,
			attentionTestPhone: true,
			leadPayload,
		});
		assert.deepEqual(decision, {
			goal: 'form_success',
			payload: {},
			sendCalltouchLead: false,
		});
	});
});
