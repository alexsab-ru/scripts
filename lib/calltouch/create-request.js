export const createRequest = (routeKey, phoneValue, nameValue, verbose = false, modId = '') => {
	return new Promise((resolve, reject) => {
		let errorText = '';

		// Если mod_id передан явно, пытаемся взять выделенный инстанс multi-project:
		// window["ctw_<mod_id>"].
		const scopedKey = modId ? `ctw_${modId}` : '';
		const scopedCtw = scopedKey && window[scopedKey] ? window[scopedKey] : null;
		// Fallback для старого сценария, где есть только один глобальный инстанс.
		const fallbackCtw = window.ctw || null;
		const ctwInstance = scopedCtw || fallbackCtw;

		if (!ctwInstance || typeof ctwInstance.createRequest !== 'function') {
			reject('window.ctw is not defined');
			return;
		}

		const executeCreateRequest = () => {
			let phone_ct = phoneValue.replace(/[^0-9]/gim, '');
			if (phone_ct[0] == '8') { phone_ct = phone_ct.substring(1); }
			if (phone_ct[0] == '7') { phone_ct = phone_ct.substring(1); }
			phone_ct = '7' + phone_ct;

			ctwInstance.createRequest(
				routeKey,
				phone_ct,
				(nameValue.length > 0 ? [{ "name": "Name", "value": nameValue }] : []),
				function(success, data) {
					verbose && console.log(success, data);
					if (success) {
						verbose && console.log('Создана заявка на колбек, идентификатор: ' + data.callbackRequestId);
						resolve(data);
					} else {
						errorText = 'Error in createRequest';
						switch (data.type) {
						case 'request_throttle_timeout':
						case 'request_throttle_count':
							errorText = 'Достигнут лимит создания заявок, попробуйте позже';
							verbose && console.log(errorText);
							break;
						case 'request_phone_blacklisted':
							errorText = 'номер телефона находится в черном списке';
							verbose && console.log(errorText);
							break;
						case 'validation_error':
							errorText = 'были переданы некорректные данные';
							verbose && console.log(errorText);
							break;
						default:
							errorText = 'Во время выполнения запроса произошла ошибка: ' + data.type;
							verbose && console.log(errorText);
						}
						reject(errorText);
					}
				}
			);
		};

		// Multi-project: если нашли window["ctw_<mod_id>"], сразу создаём заявку.
		// Здесь намеренно пропускаем getRouteKeyData.
		if (scopedCtw) {
			executeCreateRequest();
			return;
		}

		// Legacy-ветка: без mod_id сохраняем исходную проверку routeKey через getRouteKeyData.
		if (typeof ctwInstance.getRouteKeyData !== 'function') {
			reject('window.ctw.getRouteKeyData is not defined');
			return;
		}

		ctwInstance.getRouteKeyData(routeKey, function(success, data) {
			verbose && console.log(success, data);
			if (success) {
				if (data.widgetFound) {
					if (data.widgetData.callCenterWorkingMode == 'working_hours') {
						verbose && console.log('колл-центр работает, отображение виджета');
					} else {
						if (data.widgetData.collectNonWorkingRequests) {
							verbose && console.log('колл-центр не работает, но можем отобразить форму нерабочего времени');
						} else {
							verbose && console.log('колл-центр не работает, заявки в нерабочее время не собираем');
						}
					}
					executeCreateRequest();
				} else {
					errorText = 'не найден включенный виджет ' + routeKey + ', либо услуга обратного звонка не активна';
					verbose && console.log(errorText);
					reject(errorText);
				}
			} else {
				errorText = 'во время обработки произошла ошибка';
				verbose && console.log(errorText);
				verbose && console.log(data);
				reject(errorText);
			}
		});
	});
};