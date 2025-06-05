// TypeScript определения для persist-campaign-data

/**
 * Настройки для функции persistCampaignData
 */
export interface PersistCampaignDataOptions {
    /**
     * Сохранять ли данные в cookies браузера
     * @default true
     */
    storeInCookie?: boolean;

    /**
     * Отправлять ли данные в dataLayer
     * @default true
     */
    pushToDataLayer?: boolean;

    /**
     * Параметры URL, которые триггерят сохранение данных кампании
     * @default ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id', 'gclid', 'yclid', 'ysclid']
     */
    triggerParameters?: string[];

    /**
     * Имя cookie для сохранения URL кампании
     * @default '__gtm_campaign_url'
     */
    urlCookieName?: string;

    /**
     * Имя cookie для сохранения referrer
     * @default '__gtm_referrer'
     */
    referrerCookieName?: string;

    /**
     * Имя массива dataLayer
     * @default 'dataLayer'
     */
    dataLayerName?: string;

    /**
     * Ключ в dataLayer для оригинального URL
     * @default 'originalLocation'
     */
    dataLayerKey?: string;

    /**
     * Количество дней жизни cookie. Если null - session cookie
     * @default null
     */
    cookieExpireDays?: number | null;
}

/**
 * Настройки для функции getCampaignData
 */
export interface GetCampaignDataOptions {
    /**
     * Имя cookie для URL кампании
     * @default '__gtm_campaign_url'
     */
    urlCookieName?: string;

    /**
     * Имя cookie для referrer
     * @default '__gtm_referrer'
     */
    referrerCookieName?: string;
}

/**
 * Результат функции getCampaignData
 */
export interface CampaignData {
    /**
     * URL кампании из cookie
     */
    campaignUrl?: string;

    /**
     * Referrer из cookie
     */
    referrer?: string;
}

/**
 * UTM параметры извлеченные из URL
 */
export interface UtmParameters {
    /**
     * Источник трафика
     */
    utm_source: string | null;

    /**
     * Канал/медиум
     */
    utm_medium: string | null;

    /**
     * Название кампании
     */
    utm_campaign: string | null;

    /**
     * Ключевое слово
     */
    utm_term: string | null;

    /**
     * Контент/вариация
     */
    utm_content: string | null;

    /**
     * ID кампании
     */
    utm_id: string | null;

    /**
     * Google Click ID
     */
    gclid: string | null;

    /**
     * Yandex Click ID
     */
    yclid: string | null;

    /**
     * Yandex Search Click ID
     */
    ysclid: string | null;
}

/**
 * Событие dataLayer для оригинального URL
 */
export interface OriginalLocationEvent {
    /**
     * Название события
     */
    event: 'originalLocation';

    /**
     * Оригинальный URL страницы
     */
    [key: string]: string;
}

/**
 * Расширение глобального объекта Window для dataLayer
 */
declare global {
    interface Window {
        /**
         * Массив dataLayer для Google Tag Manager
         */
        dataLayer?: any[];

        /**
         * Флаг для предотвращения повторной инициализации в SPA
         */
        campaignDataPersisted?: boolean;

        /**
         * Кастомный dataLayer с произвольным именем
         */
        [key: string]: any;
    }
}

/**
 * Сохраняет данные рекламной кампании в cookies и/или dataLayer
 * @param options - Настройки функции
 * @returns true если операция прошла успешно, false в случае ошибки
 */
export function persistCampaignData(options?: PersistCampaignDataOptions): boolean;

/**
 * Получает сохраненные данные кампании из cookies
 * @param options - Настройки для получения данных
 * @returns Объект с данными кампании из cookies
 */
export function getCampaignData(options?: GetCampaignDataOptions): CampaignData;

/**
 * Извлекает UTM параметры из URL
 * @param url - URL для анализа. Если не указан, используется текущий URL
 * @returns Объект с UTM параметрами
 */
export function extractUtmParameters(url?: string): UtmParameters;

/**
 * Автоматическая инициализация при загрузке страницы
 * Выполняет persistCampaignData когда DOM готов
 * @param options - Настройки для persistCampaignData
 */
export function initPersistCampaignData(options?: PersistCampaignDataOptions): void;

/**
 * Объект с экспортированными функциями по умолчанию
 */
declare const _default: {
    persistCampaignData: typeof persistCampaignData;
    getCampaignData: typeof getCampaignData;
    extractUtmParameters: typeof extractUtmParameters;
    initPersistCampaignData: typeof initPersistCampaignData;
};

export default _default;

/**
 * Типы для интеграции с популярными фреймворками
 */

/**
 * React Hook для использования persist campaign data
 */
export interface UsePersistCampaignData {
    /**
     * Данные кампании из cookies
     */
    campaignData: CampaignData;

    /**
     * UTM параметры из текущего URL
     */
    utmParameters: UtmParameters;

    /**
     * Функция для принудительного обновления данных
     */
    refresh: () => void;

    /**
     * Статус инициализации
     */
    isInitialized: boolean;
}

/**
 * Vue.js композабл для persist campaign data
 */
export interface VuePersistCampaignData {
    /**
     * Реактивные данные кампании
     */
    campaignData: Ref<CampaignData>;

    /**
     * Реактивные UTM параметры
     */
    utmParameters: Ref<UtmParameters>;

    /**
     * Функция инициализации
     */
    init: (options?: PersistCampaignDataOptions) => void;

    /**
     * Статус готовности
     */
    isReady: Ref<boolean>;
}

/**
 * Next.js типы для серверного рендеринга
 */
export interface NextJsPersistCampaignData {
    /**
     * Серверные props с данными кампании
     */
    campaignData?: CampaignData;

    /**
     * UTM параметры из серверного запроса
     */
    utmParameters?: UtmParameters;
}

// Для совместимости с CommonJS
export = {
    persistCampaignData,
    getCampaignData,
    extractUtmParameters,
    initPersistCampaignData
};