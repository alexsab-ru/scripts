# scripts
common libs for our websites

## Install and update
```bash
pnpm i https://github.com/alexsab-ru/scripts
```

### Send goals Analytics.js

```js
import '/node_modules/scripts/js/analytics.js';

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

Insert before send
```js
var formDataObj = window.WebsiteAnalytics.getFormDataObject(formData, form.id);
```

Insert when Success callback
```js
window.WebsiteAnalytics.dataLayer("form-success", formDataObj);
```