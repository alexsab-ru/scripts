/**
 * Модуль для отправки данных в CallTouch API
 * @module calltouch-integration
 */

/**
 * Проверяет значение и возвращает пустую строку, если значение пустое или undefined
 * @param {*} value - Проверяемое значение
 * @return {string} Проверенное значение или пустая строка
 */
const getValueOrEmpty = (value) => {
	if (value === undefined || value === null || value === 'undefined') {
		return '';
	}
	return String(value).trim();
};

const getFirstValue = (data, keys) => {
	for (const key of keys) {
		const value = getValueOrEmpty(data && data[key]);
		if (value) {
			return value;
		}
	}
	return '';
};

const normalizePhoneForCallTouch = (rawPhone) => {
	const digits = getValueOrEmpty(rawPhone).replace(/\D/g, '');
	if (digits.length < 10) {
		return '';
	}
	return '7' + digits.slice(-10);
};

const getCallTouchParamPairValue = (sourceKey, targetKey, targetValue) => {
	if (typeof window === 'undefined' || !window.calltouch_params) {
		return '';
	}
	const sourceValues = Array.isArray(window.calltouch_params[sourceKey])
		? window.calltouch_params[sourceKey]
		: [window.calltouch_params[sourceKey]];
	const targetValues = Array.isArray(window.calltouch_params[targetKey])
		? window.calltouch_params[targetKey]
		: [window.calltouch_params[targetKey]];
	const target = getValueOrEmpty(targetValue);
	const targetIndex = targetValues.findIndex((value) => getValueOrEmpty(value) === target);

	return targetIndex >= 0
		? getValueOrEmpty(sourceValues[targetIndex])
		: getValueOrEmpty(sourceValues[0]);
};

const resolveCallTouchModId = (options = {}) => {
	const data = options.eventProperties || {};
	const explicitModId = getValueOrEmpty(options.modId) || getFirstValue(data, [
		'ct_mod_id',
		'mod_id',
		'modId'
	]);
	if (explicitModId) {
		return explicitModId;
	}
	return getCallTouchParamPairValue('mod_id', 'site_id', options.siteId);
};

const getCallTouchSessionId = (modId) => {
	if (!modId || typeof window === 'undefined' || typeof window.ct !== 'function') {
		return '';
	}
	if (window.ct.loaded === false && Array.isArray(window.ct.callbacks)) {
		return '';
	}
	try {
		const params = window.ct('calltracking_params', modId);
		return getValueOrEmpty(params && params.sessionId);
	} catch (error) {
		return '';
	}
};

const waitForCallTouchSessionId = (modId, timeoutMs = 5000, intervalMs = 100) => {
	return new Promise((resolve) => {
		const startedAt = Date.now();

		const tick = () => {
			const sessionId = getCallTouchSessionId(modId);
			if (sessionId) {
				resolve(sessionId);
				return;
			}

			if (!modId || Date.now() - startedAt >= timeoutMs) {
				resolve('');
				return;
			}

			setTimeout(tick, intervalMs);
		};

		tick();
	});
};

/**
 * Обрабатывает данные события и формирует объект для отправки в CallTouch
 * @param {Object} eventData - Данные о событии
 * @param {string} sessionId - ID сессии
 * @return {Object} Объект с данными и комментарием для отправки
 */
function processEventData(eventData, sessionId) {
	const data = eventData || {};

	// Поля для включения в комментарий
	const commentFields = {
		dealer: { label: 'Дилер' },
		dealershipName: { label: 'ДЦ' },
		salon: { label: 'Салон' },
		vehicleNameplate: { label: 'Авто' },
		priceDealership: { label: 'Цена' },
		vehicleModel: { label: 'Модель' },
		vehicleBrand: { label: 'Марка' },
		service: { label: 'Услуга' },
		source: { label: 'Источник' },
		medium: { label: 'Канал' },
		campaign: { label: 'Кампания' }
		// Можно добавить любые другие поля по мере необходимости
	};

	// Собираем основные данные
	const ct_data = {
		requestUrl: typeof location !== 'undefined' ? location.href : '',
		sessionId: getValueOrEmpty(sessionId) || getFirstValue(data, [
			'sessionId',
			'ct_session_id'
		])
	};

	const apiFields = [
		{ key: 'fio', aliases: ['name', 'fio'] },
		{ key: 'phoneNumber', aliases: ['phone', 'phoneNumber'] },
		{ key: 'email', aliases: ['email'] },
		{ key: 'subject', aliases: ['form', 'subject'] },
		{ key: 'requestNumber', aliases: ['requestNumber', 'request_number'] },
		{ key: 'utmSource', aliases: ['utm_source', 'utmSource'] },
		{ key: 'utmMedium', aliases: ['utm_medium', 'utmMedium'] },
		{ key: 'utmCampaign', aliases: ['utm_campaign', 'utmCampaign'] },
		{ key: 'utmContent', aliases: ['utm_content', 'utmContent'] },
		{ key: 'utmTerm', aliases: ['utm_term', 'utmTerm'] }
	];

	apiFields.forEach((config) => {
		const value = getFirstValue(data, config.aliases);
		if (value) {
			ct_data[config.key] = config.key === 'phoneNumber'
				? normalizePhoneForCallTouch(value)
				: value;
		}
	});

	// Формируем комментарий из всех доступных полей
	const ct_comment = [];
	
	Object.entries(commentFields).forEach(([fieldName, config]) => {
		const value = getValueOrEmpty(data[fieldName]);
		if (value) {
			ct_comment.push(`${config.label}: ${value}`);
		}
	});

	// Добавляем комментарий в объект данных, если он не пустой
	if (ct_comment.length > 0) {
		ct_data.comment = ct_comment.join(', ');
	}

	return ct_data;
}

/**
 * Отправляет данные лида в CallTouch API
 * @param {Object} options - Параметры для отправки
 * @param {string} options.siteId - ID сайта в CallTouch
 * @param {string} options.eventCategory - Категория события (например, 'Lead')
 * @param {Object} options.eventProperties - Данные о событии
 * @param {string} [options.eventProperties.name] - Имя клиента
 * @param {string} options.eventProperties.phone - Телефон клиента
 * @param {string} [options.eventProperties.email] - Email клиента
 * @param {string} [options.eventProperties.form] - Название формы
 * @param {string} [options.eventProperties.dealershipName] - Название дилерского центра
 * @param {string} [options.eventProperties.salon] - Название салона
 * @param {string} [options.eventProperties.vehicleNameplate] - Название автомобиля
 * @param {string} [options.eventProperties.priceDealership] - Цена автомобиля
 * @param {string} [options.eventProperties.utm_source] - UTM source
 * @param {string} [options.eventProperties.utm_medium] - UTM medium
 * @param {string} [options.eventProperties.utm_campaign] - UTM campaign
 * @param {string} [options.eventProperties.utm_content] - UTM content
 * @param {string} [options.eventProperties.utm_term] - UTM term
 * @param {string} [options.sessionId] - ID сессии (опционально, по умолчанию window.call_value)
 * @param {string} [options.modId] - ID счётчика Calltouch для получения sessionId
 * @return {Promise} Promise с результатом запроса
 */
function sendToCallTouch(options) {
	return new Promise((resolve, reject) => {
		try {
			options = options || {};
			const {
				siteId,
				eventProperties,
				sessionId = ''
			} = options;

			// Проверяем обязательные параметры
			if (!siteId || typeof siteId !== 'string') {
				return reject(new Error('siteId is required and must be a string'));
			}

			const modId = resolveCallTouchModId(options);
			const explicitSessionId = getValueOrEmpty(sessionId)
				|| getFirstValue(eventProperties || {}, ['sessionId', 'ct_session_id']);

			const sendRequest = (sessionIdFromCt) => {
				const callTouchSessionId = explicitSessionId
					|| sessionIdFromCt
					|| (typeof window !== 'undefined' ? getValueOrEmpty(window.call_value) : '');
				
				// Обрабатываем данные с помощью оптимизированной функции
				const ct_data = processEventData(eventProperties, callTouchSessionId);
			
				// Проверяем наличие телефона
				if (!ct_data.phoneNumber) {
					return resolve({ status: 'error', message: 'Phone number is required' });
				}
			
				// Формируем строку параметров для POST-запроса
				const post_data = Object.keys(ct_data)
					.filter(key => ct_data[key]) // Исключаем пустые поля
					.map(key => key + '=' + encodeURIComponent(ct_data[key]))
					.join('&');
			
				// URL для запроса к API CallTouch
				const CT_URL = 'https://api.calltouch.ru/calls-service/RestAPI/requests/'
					+ siteId
					+ '/register/';
			
				// Проверяем, не отправляется ли уже запрос
				if (window.ct_snd_flag) {
					return resolve({ status: 'skipped', message: 'Another request is in progress' });
				}
			
				// Устанавливаем флаг для предотвращения дублирования запросов
				window.ct_snd_flag = 1;
				setTimeout(function() { 
					window.ct_snd_flag = 0; 
				}, 20000);
			
				// Отправляем запрос
				const request = new XMLHttpRequest();
				request.open("POST", CT_URL, true);
				request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
			
				request.onload = function() {
					if (this.status >= 200 && this.status < 400) {
						resolve({ 
							status: 'success', 
							response: this.responseText,
							data: ct_data
						});
					} else {
						reject(new Error('API returned status: ' + this.status));
					}
				};
			
				request.onerror = function() {
					reject(new Error('Connection error'));
				};
				
				request.send(post_data);
			};

			if (explicitSessionId) {
				sendRequest(explicitSessionId);
				return;
			}

			waitForCallTouchSessionId(modId)
				.then(sendRequest)
				.catch(reject);
		} catch (error) {
			console.error('CallTouch error:', error);
			reject(error);
		}
	});
}

// Экспорт функций для использования в других модулях
export {
	sendToCallTouch,
	getValueOrEmpty,
	getCallTouchSessionId,
	waitForCallTouchSessionId
};

// Для совместимости с CommonJS
if (typeof module !== 'undefined' && module.exports) {
	module.exports = {
		sendToCallTouch,
		getValueOrEmpty,
		getCallTouchSessionId,
		waitForCallTouchSessionId
	};
}

// Для использования через тег <script>
if (typeof window !== 'undefined') {
	window.CallTouchAPI = {
		sendToCallTouch,
		getValueOrEmpty,
		getCallTouchSessionId,
		waitForCallTouchSessionId
	};
}
