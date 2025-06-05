# Persist Campaign Data

Функционал для сохранения данных рекламных кампаний (UTM параметры, gclid и др.) в cookies браузера и отправки в dataLayer. Основан на популярном Google Tag Manager шаблоне.

## Возможности

- 🎯 Автоматическое сохранение UTM параметров и других данных кампании в cookies
- 📊 Отправка данных в dataLayer для интеграции с аналитикой
- 🔗 Сохранение referrer когда пользователь приходит с внешнего домена
- ⚙️ Гибкая настройка параметров и поведения
- 🚀 Простая интеграция с React, Vue, Next.js и другими фреймворками
- 📱 Поддержка SPA (Single Page Applications)

## Установка

```bash
npm install @alexsab-ru/scripts
```

## Быстрый старт

```javascript
import { initPersistCampaignData } from '@alexsab-ru/scripts';

// Автоматическая инициализация при загрузке страницы
initPersistCampaignData();
```

### Установка отдельных модулей

```javascript
// Всё сразу
import { persistCampaignData } from '@alexsab-ru/scripts';

// Только campaign модуль
import { persistCampaignData } from '@alexsab-ru/scripts/campaign';

// Конкретный файл
import { persistCampaignData } from '@alexsab-ru/scripts/campaign/persist';
```

## API

### `persistCampaignData(options)`

Основная функция для сохранения данных кампании.

**Параметры:**

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| `storeInCookie` | boolean | `true` | Сохранять ли данные в cookies |
| `pushToDataLayer` | boolean | `true` | Отправлять ли данные в dataLayer |
| `triggerParameters` | string[] | `['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id', 'gclid', 'yclid', 'ysclid']` | Параметры URL, которые триггерят сохранение |
| `urlCookieName` | string | `'__gtm_campaign_url'` | Имя cookie для URL кампании |
| `referrerCookieName` | string | `'__gtm_referrer'` | Имя cookie для referrer |
| `dataLayerName` | string | `'dataLayer'` | Имя массива dataLayer |
| `dataLayerKey` | string | `'originalLocation'` | Ключ в dataLayer для оригинального URL |
| `cookieExpireDays` | number | `null` | Дни жизни cookie (null = session cookie) |

**Возвращает:** `boolean` - успешность операции

### `getCampaignData(options)`

Получает сохраненные данные кампании из cookies.

**Параметры:**

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| `urlCookieName` | string | `'__gtm_campaign_url'` | Имя cookie для URL кампании |
| `referrerCookieName` | string | `'__gtm_referrer'` | Имя cookie для referrer |

**Возвращает:** 
```javascript
{
    campaignUrl: string | undefined,
    referrer: string | undefined
}
```

### `extractUtmParameters(url)`

Извлекает UTM параметры из URL.

**Параметры:**

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| `url` | string | `window.location.href` | URL для анализа |

**Возвращает:**
```javascript
{
    utm_source: string | null,
    utm_medium: string | null,
    utm_campaign: string | null,
    utm_term: string | null,
    utm_content: string | null,
    utm_id: string | null,
    gclid: string | null,
    yclid: string | null,
    ysclid: string | null
}
```

### `initPersistCampaignData(options)`

Автоматическая инициализация при загрузке страницы.

**Параметры:** те же, что у `persistCampaignData`

## Примеры использования

### Базовое использование

```javascript
import { persistCampaignData } from '@alexsab-ru/scripts';

// Запуск с настройками по умолчанию
persistCampaignData();
```

### Кастомная настройка

```javascript
persistCampaignData({
    storeInCookie: true,
    pushToDataLayer: true,
    triggerParameters: ['utm_source', 'utm_medium', 'fbclid', 'custom_param'],
    cookieExpireDays: 30,
    urlCookieName: 'my_campaign_url'
});
```

### React приложение

```javascript
import React, { useEffect } from 'react';
import { initPersistCampaignData } from '@alexsab-ru/scripts';

function App() {
    useEffect(() => {
        initPersistCampaignData({
            cookieExpireDays: 30
        });
    }, []);

    return <div>Your App</div>;
}
```

### Next.js

```javascript
// pages/_app.js
import { useEffect } from 'react';
import { initPersistCampaignData } from '@alexsab-ru/scripts';

function MyApp({ Component, pageProps }) {
    useEffect(() => {
        initPersistCampaignData();
    }, []);

    return <Component {...pageProps} />;
}

export default MyApp;
```

### Vue.js

```javascript
// main.js или App.vue
import { initPersistCampaignData } from '@alexsab-ru/scripts';

export default {
    mounted() {
        initPersistCampaignData();
    }
};
```

### Получение сохраненных данных

```javascript
import { getCampaignData, extractUtmParameters } from '@alexsab-ru/scripts';

// Получить данные из cookies
const campaignData = getCampaignData();
console.log('Campaign URL:', campaignData.campaignUrl);
console.log('Referrer:', campaignData.referrer);

// Извлечь UTM параметры
const utmParams = extractUtmParameters();
console.log('UTM Source:', utmParams.utm_source);
```

## Как это работает

1. **Сохранение URL кампании**: Если в URL есть параметры из списка `triggerParameters`, полный URL сохраняется в cookie
2. **Сохранение referrer**: Если пользователь пришел с внешнего домена, referrer сохраняется в отдельный cookie
3. **DataLayer**: Текущий URL отправляется в dataLayer с событием `originalLocation`
4. **Session cookies**: По умолчанию cookies создаются как session (удаляются при закрытии браузера)

## Интеграция с аналитикой

Данные из dataLayer можно использовать в Google Analytics, Adobe Analytics и других системах:

```javascript
// Google Analytics 4
gtag('config', 'GA_MEASUREMENT_ID', {
    page_title: 'Custom Page',
    page_location: dataLayer.find(item => item.originalLocation)?.originalLocation
});

// Google Tag Manager
// Используйте dataLayer переменные в тегах и триггерах
```

## Совместимость

- ✅ Vanilla JavaScript
- ✅ React
- ✅ Vue.js
- ✅ Next.js
- ✅ Nuxt.js
- ✅ Angular
- ✅ SPA (Single Page Applications)
- ✅ SSR (Server Side Rendering)

## Лицензия

MIT