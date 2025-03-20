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
 * Отправляет данные лида в CallTouch API
 * @param {Object} options - Параметры для отправки
 * @param {string} options.siteId - ID сайта в CallTouch
 * @param {string} options.eventCategory - Категория события (например, 'Lead')
 * @param {Object} options.eventData - Данные о событии
 * @param {string} [options.eventData.name] - Имя клиента
 * @param {string} options.eventData.phone - Телефон клиента
 * @param {string} [options.eventData.email] - Email клиента
 * @param {string} [options.eventData.form] - Название формы
 * @param {string} [options.eventData.dealershipName] - Название дилерского центра
 * @param {string} [options.eventData.salon] - Название салона
 * @param {string} [options.eventData.vehicleNameplate] - Название автомобиля
 * @param {string} [options.eventData.priceDealership] - Цена автомобиля
 * @param {string} [options.sessionId] - ID сессии (опционально, по умолчанию window.call_value)
 * @return {Promise} Promise с результатом запроса
 */
function sendToCallTouch(options) {
	return new Promise((resolve, reject) => {
		try {
			const { siteId, eventCategory, eventData, sessionId = window.call_value } = options;
			
			// Проверяем, что категория события - Lead
			if (eventCategory !== 'Lead') {
				return resolve({ status: 'skipped', message: 'Not a Lead event' });
			}
			
			// Проверяем обязательные параметры
			if (!siteId) {
				return reject(new Error('siteId is required'));
			}
			
			// Получаем данные из объекта eventData
			const fio = getValueOrEmpty(eventData.name);
			const phone = getValueOrEmpty(eventData.phone);
			const email = getValueOrEmpty(eventData.email);
			const sub = getValueOrEmpty(eventData.form);
			const dc = getValueOrEmpty(eventData.dealershipName);
			const salon = getValueOrEmpty(eventData.salon);
			const name_car = getValueOrEmpty(eventData.vehicleNameplate);
			const price_car = getValueOrEmpty(eventData.priceDealership);
			
			// Формируем комментарий
			const ct_comment = [];
			if (dc) { ct_comment.push('ДЦ: ' + dc); }
			if (salon) { ct_comment.push('Салон: ' + salon); }
			if (name_car) { ct_comment.push('Авто: ' + name_car); }
			if (price_car) { ct_comment.push('Цена: ' + price_car); }
			
			const commentText = ct_comment.join(', ');
			
			// Формируем данные для отправки
			const ct_data = {
				fio: fio,
				phoneNumber: phone,
				email: email,
				subject: sub,
				requestUrl: location.href,
				comment: commentText,
				sessionId: sessionId
			};
			
			// Проверяем наличие телефона
			if (!phone) {
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
