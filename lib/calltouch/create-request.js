export const createRequest = (routeKey, phoneValue, nameValue, verbose = false) => {
return new Promise((resolve, reject) => {
	let errorText = '';
	if(window.ctw) {
		window.ctw.getRouteKeyData(routeKey, function(success, data){
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

					var phone_ct = phoneValue.replace(/[^0-9]/gim, '');
					if (phone_ct[0] == '8') { phone_ct = phone_ct.substring(1); }
					if (phone_ct[0] == '7') { phone_ct = phone_ct.substring(1); }
					phone_ct = '7' + phone_ct;

					window.ctw.createRequest(
						routeKey,
						phone_ct,
						( nameValue.length > 0 ? [
							{"name": "Name", "value": nameValue}
						] : []),
						function (success, data) {
							verbose && console.log(success, data)
							if (success) {
								verbose && console.log('Создана заявка на колбек, идентификатор: ' + data.callbackRequestId);
								resolve(data); // Разрешаем Promise данными от createRequest
							}
							else {
								errorText = 'Error in createRequest';
								switch (data.type) {
								case "request_throttle_timeout":
								case "request_throttle_count":
									errorText = 'Достигнут лимит создания заявок, попробуйте позже';
									verbose && console.log(errorText);
									break;
								case "request_phone_blacklisted":
									errorText = 'номер телефона находится в черном списке';
									verbose && console.log(errorText);
									break;
								case "validation_error":
									errorText = 'были переданы некорректные данные';
									verbose && console.log(errorText);
									break;
								default:
									errorText = 'Во время выполнения запроса произошла ошибка: ' + data.type;
									verbose && console.log(errorText);
								}
								reject(errorText); // Отклоняем Promise в случае ошибки
							}
						}
					);
				} else {
					errorText = 'не найден включенный виджет '+routeKey+', либо услуга обратного звонка не активна';
					verbose && console.log(errorText);
					reject(errorText);
				}
			} else {
				errorText = 'во время обработки произошла ошибка';
				verbose && console.log(errorText);
				verbose && console.log(data)
				reject(errorText);
			}
		});
	} else {
		reject("window.ctw is not defined");
	}
});
};