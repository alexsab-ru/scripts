const CALLBACK_CREATED_SERVER_STATUSES = new Set([
	'client_success',
	'server_success',
]);

// sendToCallTouch реагирует строго на eventCategory === 'Lead'. Чтобы подавить
// Lead API и при этом не обеднить остальные цели, подменяем только категорию:
// eventProperties и sourceName доезжают до GA4, Метрики и GTM как обычно.
export const CALLBACK_LEAD_CATEGORY = 'CallbackLead';

const withoutLeadTrigger = (leadPayload) => ({
	...leadPayload,
	eventCategory: CALLBACK_LEAD_CATEGORY,
	sendCalltouchLead: false,
});

/**
 * Resolves the single analytics goal emitted after the lead endpoint accepts a
 * form. When a callback already exists the payload keeps every field but its
 * eventCategory, so GA/Yandex/GTM goals stay intact while the Calltouch Lead
 * API is not triggered a second time.
 */
export const resolveFormSuccessAnalytics = ({
	serverCallbackStatus = '',
	clientCallbackStatus = '',
	attention = false,
	attentionTestPhone = false,
	leadPayload = {},
} = {}) => {
	if (attention) {
		return {
			goal: attentionTestPhone ? 'form_success' : 'form_attention',
			payload: attentionTestPhone ? withoutLeadTrigger(leadPayload) : undefined,
			sendCalltouchLead: false,
		};
	}

	const callbackCreated = clientCallbackStatus === 'success'
		|| CALLBACK_CREATED_SERVER_STATUSES.has(serverCallbackStatus);

	return {
		goal: 'form_success',
		payload: callbackCreated ? withoutLeadTrigger(leadPayload) : leadPayload,
		sendCalltouchLead: !callbackCreated,
	};
};
