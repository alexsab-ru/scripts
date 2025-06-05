// Примеры использования NoBounce модуля

import { 
    initNoBounce, 
    startNoBounce, 
    getNoBounceStats,
    stopNoBounce,
    sendNoBounceNow
} from '@alexsab-ru/scripts/nobounce';

// ============================================
// БАЗОВОЕ ИСПОЛЬЗОВАНИЕ
// ============================================

// 1. Простой запуск с настройками по умолчанию (15 секунд)
startNoBounce();

// 2. Запуск с кастомной задержкой
startNoBounce(30); // 30 секунд

// 3. Запуск с кастомным названием цели
startNoBounce(20, 'EngagedUser');

// ============================================
// ПРОДВИНУТАЯ НАСТРОЙКА
// ============================================

// 4. Полная настройка
initNoBounce({
    delay: 25,                    // 25 секунд
    goalName: 'QualityVisit',     // Кастомное название цели
    goalParams: {                 // Дополнительные параметры
        page_type: 'landing',
        source: 'organic'
    },
    oncePerSession: true,         // Один раз за сессию
    checkVisibility: true,        // Учитывать видимость страницы
    debug: true                   // Включить отладку
});

// 5. Настройка для разных типов страниц
const pageType = document.body.dataset.pageType;

switch(pageType) {
    case 'homepage':
        initNoBounce({
            delay: 10,
            goalName: 'HomepageEngagement',
            goalParams: { page_type: 'homepage' }
        });
        break;
        
    case 'product':
        initNoBounce({
            delay: 20,
            goalName: 'ProductPageEngagement',
            goalParams: { 
                page_type: 'product',
                product_id: document.body.dataset.productId 
            }
        });
        break;
        
    case 'blog':
        initNoBounce({
            delay: 30,
            goalName: 'BlogEngagement',
            goalParams: { page_type: 'blog' }
        });
        break;
        
    default:
        startNoBounce(15, 'DefaultEngagement');
}

// ============================================
// УСЛОВНЫЙ ЗАПУСК
// ============================================

// 6. Запуск только для новых пользователей
if (!localStorage.getItem('returning_user')) {
    initNoBounce({
        delay: 20,
        goalName: 'NewUserEngagement',
        goalParams: { user_type: 'new' }
    });
}

// 7. Запуск только для трафика с рекламы
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('utm_source') || urlParams.get('gclid')) {
    initNoBounce({
        delay: 15,
        goalName: 'PaidTrafficEngagement',
        goalParams: { 
            traffic_type: 'paid',
            utm_source: urlParams.get('utm_source') || 'unknown'
        }
    });
}

// 8. Разная задержка в зависимости от источника трафика
const utmSource = urlParams.get('utm_source');
let delay = 15; // по умолчанию

if (utmSource === 'google') {
    delay = 10; // быстрее для Google трафика
} else if (utmSource === 'facebook') {
    delay = 20; // медленнее для Facebook
} else if (document.referrer.includes('organic')) {
    delay = 25; // еще медленнее для органики
}

initNoBounce({
    delay,
    goalName: 'SourceBasedEngagement',
    goalParams: { utm_source: utmSource || 'direct' }
});

// ============================================
// КОНТРОЛЬ И МОНИТОРИНГ
// ============================================

// 9. Мониторинг статистики
setInterval(() => {
    const stats = getNoBounceStats();
    if (stats) {
        console.log('Время на странице:', stats);
        
        // Отправляем промежуточные цели
        if (stats.visibleTime === 60 && !window.oneMinuteSent) {
            reachGoal('OneMinuteOnPage', { visible_time: 60 });
            window.oneMinuteSent = true;
        }
        
        if (stats.visibleTime === 300 && !window.fiveMinutesSent) {
            reachGoal('FiveMinutesOnPage', { visible_time: 300 });
            window.fiveMinutesSent = true;
        }
    }
}, 10000); // каждые 10 секунд

// 10. Принудительная отправка при определенных действиях
document.addEventListener('scroll', () => {
    const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
    
    if (scrollPercent > 75 && !window.deepScrollSent) {
        sendNoBounceNow(); // Принудительно отправляем NoBounce
        window.deepScrollSent = true;
    }
});

// 11. Остановка таймера при определенных условиях
window.addEventListener('beforeunload', () => {
    const stats = getNoBounceStats();
    
    // Если пользователь быстро покидает страницу, не отправляем цель
    if (stats && stats.visibleTime < 5) {
        stopNoBounce();
    }
});

// ============================================
// ИНТЕГРАЦИЯ С ФРЕЙМВОРКАМИ
// ============================================

// 12. React Hook
import { useEffect } from 'react';

function useNoBounce(options = {}) {
    useEffect(() => {
        const manager = initNoBounce({
            delay: 15,
            ...options
        });
        
        return () => {
            if (manager) {
                manager.stop();
            }
        };
    }, []);
}

// В компоненте
function MyComponent() {
    useNoBounce({
        goalName: 'ReactPageEngagement',
        goalParams: { framework: 'react' }
    });
    
    return <div>My Component</div>;
}

// 13. Vue.js Composable
import { onMounted, onUnmounted } from 'vue';

function useNoBounce(options = {}) {
    let manager = null;
    
    onMounted(() => {
        manager = initNoBounce({
            delay: 15,
            ...options
        });
    });
    
    onUnmounted(() => {
        if (manager) {
            manager.stop();
        }
    });
    
    return { manager };
}

// 14. Next.js App integration
// В _app.js
import { useRouter } from 'next/router';
import { useEffect } from 'react';

function MyApp({ Component, pageProps }) {
    const router = useRouter();
    
    useEffect(() => {
        const handleRouteChange = () => {
            // Новая страница - инициализируем NoBounce
            setTimeout(() => {
                initNoBounce({
                    goalName: 'NextJSPageEngagement',
                    goalParams: { 
                        route: router.pathname,
                        framework: 'nextjs' 
                    }
                });
            }, 100);
        };
        
        handleRouteChange(); // Для первой загрузки
        router.events.on('routeChangeComplete', handleRouteChange);
        
        return () => {
            router.events.off('routeChangeComplete', handleRouteChange);
        };
    }, [router]);
    
    return <Component {...pageProps} />;
}

// ============================================
// ТЕСТИРОВАНИЕ И ОТЛАДКА
// ============================================

// 15. Тестовый режим
if (window.location.search.includes('nobounce_test=true')) {
    initNoBounce({
        delay: 3, // 3 секунды для тестирования
        goalName: 'TestNoBounce',
        debug: true,
        oncePerSession: false // Позволяем многократную отправку
    });
}

// 16. Отладочная информация
window.debugNoBounce = () => {
    const stats = getNoBounceStats();
    console.table(stats);
    
    console.log('Manager:', getNoBounceManager());
};

// Добавляем в глобальный объект для отладки
if (typeof window !== 'undefined') {
    window.noBounceDebug = {
        getStats: getNoBounceStats,
        sendNow: sendNoBounceNow,
        stop: stopNoBounce,
        reset: resetNoBounce
    };
}