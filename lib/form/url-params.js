const SERVICE_PARAM_PREFIXES = ['ct_', 'ctw_'];

export const blockedUrlParamsDefault = [
	'phone',
	'email',
	'name',
	'comment',
	'agree',
	'dealer',
	'departament',
	'email_recipient',
	'page_url',
	're',
	'fta',
	'__proto__',
	'constructor',
	'prototype',
];

export const isBlockedUrlParam = (key, blockedExtra = []) => {
	const normalizedKey = String(key || '').toLowerCase();
	if (SERVICE_PARAM_PREFIXES.some((prefix) => normalizedKey.startsWith(prefix))) {
		return true;
	}
	return blockedUrlParamsDefault
		.concat(Array.isArray(blockedExtra) ? blockedExtra : [])
		.some((name) => String(name).toLowerCase() === normalizedKey);
};
