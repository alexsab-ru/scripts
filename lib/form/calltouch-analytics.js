const CALLBACK_CREATED_SERVER_STATUSES = new Set([
	'client_success',
	'server_success',
]);

/**
 * Resolves the single analytics goal emitted after the lead endpoint accepts a
 * form. An empty payload keeps GA/Yandex/GTM goals without triggering the
 * Calltouch Lead API, which only reacts to eventCategory === 'Lead'.
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
			payload: attentionTestPhone ? {} : undefined,
			sendCalltouchLead: false,
		};
	}

	const callbackCreated = clientCallbackStatus === 'success'
		|| CALLBACK_CREATED_SERVER_STATUSES.has(serverCallbackStatus);

	return {
		goal: 'form_success',
		payload: callbackCreated ? {} : leadPayload,
		sendCalltouchLead: !callbackCreated,
	};
};
