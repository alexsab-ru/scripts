// Примеры использования Persist Campaign Data

import { 
    persistCampaignData, 
    getCampaignData, 
    extractUtmParameters, 
    initPersistCampaignData 
} from '@alexsab-ru/scripts';

// 1. Простой запуск с настройками по умолчанию
// Сохранит UTM параметры и gclid в cookies, отправит данные в dataLayer
persistCampaignData();

// 2. Автоматическая инициализация при загрузке страницы
initPersistCampaignData();

// 3. Настройка с кастомными параметрами
persistCampaignData({
    storeInCookie: true,
    pushToDataLayer: true,
    triggerParameters: ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'custom_param'],
    urlCookieName: 'my_campaign_url',
    referrerCookieName: 'my_referrer',
    dataLayerName: 'customDataLayer',
    dataLayerKey: 'originalPageUrl',
    cookieExpireDays: 30 // cookie будет жить 30 дней
});

// 4. Только сохранение в cookies (без dataLayer)
persistCampaignData({
    storeInCookie: true,
    pushToDataLayer: false,
    cookieExpireDays: 90
});

// 5. Только отправка в dataLayer (без cookies)
persistCampaignData({
    storeInCookie: false,
    pushToDataLayer: true,
    dataLayerName: 'myDataLayer'
});

// 6. Получение сохраненных данных кампании
const campaignData = getCampaignData();
console.log('Campaign URL:', campaignData.campaignUrl);
console.log('Referrer:', campaignData.referrer);

// 7. Получение данных с кастомными именами cookies
const customCampaignData = getCampaignData({
    urlCookieName: 'my_campaign_url',
    referrerCookieName: 'my_referrer'
});

// 8. Извлечение UTM параметров из текущего URL
const utmParams = extractUtmParameters();
console.log('UTM Source:', utmParams.utm_source);
console.log('UTM Medium:', utmParams.utm_medium);
console.log('UTM Campaign:', utmParams.utm_campaign);

// 9. Извлечение UTM параметров из конкретного URL
const specificUtmParams = extractUtmParameters('https://example.com/?utm_source=google&utm_medium=cpc');
console.log('Specific UTM params:', specificUtmParams);

// 10. Инициализация для SPA (Single Page Application)
// Запускать только на первоначальной загрузке страницы
if (!window.campaignDataPersisted) {
    persistCampaignData();
    window.campaignDataPersisted = true;
}

// 11. Интеграция с React
import React, { useEffect } from 'react';

function App() {
    useEffect(() => {
        // Запускаем только при первом рендере компонента
        initPersistCampaignData({
            cookieExpireDays: 30,
            triggerParameters: ['utm_source', 'utm_medium', 'utm_campaign', 'gclid', 'fbclid']
        });
    }, []);

    return <div>Your App</div>;
}

// 12. Интеграция с Vue.js
// В main.js или App.vue
import { initPersistCampaignData } from '@alexsab-ru/scripts';

export default {
    mounted() {
        initPersistCampaignData();
    }
};

// 13. Интеграция с Next.js
// В _app.js
import { useEffect } from 'react';
import { initPersistCampaignData } from '@alexsab-ru/scripts';

function MyApp({ Component, pageProps }) {
    useEffect(() => {
        initPersistCampaignData();
    }, []);

    return <Component {...pageProps} />;
}

// 14. Обработка ошибок
const success = persistCampaignData({
    storeInCookie: true,
    pushToDataLayer: true
});

if (!success) {
    console.error('Failed to persist campaign data');
    // Можно отправить ошибку в систему мониторинга
}

// 15. Условное выполнение
// Запускать только для определенных страниц
if (window.location.pathname.includes('/landing/')) {
    persistCampaignData({
        cookieExpireDays: 7 // Короткий срок жизни для лендингов
    });
}