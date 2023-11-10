# scripts
our libs for website

## Install
```bash
pnpm i git+ssh://github.com/alexsab-ru/scripts
```

## Передача событий Analytics.js

```js
window.WebsiteAnalytics.dataLayer("phone-click");
window.WebsiteAnalytics.dataLayer("phone-copy");
window.WebsiteAnalytics.dataLayer("phone-contextmenu");
window.WebsiteAnalytics.dataLayer("email-click");
window.WebsiteAnalytics.dataLayer("email-copy");
window.WebsiteAnalytics.dataLayer("email-contextmenu");
window.WebsiteAnalytics.dataLayer("video-click");
window.WebsiteAnalytics.dataLayer("form-open");
window.WebsiteAnalytics.dataLayer("form-submit");
window.WebsiteAnalytics.dataLayer("form-required");
window.WebsiteAnalytics.dataLayer("form-submit");
window.WebsiteAnalytics.dataLayer("form-error");
```

Вставляем на этапе обработки формы
```js
var formDataObj = window.WebsiteAnalytics.getFormDataObject(formData, form.id);
```

Вставляем где происходит событие Success
```js
window.WebsiteAnalytics.dataLayer("form-success", formDataObj);
```