# @alexsab-ru/scripts

[Русский](README_RU.md)

common libs for websites

* [Installation](#Installation)
* [Analytics module](#analytics-module)
* [Cookie module](#cookie-module)
* [Calltouch module](#calltouch-module)
* [Form module](#form-module)

## Installation
```bash
pnpm i @alexsab-ru/scripts
```

## Analytics module

`reachGoal` and `pageView` functions push to `dataLayer` some data with goal name
```js
reachGoal("goalName");
pageView(goalName);
```

In GTM you can use them for send goals to your analytic system

```js
{
	event: "reachGoal-goalName",
	eventAction: "goalName"
}
```

Use example:

```js
import { reachGoal } from '@alexsab-ru/scripts';

// automatic assign from module
reachGoal("phone_click");
reachGoal("phone_copy");
reachGoal("phone_contextmenu");
reachGoal("email_click");
reachGoal("email_copy");
reachGoal("email_contextmenu");
```

For form's analytics you may use these goals

```js
reachGoal("form_open");
reachGoal("form_click"); // automatic assign from module
reachGoal("form_change"); // automatic assign from module
reachGoal("form_submit");
reachGoal("form_required");
reachGoal("form_error");
reachGoal("form_success");
reachGoal("form_attention");
```

`getFormDataObject` is needed for Calltouch request tag.

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

### Goals can be achieved as follows

Interaction with the form

- **form_open** – opened the form  
- **form_click** – clicked on the form  
- **form_change** – changes in the form  
- **form_submit** – pressed the Submit button  
- **form_required** – incomplete form filling  
- **form_error** – error, data did not send for some reason  
- **form_success** – received a positive response from the server, i.e., data was sent  
- **form_attention** – server flagged the submission as suspicious (antispam), success goal is skipped  
- **form_close** – closed the form  

Interaction with the phone

- **phone_click** — clicked on it with the mouse  
- **phone_contextmenu** — opening the context menu on it with the right mouse button  
- **phone_copy** — copying the selected text  

If there is a clickable email on the page, goals will be triggered on it

- **email_click** — clicked on it with the mouse  
- **email_contextmenu** — opening the context menu on it with the right mouse button  
- **email_copy** — copying the selected text  


## Cookie module

```js
import { getCookie, setCookie, deleteCookie, cookiecook } from './cookie';

getCookie('cookie_name');
setCookie('cookie_name');
deleteCookie('cookie_name');
cookiecook(days);
```

## Calltouch module

```js
import {
	appendCalltouchResultToFormData,
	attemptCalltouchCallback,
	createRequest,
} from '@alexsab-ru/scripts';

// Sending a callback request to CallTouch
createRequest("ct_callback", "+7 (987) 654-32-10");

// to display the log, the third parameter must be used
createRequest("ct_callback", "+7 (987) 654-32-10", true);
```

New forms should use the structured callback contract:

```js
const callbackResult = await attemptCalltouchCallback({
	routeKey: 'dealer-route-key',
	phone: '+7 (987) 654-32-10',
});

appendCalltouchResultToFormData(formData, callbackResult);
```

The helper replaces user-provided `ct_*`/`ctw_*` fields and sends
`ct_callback_status`, `ct_callback_error_code`, `ct_callback_id`,
`ct_callback_source`, `ct_submission_id`, `ct_session_id`, `ct_route_key`,
`ct_mod_id`, `ct_site_id`, and `ct_client_version` to the lead endpoint. It no
longer sends the legacy `ct_callback=true` flag. `ct_client_version` is derived
from the package version and is service-only telemetry: keep it in the server
request/audit, not in lead messages or analytics event properties.

After a callback is created, form analytics use `CallbackLead` to suppress a
duplicate Calltouch Lead request. The internal `sendCalltouchLead` decision is
not included in the analytics payload. Customer `name`/`fio`, `phone`, `email`,
and `comment` stay in the lead/Calltouch payload but are removed from
`eventProperties` before GA4, GTM, or Yandex Metrika receives the event.

## Form module

```js
import { connectForms, cookiecook } from '@alexsab-ru/scripts';

cookiecook();
connectForms('https://alexsab.ru/lead/test/', function() {
	console.log("sucess lead");
});
```
