export const createRequest = (routeKey, phoneValue, verbose = false) => {

	if(window.ctw) {
		window.ctw.getRouteKeyData(routeKey, function(success, data){
			verbose && console.log(success, data);
			if (success && data.widgetFound) {
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
						[],
						function (success, data) {
							verbose && console.log(success, data)
							if (success) {
								verbose && console.log('Создана заявка на колбек, идентификатор: ' + data.callbackRequestId)
							}
							else {
								switch (data.type) {
								case "request_throttle_timeout":
								case "request_throttle_count":
									verbose && console.log('Достигнут лимит создания заявок, попробуйте позже');
									break;
								case "request_phone_blacklisted":
									verbose && console.log('номер телефона находится в черном списке');
									break;
								case "validation_error":
									verbose && console.log('были переданы некорректные данные');
									break;
								default:
									verbose && console.log('Во время выполнения запроса произошла ошибка: ' + data.type);
								}
							}
						}
					);
				} else {
					verbose && console.log('не найден включенный виджет '+routeKey+', либо услуга обратного звонка не активна');
				}
			} else {
				verbose && console.log('во время обработки произошла ошибка');
				verbose && console.log(data)
			}
		});
	}

};