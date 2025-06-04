// 伪装反爬
Object.defineProperty(navigator, 'webdriver', { get: () => false });
Object.defineProperty(navigator, 'plugins', {
  get: () => [{ name: "Chrome PDF Plugin" }, { name: "Chrome PDF Viewer" }]
});
Object.defineProperty(navigator, 'mimeTypes', {
  get: () => [{ type: "application/pdf" }]
});
Object.defineProperty(window, 'outerWidth', { get: () => 1366 });
Object.defineProperty(window, 'outerHeight', { get: () => 768 });
Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh'] });
Object.defineProperty(navigator, 'language', { get: () => 'zh-CN' });
Object.defineProperty(navigator, 'userAgent', {
  get: () => "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
});

(function(){
    const LOG_PREFIX = '[NKC-Javascript-mask]';

    function log(msg, level='INFO') {
        console[level === 'DEBUG' ? 'debug' : (level === 'WARN' ? 'warn' : 'log')](`${LOG_PREFIX} ${msg}`);
    }

    // 强力覆盖closeOpenTabs函数
    function overrideCloseOpenTabsOnButtons() {
        try {
            // 找所有可能的按钮，根据你说的closeOpenTabs在button元素上，先找带click的按钮（全页面）
            const buttons = document.querySelectorAll('button');

            let found = false;
            buttons.forEach(button => {
                try {
                    // 先尝试拿angular控制器实例（如果页面是Angular）
                    const ctrl = (window.angular && angular.element(button).controller()) || null;

                    if (ctrl && typeof ctrl.closeOpenTabs === 'function') {
                        ctrl.closeOpenTabs = function($event) {
                            if ($event) {
                                $event.preventDefault();
                                $event.stopPropagation && $event.stopPropagation();
                            }
                            log('closeOpenTabs被覆盖，阻止自动关闭菜单', 'DEBUG');
                            return false;
                        };
                        found = true;
                    } else if (button.hasAttribute('ng-click')) {
                        // 如果按钮本身有 ng-click 绑定 closeOpenTabs 的情况，直接替换事件处理
                        // 先用 AngularJS 的 element 获取 scope 和控制器函数
                        if (button.getAttribute('ng-click').includes('closeOpenTabs')) {
                            // 这里用原生绑定替换，阻止冒泡
                            button.addEventListener('click', function(e) {
                                e.preventDefault();
                                e.stopPropagation();
                                log('按钮click事件被拦截，阻止closeOpenTabs执行', 'DEBUG');
                            }, true);
                            found = true;
                        }
                    }
                } catch(e){
                    log(`按钮覆盖closeOpenTabs时出错: ${e.message}`, 'WARN');
                }
            });
            if (!found) {
                log('未找到带closeOpenTabs方法的按钮实例，等待重试...', 'DEBUG');
            }
            return found;
        } catch (e) {
            log(`覆盖closeOpenTabs按钮异常：${e.message}`, 'WARN');
            return false;
        }
    }

    // 拦截菜单点击事件，防止冒泡导致自动关闭菜单
    function interceptMenuClicks() {
        try {
            document.addEventListener('click', function(e) {
                const target = e.target;
                if (!target) return;
                if (target.id && target.id.startsWith('briefResultMoreOptionsButton')) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    //log('阻止菜单关闭事件冒泡', 'DEBUG');
                }
            }, true);
        } catch (e) {
            log(`拦截菜单点击事件失败：${e.message}`, 'WARN');
        }
    }

    // 定时覆盖，防止Angular覆盖掉
    function periodicOverride() {
        let attempts = 0;
        const maxAttempts = 40;
        const interval = 400;

        const timer = setInterval(() => {
            const ok = overrideCloseOpenTabsOnButtons();
            attempts++;
            if (ok || attempts >= maxAttempts) {
                if (ok) log('成功覆盖按钮closeOpenTabs，停止重试', 'INFO');
                else log('尝试覆盖按钮closeOpenTabs达到最大次数，停止重试', 'WARN');
                clearInterval(timer);
            }
        }, interval);
    }

    // 初始化
    function init() {
        if (window.angular && angular.element) {
            log('检测到AngularJS，开始覆盖按钮closeOpenTabs', 'INFO');
            interceptMenuClicks();
            periodicOverride();
        } else {
            log('未检测到AngularJS，跳过覆盖', 'WARN');
        }
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(init, 50);
    } else {
        window.addEventListener('DOMContentLoaded', init);
    }
})();
