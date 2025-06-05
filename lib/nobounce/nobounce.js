import { reachGoal } from '../analytics';

/**
 * Настройки для NoBounce модуля
 */
const defaultOptions = {
    /**
     * Задержка в секундах перед отправкой цели NoBounce
     * @default 15
     */
    delay: 15,

    /**
     * Название цели для отправки в аналитику
     * @default 'NoBounce'
     */
    goalName: 'NoBounce',

    /**
     * Дополнительные параметры для отправки с целью
     * @default {}
     */
    goalParams: {},

    /**
     * Автоматически запускать при инициализации
     * @default true
     */
    autoStart: true,

    /**
     * Отправлять цель только один раз за сессию
     * @default true
     */
    oncePerSession: true,

    /**
     * Проверять видимость страницы (Page Visibility API)
     * Если страница скрыта, таймер останавливается
     * @default true
     */
    checkVisibility: true,

    /**
     * Логировать отправку цели в консоль
     * @default false
     */
    debug: false
};

/**
 * Класс для управления NoBounce целью
 */
class NoBounceManager {
    constructor(options = {}) {
        this.config = { ...defaultOptions, ...options };
        this.timerId = null;
        this.isGoalSent = false;
        this.startTime = Date.now();
        this.visibilityTime = 0; // Время, проведенное на видимой странице
        this.lastVisibilityChange = Date.now();
        
        // Проверяем сессионное хранилище
        if (this.config.oncePerSession) {
            const sessionKey = `nobounce_sent_${this.config.goalName}`;
            this.isGoalSent = sessionStorage.getItem(sessionKey) === 'true';
        }

        if (this.config.autoStart && !this.isGoalSent) {
            this.start();
        }

        this._bindVisibilityEvents();
    }

    /**
     * Запускает таймер для отправки NoBounce цели
     */
    start() {
        if (this.isGoalSent) {
            if (this.config.debug) {
                console.log('NoBounce: цель уже была отправлена в этой сессии');
            }
            return;
        }

        if (this.timerId) {
            this.stop();
        }

        const delayMs = this.config.delay * 1000;

        if (this.config.debug) {
            console.log(`NoBounce: запущен таймер на ${this.config.delay} секунд`);
        }

        this.timerId = setTimeout(() => {
            this._sendGoal();
        }, delayMs);
    }

    /**
     * Останавливает таймер
     */
    stop() {
        if (this.timerId) {
            clearTimeout(this.timerId);
            this.timerId = null;
            
            if (this.config.debug) {
                console.log('NoBounce: таймер остановлен');
            }
        }
    }

    /**
     * Принудительно отправляет цель NoBounce
     */
    sendGoalNow() {
        this.stop();
        this._sendGoal();
    }

    /**
     * Сбрасывает состояние (для тестирования или повторного использования)
     */
    reset() {
        this.stop();
        this.isGoalSent = false;
        this.startTime = Date.now();
        this.visibilityTime = 0;
        this.lastVisibilityChange = Date.now();
        
        if (this.config.oncePerSession) {
            const sessionKey = `nobounce_sent_${this.config.goalName}`;
            sessionStorage.removeItem(sessionKey);
        }
    }

    /**
     * Получает статистику времени на странице
     */
    getTimeStats() {
        const now = Date.now();
        const totalTime = Math.floor((now - this.startTime) / 1000);
        const visibleTime = Math.floor((this.visibilityTime + (document.hidden ? 0 : now - this.lastVisibilityChange)) / 1000);
        
        return {
            totalTime,
            visibleTime,
            hiddenTime: totalTime - visibleTime,
            goalSent: this.isGoalSent
        };
    }

    /**
     * Отправляет цель в аналитику
     * @private
     */
    _sendGoal() {
        if (this.isGoalSent) {
            return;
        }

        const stats = this.getTimeStats();
        const goalParams = {
            ...this.config.goalParams,
            timeOnPage: stats.totalTime,
            visibleTime: stats.visibleTime,
            timestamp: new Date().toISOString()
        };

        try {
            reachGoal(this.config.goalName, goalParams);
            this.isGoalSent = true;

            // Сохраняем в sessionStorage
            if (this.config.oncePerSession) {
                const sessionKey = `nobounce_sent_${this.config.goalName}`;
                sessionStorage.setItem(sessionKey, 'true');
            }

            if (this.config.debug) {
                console.log('NoBounce: цель отправлена', {
                    goal: this.config.goalName,
                    params: goalParams,
                    stats
                });
            }

        } catch (error) {
            console.error('NoBounce: ошибка при отправке цели', error);
        }
    }

    /**
     * Привязывает события видимости страницы
     * @private
     */
    _bindVisibilityEvents() {
        if (!this.config.checkVisibility || typeof document.hidden === 'undefined') {
            return;
        }

        const handleVisibilityChange = () => {
            const now = Date.now();
            
            if (document.hidden) {
                // Страница скрыта - останавливаем таймер и сохраняем время
                this.visibilityTime += now - this.lastVisibilityChange;
                this.stop();
                
                if (this.config.debug) {
                    console.log('NoBounce: страница скрыта, таймер остановлен');
                }
            } else {
                // Страница показана - возобновляем таймер если цель не отправлена
                this.lastVisibilityChange = now;
                
                if (!this.isGoalSent && !this.timerId) {
                    const remainingTime = Math.max(0, this.config.delay - Math.floor(this.visibilityTime / 1000));
                    
                    if (remainingTime > 0) {
                        if (this.config.debug) {
                            console.log(`NoBounce: страница показана, возобновляем таймер на ${remainingTime} секунд`);
                        }
                        
                        this.timerId = setTimeout(() => {
                            this._sendGoal();
                        }, remainingTime * 1000);
                    } else {
                        this._sendGoal();
                    }
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        // Сохраняем время начала как видимое
        if (!document.hidden) {
            this.lastVisibilityChange = this.startTime;
        }
    }
}

// Глобальный экземпляр
let globalNoBounceManager = null;

/**
 * Инициализирует NoBounce модуль
 * @param {Object} options - Настройки модуля
 * @returns {NoBounceManager} - Экземпляр менеджера
 */
export function initNoBounce(options = {}) {
    if (globalNoBounceManager) {
        console.warn('NoBounce: модуль уже инициализирован');
        return globalNoBounceManager;
    }

    globalNoBounceManager = new NoBounceManager(options);
    return globalNoBounceManager;
}

/**
 * Получает текущий экземпляр NoBounce менеджера
 * @returns {NoBounceManager|null}
 */
export function getNoBounceManager() {
    return globalNoBounceManager;
}

/**
 * Быстрый способ запуска NoBounce с настройками по умолчанию
 * @param {number} delay - Задержка в секундах (по умолчанию 15)
 * @param {string} goalName - Название цели (по умолчанию 'NoBounce')
 */
export function startNoBounce(delay = 15, goalName = 'NoBounce') {
    return initNoBounce({
        delay,
        goalName,
        debug: false
    });
}

/**
 * Останавливает текущий NoBounce таймер
 */
export function stopNoBounce() {
    if (globalNoBounceManager) {
        globalNoBounceManager.stop();
    }
}

/**
 * Принудительно отправляет NoBounce цель
 */
export function sendNoBounceNow() {
    if (globalNoBounceManager) {
        globalNoBounceManager.sendGoalNow();
    }
}

/**
 * Получает статистику времени на странице
 */
export function getNoBounceStats() {
    if (globalNoBounceManager) {
        return globalNoBounceManager.getTimeStats();
    }
    return null;
}

/**
 * Сбрасывает NoBounce состояние
 */
export function resetNoBounce() {
    if (globalNoBounceManager) {
        globalNoBounceManager.reset();
    }
}

// Экспорт класса для продвинутого использования
export { NoBounceManager };

// Экспорт по умолчанию
export default {
    initNoBounce,
    startNoBounce,
    stopNoBounce,
    sendNoBounceNow,
    getNoBounceStats,
    resetNoBounce,
    getNoBounceManager,
    NoBounceManager
};