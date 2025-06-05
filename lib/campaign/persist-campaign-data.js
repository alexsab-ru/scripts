import { getCookie, setCookie } from '../cookie';

/**
 * Persist Campaign Data - сохраняет данные кампании в cookies и/или dataLayer
 * @param {Object} options - Настройки функции
 * @param {boolean} options.storeInCookie - Сохранять ли данные в cookies
 * @param {boolean} options.pushToDataLayer - Отправлять ли данные в dataLayer
 * @param {string[]} options.triggerParameters - Параметры URL, которые триггерят сохранение
 * @param {string} options.urlCookieName - Имя cookie для URL кампании
 * @param {string} options.referrerCookieName - Имя cookie для referrer
 * @param {string} options.dataLayerName - Имя массива dataLayer
 * @param {string} options.dataLayerKey - Ключ в dataLayer для оригинального URL
 * @param {number} options.cookieExpireDays - Дни жизни cookie (по умолчанию session cookie)
 * @returns {boolean} - true если операция прошла успешно
 */
export function persistCampaignData(options = {}) {
    const defaultOptions = {
        storeInCookie: true,
        pushToDataLayer: true,
        triggerParameters: ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id', 'gclid', 'yclid', 'ysclid'],
        urlCookieName: '__gtm_campaign_url',
        referrerCookieName: '__gtm_referrer',
        dataLayerName: 'dataLayer',
        dataLayerKey: 'originalLocation',
        cookieExpireDays: null // session cookie by default
    };

    const config = { ...defaultOptions, ...options };
    let success = true;

    try {
        // Получаем текущий URL и его параметры
        const currentUrl = window.location.href;
        const urlParams = new URLSearchParams(window.location.search);
        const currentHost = window.location.hostname;
        const referrer = document.referrer;

        if (config.storeInCookie) {
            // Проверяем, есть ли в URL параметры кампании
            const hasCampaignParams = config.triggerParameters.some(param => 
                urlParams.has(param)
            );

            if (hasCampaignParams) {
                // Сохраняем URL с параметрами кампании
                const cookieOptions = {};
                if (config.cookieExpireDays) {
                    cookieOptions.expires = config.cookieExpireDays * 24 * 60 * 60; // в секундах
                }
                
                setCookie(config.urlCookieName, currentUrl, cookieOptions);
            }

            // Проверяем referrer - если домен отличается, сохраняем его
            if (referrer) {
                try {
                    const referrerUrl = new URL(referrer);
                    const referrerHost = referrerUrl.hostname;
                    
                    if (referrerHost !== currentHost && !referrerHost.includes(currentHost)) {
                        const cookieOptions = {};
                        if (config.cookieExpireDays) {
                            cookieOptions.expires = config.cookieExpireDays * 24 * 60 * 60;
                        }
                        
                        setCookie(config.referrerCookieName, referrer, cookieOptions);
                    }
                } catch (e) {
                    console.warn('Invalid referrer URL:', referrer);
                }
            }
        }

        if (config.pushToDataLayer) {
            // Отправляем оригинальный URL в dataLayer
            if (typeof window !== 'undefined') {
                // Создаем dataLayer если его нет
                window[config.dataLayerName] = window[config.dataLayerName] || [];
                
                const dataLayerEvent = {
                    event: 'originalLocation',
                    [config.dataLayerKey]: currentUrl
                };

                window[config.dataLayerName].push(dataLayerEvent);
            }
        }

    } catch (error) {
        console.error('Error in persistCampaignData:', error);
        success = false;
    }

    return success;
}

/**
 * Получает сохраненные данные кампании из cookies
 * @param {Object} options - Настройки
 * @param {string} options.urlCookieName - Имя cookie для URL кампании
 * @param {string} options.referrerCookieName - Имя cookie для referrer
 * @returns {Object} - Объект с данными кампании
 */
export function getCampaignData(options = {}) {
    const config = {
        urlCookieName: '__gtm_campaign_url',
        referrerCookieName: '__gtm_referrer',
        ...options
    };

    return {
        campaignUrl: getCookie(config.urlCookieName),
        referrer: getCookie(config.referrerCookieName)
    };
}

/**
 * Извлекает UTM параметры из URL или сохраненных данных кампании
 * @param {string} url - URL для анализа (по умолчанию текущий URL)
 * @returns {Object} - Объект с UTM параметрами
 */
export function extractUtmParameters(url = null) {
    const targetUrl = url || window.location.href;
    const urlObj = new URL(targetUrl);
    const params = urlObj.searchParams;

    return {
        utm_source: params.get('utm_source'),
        utm_medium: params.get('utm_medium'),
        utm_campaign: params.get('utm_campaign'),
        utm_term: params.get('utm_term'),
        utm_content: params.get('utm_content'),
        utm_id: params.get('utm_id'),
        gclid: params.get('gclid'),
        yclid: params.get('yclid'),
        ysclid: params.get('ysclid')
    };
}

/**
 * Автоматическая инициализация при загрузке страницы
 * @param {Object} options - Настройки для persistCampaignData
 */
export function initPersistCampaignData(options = {}) {
    if (typeof window !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                persistCampaignData(options);
            });
        } else {
            persistCampaignData(options);
        }
    }
}

// Экспорт по умолчанию для удобства
export default {
    persistCampaignData,
    getCampaignData,
    extractUtmParameters,
    initPersistCampaignData
};