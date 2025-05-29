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
	return String(value);
};

/**
 * Обрабатывает данные события и формирует объект для отправки в CallTouch
 * @param {Object} eventData - Данные о событии
 * @param {string} sessionId - ID сессии
 * @return {Object} Объект с данными и комментарием для отправки
 */
function processEventData(eventData, sessionId) {
	// Основные поля для передачи в API
	const basicFields = {
		name: { key: 'fio', label: null },
		phone: { key: 'phoneNumber', label: null },
		email: { key: 'email', label: null },
		form: { key: 'subject', label: null }
	};

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
		requestUrl: location.href,
		sessionId: sessionId
	};

	// Обрабатываем основные поля
	Object.entries(basicFields).forEach(([fieldName, config]) => {
		const value = getValueOrEmpty(eventData[fieldName]);
		if (value) {
			ct_data[config.key] = value;
		}
	});

	// Формируем комментарий из всех доступных полей
	const ct_comment = [];
	
	Object.entries(commentFields).forEach(([fieldName, config]) => {
		const value = getValueOrEmpty(eventData[fieldName]);
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
 * @param {string} [options.sessionId] - ID сессии (опционально, по умолчанию window.call_value)
 * @return {Promise} Promise с результатом запроса
 */
function sendToCallTouch(options) {
	return new Promise((resolve, reject) => {
		try {
			const { siteId, eventCategory, eventProperties, sessionId = window.call_value } = options;
			
			// Проверяем, что категория события - Lead
			if (eventCategory !== 'Lead') {
				return resolve({ status: 'skipped', message: 'Not a Lead event' });
			}
			
			// Проверяем обязательные параметры
			if (!siteId) {
				return reject(new Error('siteId is required'));
			}
			
			// Обрабатываем данные с помощью оптимизированной функции
			const ct_data = processEventData(eventProperties, sessionId);
			
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
			const CT_URL = 'https://api.calltouch.ru/calls-service/RestAPI/requests/' + siteId + '/register/';
			
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
		} catch (error) {
			console.error('CallTouch error:', error);
			reject(error);
		}
	});
}

// Экспорт функций для использования в других модулях
export { sendToCallTouch, getValueOrEmpty };

// Для совместимости с CommonJS
if (typeof module !== 'undefined' && module.exports) {
	module.exports = {
		sendToCallTouch,
		getValueOrEmpty
	};
}

// Для использования через тег <script>
if (typeof window !== 'undefined') {
	window.CallTouchAPI = {
		sendToCallTouch,
		getValueOrEmpty
	};
}
