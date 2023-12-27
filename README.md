# @alexsab-ru/scripts

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
					reachGoal("form_success", formDataObj);
				}
				form.reset();
			})
			.catch((error) => {
				reachGoal("form_error");
			});
	};
});
```

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
import { createRequest } from '@alexsab-ru/scripts';

// Отправка заявки на обратный возов в CallTouch
createRequest("ct_callback", "+7 (987) 654-32-10");

// для показа лога нужно использовать третий парамтер
createRequest("ct_callback", "+7 (987) 654-32-10", true);
```

## Form module

```js
import { connectForms, cookiecook } from '@alexsab-ru/scripts';

cookiecook();
connectForms('https://alexsab.ru/lead/test/', function() {
	console.log("sucess lead");
});
```