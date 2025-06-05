// TypeScript определения для nobounce модуля

/**
 * Настройки для NoBounce модуля
 */
export interface NoBounceOptions {
    /**
     * Задержка в секундах перед отправкой цели NoBounce
     * @default 15
     */
    delay?: number;

    /**
     * Название цели для отправки в аналитику
     * @default 'NoBounce'
     */
    goalName?: string;

    /**
     * Дополнительные параметры для отправки с целью
     * @default {}
     */
    goalParams?: Record<string, any>;

    /**
     * Автоматически запускать при инициализации
     * @default true
     */
    autoStart?: boolean;

    /**
     * Отправлять цель только один раз за сессию
     * @default true
     */
    oncePerSession?: boolean;

    /**
     * Проверять видимость страницы (Page Visibility API)
     * Если страница скрыта, таймер останавливается
     * @default true
     */
    checkVisibility?: boolean;

    /**
     * Логировать отправку цели в консоль
     * @default false
     */
    debug?: boolean;
}

/**
 * Статистика времени проведенного на странице
 */
export interface TimeStats {
    /**
     * Общее время на странице в секундах
     */
    totalTime: number;

    /**
     * Время когда страница была видима в секундах
     */
    visibleTime: number;

    /**
     * Время когда страница была скрыта в секундах
     */
    hiddenTime: number;

    /**
     * Была ли отправлена цель NoBounce
     */
    goalSent: boolean;
}

/**
 * Менеджер для управления NoBounce целью
 */
export declare class NoBounceManager {
    /**
     * Конфигурация менеджера
     */
    readonly config: Required<NoBounceOptions>;

    /**
     * Была ли цель уже отправлена
     */
    readonly isGoalSent: boolean;

    /**
     * Создает новый экземпляр NoBounceManager
     * @param options - Настройки менеджера
     */
    constructor(options?: NoBounceOptions);

    /**
     * Запускает таймер для отправки NoBounce цели
     */
    start(): void;

    /**
     * Останавливает таймер
     */
    stop(): void;

    /**
     * Принудительно отправляет цель NoBounce
     */
    sendGoalNow(): void;

    /**
     * Сбрасывает состояние (для тестирования или повторного использования)
     */
    reset(): void;

    /**
     * Получает статистику времени на странице
     */
    getTimeStats(): TimeStats;
}

/**
 * Инициализирует NoBounce модуль
 * @param options - Настройки модуля
 * @returns Экземпляр менеджера
 */
export function initNoBounce(options?: NoBounceOptions): NoBounceManager;

/**
 * Получает текущий экземпляр NoBounce менеджера
 * @returns Экземпляр менеджера или null если не инициализирован
 */
export function getNoBounceManager(): NoBounceManager | null;

/**
 * Быстрый способ запуска NoBounce с настройками по умолчанию
 * @param delay - Задержка в секундах (по умолчанию 15)
 * @param goalName - Название цели (по умолчанию 'NoBounce')
 * @returns Экземпляр менеджера
 */
export function startNoBounce(delay?: number, goalName?: string): NoBounceManager;

/**
 * Останавливает текущий NoBounce таймер
 */
export function stopNoBounce(): void;

/**
 * Принудительно отправляет NoBounce цель
 */
export function sendNoBounceNow(): void;

/**
 * Получает статистику времени на странице
 * @returns Статистика или null если менеджер не инициализирован
 */
export function getNoBounceStats(): TimeStats | null;

/**
 * Сбрасывает NoBounce состояние
 */
export function resetNoBounce(): void;

/**
 * Объект с экспортированными функциями по умолчанию
 */
declare const _default: {
    initNoBounce: typeof initNoBounce;
    startNoBounce: typeof startNoBounce;
    stopNoBounce: typeof stopNoBounce;
    sendNoBounceNow: typeof sendNoBounceNow;
    getNoBounceStats: typeof getNoBounceStats;
    resetNoBounce: typeof resetNoBounce;
    getNoBounceManager: typeof getNoBounceManager;
    NoBounceManager: typeof NoBounceManager;
};

export default _default;

/**
 * React Hook для использования NoBounce
 */
export interface UseNoBounceHook {
    /**
     * Менеджер NoBounce
     */
    manager: NoBounceManager | null;

    /**
     * Статистика времени на странице
     */
    stats: TimeStats | null;

    /**
     * Была ли цель отправлена
     */
    goalSent: boolean;

    /**
     * Принудительно отправить цель
     */
    sendNow: () => void;

    /**
     * Остановить таймер
     */
    stop: () => void;
}

/**
 * Vue композабл для NoBounce
 */
export interface VueNoBounceComposable {
    /**
     * Реактивный менеджер NoBounce
     */
    manager: Ref<NoBounceManager | null>;

    /**
     * Реактивная статистика
     */
    stats: Ref<TimeStats | null>;

    /**
     * Статус инициализации
     */
    isInitialized: Ref<boolean>;

    /**
     * Функция инициализации с кастомными опциями
     */
    init: (options?: NoBounceOptions) => void;
}

// Расширение глобального объекта Window для отладки
declare global {
    interface Window {
        /**
         * Отладочные функции NoBounce
         */
        noBounceDebug?: {
            getStats: () => TimeStats | null;
            sendNow: () => void;
            stop: () => void;
            reset: () => void;
        };

        /**
         * Флаги для предотвращения повторной отправки целей
         */
        oneMinuteSent?: boolean;
        fiveMinutesSent?: boolean;
        deepScrollSent?: boolean;
    }
}