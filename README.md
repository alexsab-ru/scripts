# @alexsab-ru/scripts

common libs for websites

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
