# @alexsab-ru/scripts

[English](README.md)

Общие пакеты для вебсайтов

* [Установка](#Установка)
* [Модуль аналитики](#Модуль-аналитики)
* [Модуль куков](#Модуль-куков)
* [Модуль Calltouch](#Модуль-Calltouch)
* [Модуль для форм](#Модуль-для-форм)

## Установка
```bash
pnpm i @alexsab-ru/scripts
```

### Приёмщик заявок `/api/leads` (0.19.0)

Для URL с точным path `/api/leads` формы передают `request_id`: повтор неизменённой формы сохраняет этот ID и результат Calltouch, чтобы не создавать повторный callback. После успешного ответа или изменения данных начинается новая попытка. Состояние хранится только в памяти страницы; после её перезагрузки прежний ID не восстанавливается. Старые URL приёма сохраняют прежнее поведение.

Для собственных форм и ChatWidget доступен `@alexsab-ru/scripts/lead-attempt` с функциями `leadAttempt(owner, url, formData, callback)` и `finishLeadAttempt(owner)`. `owner` — стабильный объект на время жизни формы. Helper возвращает `requestId` для нового приёмщика и `calltouch` — результат callback. Завершать попытку нужно после подтверждённого успешного ответа приёмщика. Требуется HTTPS или localhost с Web Crypto API. Дедупликация доставки выполняется сервером; helper сохраняет ключ для неё.

## Модуль аналитики

`reachGoal` и `pageView` функции добавляют в `dataLayer` данные с названием цели
```js
reachGoal("названиеЦели");
pageView("названиеЦели");
```

в GTM вы можете использовать их чтобы отправить цели в вашу систему аналитики

```js
{
	event: "reachGoal-названиеЦели",
	eventAction: "названиеЦели"
}
```

Пример:

```js
import { reachGoal } from '@alexsab-ru/scripts';

// Автоматически подключаются из модуля форм
reachGoal("phone_click");
reachGoal("phone_copy");
reachGoal("phone_contextmenu");
reachGoal("email_click");
reachGoal("email_copy");
reachGoal("email_contextmenu");
```

Для аналитики форм вы можете использовать следующие цели

```js
reachGoal("form_open");
reachGoal("form_click"); // автоматически подключаются из модуля форм
reachGoal("form_change"); // автоматически подключаются из модуля форм
reachGoal("form_submit");
reachGoal("form_required");
reachGoal("form_error");
reachGoal("form_success");
reachGoal("form_attention");
```

`getFormDataObject` нужна для отслеживания заявок в Calltouch

```js
import { getFormDataObject } from '@alexsab-ru/scripts';

document.querySelectorAll("form").forEach((form) => {
	form.onsubmit = async (event) => {

		var formData = new FormData(form);
		// ...
		var formDataObj = getFormDataObject(formData, form.id);

		await fetch("https://example.com/api/lead/", {
			// ...
		})
			.then((res) => res.json())
			.then((data) => {
				if (data.answer == "required") {
					reachGoal("form_required");
					return;
				} else if (data.answer == "error") {
					reachGoal("form_error");
					return;
				} else {
					if (data.attention === true) {
						reachGoal("form_attention");
					} else {
						reachGoal("form_success", formDataObj);
					}
				}
				form.reset();
			})
			.catch((error) => {
				reachGoal("form_error");
			});
	};
});
```

### Цели могут выполняться такие

Взаимодействия с формой

- **form_open** – открыл форму  
- **form_click** – кликнул по форме  
- **form_change** – изменения в форме  
- **form_submit** – нажал кнопку Отправить  
- **form_required** – не полное заполнение формы  
- **form_error** – ошибка, данные по какой-то причине не отправились  
- **form_success** – получит положительный ответ от сервера, т.е. данные отправились  
- **form_attention** – сервер пометил заявку как подозрительную (антиспам), success не отправляется  
- **form_close** – закрыл форму  

Взаимодейтсвие с телефоном

- **phone_click** — клик по телефону мышкой  
- **phone_contextmenu** — открытие контекстного меню на телефоне правой кнопкой мыши  
- **phone_copy** — копирование выделенного телефона  

Если где-то есть кликабельный email на странице, то будут отрабатываться цели на нем

- **email_click** — клик по email мышкой  
- **email_contextmenu** — открытие контекстного меню на email правой кнопкой мыши  
- **email_copy** — копирование выделенного email  


## Модуль куков

```js
import { getCookie, setCookie, deleteCookie, cookiecook } from './cookie';

getCookie('cookie_name');
setCookie('cookie_name');
deleteCookie('cookie_name');
cookiecook(days);
```

## Модуль Calltouch

```js
import {
	appendCalltouchResultToFormData,
	attemptCalltouchCallback,
	createRequest,
} from '@alexsab-ru/scripts';

// Отправка заявки на обратный возов в CallTouch
createRequest("ct_callback", "+7 (987) 654-32-10");

// для показа лога нужно использовать третий парамтер
createRequest("ct_callback", "+7 (987) 654-32-10", true);
```

Новые формы должны использовать структурированный callback-контракт:

```js
const callbackResult = await attemptCalltouchCallback({
	routeKey: 'dealer-route-key',
	phone: '+7 (987) 654-32-10',
});

appendCalltouchResultToFormData(formData, callbackResult);
```

Helper заменяет переданные пользователем поля `ct_*`/`ctw_*` и отправляет в
lead endpoint `ct_callback_status`, `ct_callback_error_code`, `ct_callback_id`,
`ct_callback_source`, `ct_submission_id`, `ct_session_id`, `ct_route_key`,
`ct_mod_id`, `ct_site_id` и `ct_client_version`. Legacy-флаг
`ct_callback=true` больше не отправляется. `ct_client_version` автоматически
берётся из версии пакета и является только служебной телеметрией: поле должно
оставаться в серверном запросе/audit и не попадать в сообщения о заявке или в
event properties аналитики.

После создания callback аналитика формы использует категорию `CallbackLead`,
чтобы не создавать дублирующий Calltouch Lead. Внутреннее решение
`sendCalltouchLead` в analytics payload не передаётся. Поля клиента `name`/`fio`,
`phone`, `email` и `comment` остаются в payload заявки/Calltouch, но удаляются
из `eventProperties` перед отправкой события в GA4, GTM и Яндекс Метрику.

## Модуль для форм

```js
import { connectForms, cookiecook } from '@alexsab-ru/scripts';

cookiecook();
connectForms('https://alexsab.ru/lead/test/', function() {
	console.log("sucess lead");
});
```
