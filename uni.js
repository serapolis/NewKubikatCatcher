// JCEF Kubikat自动抓取脚本 - 批量下载版
// 使用页面自带的全选和批量导出功能

(function() {
    'use strict';

    // 配置常量
    const CONFIG = {
        LOG_PREFIX: '[NKC-Javascript-uni]',
        ELEMENT_CHECK_INTERVAL: 128,          // 元素检查间隔
        MAX_ELEMENT_WAIT_TIME: 16384,         // 等待元素最大时间
        DOWNLOAD_DELAY: 1024,                 // 下载操作后的延迟
        PAGE_LOAD_CHECK_INTERVAL: 256,        // 页面加载检查间隔
        MAX_RETRIES: 32,                      // 最大重试次数
        ITEMS_PER_PAGE: 50,                   // 每页条目数
        RIS_WAIT_TIMEOUT: 10240,              // 批量下载RIS数据需要更长等待时间
        BUTTON_CLICK_DELAY: 256,              // 按钮点击后的延迟
        SCROLL_TO_BOTTOM_DELAY: 512,          // 滚动到页面底部后的延迟
        SCROLL_ATTEMPTS: 8                    // 滚动到底部尝试次数
    };

    // 全局状态
    let state = {
        currentPage: 0,
        totalResults: 0,
        totalPages: 0,
        downloadedCount: 0,                   // 累计已成功处理的条目总数
        isRunning: false,
        currentPageItemCount: 0,              // 当前页实际加载的条目数
        expectedRisCount: 0,                  // 当前页期望收到的RIS记录数
        actualRisCount: 0,                    // 当前页实际收到的RIS记录数
        isPageSizeSet: false                  // 标记是否已设置页面大小
    };

    // 简化日志输出
    function log(message, type = 'INFO') {
        const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
        if (type === 'ERROR' || type === 'WARN') {
            console.error(`${CONFIG.LOG_PREFIX}[${type}][${timestamp}] ${message}`);
        } else {
            console.log(`${CONFIG.LOG_PREFIX}[${type}][${timestamp}] ${message}`);
        }
    }

    // 输出RIS数据，并将换行符转换为实际换行
    function outputRIS(risData, itemIndex, pageNumber, globalIndex) {
        // 将 '\n' 字符串转换为实际的换行符，确保控制台输出时是多行显示
        // 注意：这里risData本身可能已经包含真实换行，但如果你收到的是字面量'\n'，此步很关键
        const formattedRisData = risData.replace(/\\n/g, '\n');
        console.log(`${CONFIG.LOG_PREFIX}[RIS_DATA]${formattedRisData}`);
    }

    // 输出进度信息
    function outputProgress() {
        const progress = {
            page: state.currentPage + 1,
            totalPages: state.totalPages,
            downloaded: state.downloadedCount,
            total: state.totalResults,
            currentPageRis: state.actualRisCount,
            expectedPageRis: state.expectedRisCount
        };
        console.log(`${CONFIG.LOG_PREFIX}[PROGRESS]${JSON.stringify(progress)}`);
    }

    // 延迟函数
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 等待指定条件满足。
     * @param {function} conditionFn - 一个返回布尔值的函数，表示条件是否满足。
     * @param {string} description - 等待的描述信息，用于日志。
     * @param {number} timeout - 等待的最大时间（毫秒）。
     * @param {number} interval - 检查条件的间隔时间（毫秒）。
     * @returns {Promise<boolean>} - 如果条件满足则 resolve true，超时则 reject。
     */
    async function waitForCondition(conditionFn, description, timeout, interval) {
        const startTime = Date.now();
        return new Promise((resolve, reject) => {
            let checkIntervalId = setInterval(async () => {
                try {
                    if (await conditionFn()) {
                        clearInterval(checkIntervalId);
                        resolve(true);
                    } else if (Date.now() - startTime > timeout) {
                        clearInterval(checkIntervalId);
                        reject(new Error(`等待条件超时: ${description}`));
                    }
                } catch (e) {
                    clearInterval(checkIntervalId);
                    reject(new Error(`检查条件时发生错误 (${description}): ${e.message}`));
                }
            }, interval);
        });
    }

    /**
     * 等待元素出现并可选地检查其可点击性。
     * @param {string} selector - CSS 选择器。
     * @param {boolean} [checkClickable=false] - 是否检查元素是否可点击。
     * @param {number} [timeout=CONFIG.MAX_ELEMENT_WAIT_TIME] - 等待超时时间。
     * @returns {Promise<Element>} - 找到元素并满足条件则 resolve 元素，否则 reject。
     */
    async function waitForElement(selector, checkClickable = false, timeout = CONFIG.MAX_ELEMENT_WAIT_TIME) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            let checkIntervalId = setInterval(() => {
                const element = document.querySelector(selector);
                if (element && element.offsetParent !== null) { // offsetParent !== null 检查是否在DOM中可见
                    if (checkClickable) {
                        // 检查元素是否在视口内、未被禁用、没有 pointer-events: none 且宽度高度大于0
                        const rect = element.getBoundingClientRect();
                        const isInViewport = rect.top >= 0 && rect.left >= 0 &&
                                             rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                                             rect.right <= (window.innerWidth || document.documentElement.clientWidth);

                        if (!element.disabled &&
                            element.style.pointerEvents !== 'none' &&
                            element.style.visibility !== 'hidden' &&
                            element.offsetWidth > 0 && element.offsetHeight > 0 &&
                            isInViewport) { // 增加检查是否在视口内
                            clearInterval(checkIntervalId);
                            resolve(element);
                            return;
                        }
                    } else {
                        clearInterval(checkIntervalId);
                        resolve(element);
                        return;
                    }
                }

                if (Date.now() - startTime > timeout) {
                    clearInterval(checkIntervalId);
                    reject(new Error(`等待元素超时: '${selector}' (可见/可点击: ${checkClickable})`));
                }
            }, CONFIG.ELEMENT_CHECK_INTERVAL);
        });
    }

    // 安全点击元素 - 带重试机制
    async function safeClickElement(selector, stepName, maxRetries = 3) {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                log(`${stepName} - 尝试第${attempt + 1}次`);
                const element = await waitForElement(selector, true); // 强制检查可点击性

                // 确保 element 是一个真正的 DOM 元素，并且有 scrollIntoView 方法
                if (element && typeof element.scrollIntoView === 'function') {
                    // 滚动到元素位置确保可见
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    await sleep(CONFIG.BUTTON_CLICK_DELAY / 2); // 滚动后短暂等待
                } else {
                    log(`警告: 元素 '${selector}' 无法滚动到视图中或不是一个有效的DOM元素。`, 'WARN');
                }

                // 执行点击
                element.click();
                log(`${stepName} - 点击成功`);
                await sleep(CONFIG.BUTTON_CLICK_DELAY); // 点击后延迟
                return true;

            } catch (error) {
                log(`${stepName} - 第${attempt + 1}次失败: ${error.message}`, 'WARN');
                if (attempt === maxRetries - 1) {
                    throw new Error(`${stepName}失败: ${error.message}`);
                }
                await sleep(1000); // 重试前等待
            }
        }
        return false;
    }

    // 滚动到页面底部以加载所有条目
    async function scrollToPageBottom() {
        log('尝试滚动到页面底部以加载所有条目...');
        let lastScrollHeight = 0; // 初始值为0，以便第一次滚动能触发
        let scrollAttempts = 0;
        const maxScrollAttempts = CONFIG.SCROLL_ATTEMPTS;

        while (scrollAttempts < maxScrollAttempts) {
            window.scrollTo(0, document.documentElement.scrollHeight);
            await sleep(CONFIG.SCROLL_TO_BOTTOM_DELAY); // 滚动后等待内容加载

            const currentScrollHeight = document.documentElement.scrollHeight;
            if (currentScrollHeight === lastScrollHeight) {
                log(`页面已滚动到底部，内容加载完毕 (尝试${scrollAttempts + 1}次)`);
                return;
            }
            lastScrollHeight = currentScrollHeight;
            scrollAttempts++;
            log(`滚动到底部 (尝试${scrollAttempts}次), 页面高度: ${currentScrollHeight}`);
        }
        log(`未能达到页面底部或所有内容未完全加载，已尝试 ${maxScrollAttempts} 次`, 'WARN');
    }

    // 获取搜索结果总数
    function getTotalResults() {
        try {
            const spans = document.querySelectorAll('span');
            for (let span of spans) {
                const text = span.textContent.trim();
                const match = text.match(/\d+(?:,\d+)*\s+of\s+([\d,]+)\s+Results/i);
                if (match) {
                    return parseInt(match[1].replace(/,/g, ''));
                }
            }
            return 0;
        } catch (error) {
            log(`获取结果总数失败:${error.message}`, 'ERROR');
            return 0;
        }
    }

    // 从URL获取当前页码
    function getCurrentPageFromURL() {
        try {
            const url = new URL(window.location.href);
            const offset = parseInt(url.searchParams.get('offset') || '0');
            return Math.floor(offset / CONFIG.ITEMS_PER_PAGE);
        } catch (error) {
            log(`从URL获取当前页码失败: ${error.message}`, 'ERROR');
            return 0;
        }
    }

    // 检查是否为第一页
    function isFirstPage() {
        return getCurrentPageFromURL() === 0;
    }

    // 获取当前页面条目数量
    function getCurrentPageItemCount() {
        // 查找所有结果条目上的“更多选项”按钮，通常每个条目都有一个
        const buttons = document.querySelectorAll('[id^="briefResultMoreOptionsButton"]');
        return buttons.length;
    }

    // 设置每页显示50个条目
    async function setPageSizeTo50() {
        if (state.isPageSizeSet) {
            log('页面大小已设置过，跳过');
            return true;
        }

        try {
            log('开始设置每页显示50个条目');

            // 优先滚动到底部，确保按钮可见且所有条目加载
            await scrollToPageBottom();

            // 点击"Display 50 results per page"按钮
            await safeClickElement(
                'button[aria-label="Display 50 results per page"]',
                '设置每页50个条目',
                3
            );

            // 简单等待页面更新
            await sleep(CONFIG.DOWNLOAD_DELAY * 2); // 给予更长的延迟等待页面重新渲染

            // 重新滚动一次，确保新加载的50个条目全部显示出来
            await scrollToPageBottom();

            state.isPageSizeSet = true;
            log(`页面大小设置完成，当前页面有 ${getCurrentPageItemCount()} 个条目`);
            return true;

        } catch (error) {
            log(`设置页面大小失败: ${error.message}`, 'ERROR');
            state.isPageSizeSet = true; // 即使设置失败也标记为已尝试
            return false;
        }
    }

    // 解析批量RIS数据
    function parseBatchRISData(risText) {
        const records = [];
        const entries = risText.split(/(?=TY\s*-)/).filter(e => e.trim().length > 0);

        for (let entry of entries) {
            const trimmed = entry.trim();
            if (trimmed.startsWith('TY  -') && trimmed.includes('ER  -')) {
                records.push(trimmed);
            } else if (trimmed.startsWith('TY  -') && !trimmed.includes('ER  -')) {
                log('发现一个RIS记录没有ER - 结束符，可能不完整或格式异常，尝试补全', 'WARN');
                records.push(trimmed + '\nER  -');
            } else if (trimmed.includes('TY  -') && trimmed.includes('ER  -') && !trimmed.startsWith('TY  -')) {
                const firstTY = trimmed.indexOf('TY  -');
                if (firstTY !== -1) {
                    records.push(trimmed.substring(firstTY));
                }
            }
        }
        return records;
    }

    // 处理批量RIS数据并按条目输出
    function processBatchRISData(risData) {
        try {
            let records = [];

            if (typeof risData === 'string') {
                records = parseBatchRISData(risData);
            } else {
                log('收到的RIS数据不是字符串类型，无法解析', 'WARN');
                return;
            }

            log(`本次XHR响应解析出 ${records.length} 条RIS记录`);

            state.actualRisCount += records.length;

            for (let i = 0; i < records.length; i++) {
                // globalIndex 的计算基于当前页的起始索引加上已处理的 RIS 数量
                const currentGlobalIndex = (state.currentPage * CONFIG.ITEMS_PER_PAGE) + (state.actualRisCount - records.length) + i;
                outputRIS(records[i], i + 1, state.currentPage + 1, currentGlobalIndex);
            }

            outputProgress();

        } catch (error) {
            log(`处理批量RIS数据失败: ${error.message}`, 'ERROR');
            // 如果解析失败，也应增加 actualRisCount，避免死循环等待
            state.actualRisCount = state.expectedRisCount; // 强行标记为已处理
            outputProgress();
        }
    }

    // 设置XHR拦截器 - 专注于RIS数据
    function setupRISInterception() {
        // 防止重复注入
        if (window.kubikat_ris_interceptor_set) {
            log('RIS拦截器已设置，跳过重复注入', 'INFO');
            return;
        }
        window.kubikat_ris_interceptor_set = true;

        const originalXHRSend = window.XMLHttpRequest.prototype.send;
        const originalXHROpen = window.XMLHttpRequest.prototype.open;

        window.XMLHttpRequest.prototype.open = function(method, url, ...args) {
            this._method = method;
            this._url = url;
            return originalXHROpen.apply(this, [method, url, ...args]);
        };

        window.XMLHttpRequest.prototype.send = function(body) {
            const xhr = this;

            xhr.addEventListener('load', function() {
                const requestUrl = this.responseURL || this._url;

                const isRISExportRequest = requestUrl && (
                    requestUrl.includes('/primaws/rest/pub/edelivery') ||
                    requestUrl.includes('/export') ||
                    requestUrl.includes('exportFormat=ris') ||
                    requestUrl.includes('format=ris') ||
                    (this.responseType === 'text' && this.responseText && (this.responseText.includes('TY  -') || this.responseText.includes('ER  -')))
                );

                if (isRISExportRequest && this.status === 200) {
                    log(`捕获到RIS导出XHR响应 (${this.status})`, 'INFO');
                    try {
                        const responseText = this.responseText;
                        processBatchRISData(responseText);
                    } catch (error) {
                        log(`处理RIS数据响应体失败: ${error.message}`, 'ERROR');
                        state.actualRisCount = state.expectedRisCount; // 强行标记为已处理
                    }
                }
            });

            xhr.addEventListener('error', function() {
                log(`RIS导出XHR请求发生网络错误`, 'ERROR');
                state.actualRisCount = state.expectedRisCount; // 强行标记为已处理
            });

            xhr.addEventListener('abort', function() {
                log(`RIS导出XHR请求被中止`, 'WARN');
                state.actualRisCount = state.expectedRisCount; // 强行标记为已处理
            });

            return originalXHRSend.apply(this, arguments);
        };
    }

    // 批量下载当前页面的RIS文件
    async function downloadBatchRISFiles() {
        const steps = [
            { name: '全选复选框', selector: 'md-checkbox[aria-label="Select all displayed records"]' },
            { name: 'Push to按钮', selector: 'button[aria-label="\\"Push to\\" actions"]' },
            { name: 'RIS导出按钮', selector: 'button#RISPushToButton' },
            { name: '最终下载按钮', selector: 'button[aria-label="Import to Citation Manager - Download"]' }
        ];

        for (let retry = 0; retry < CONFIG.MAX_RETRIES; retry++) {
            try {
                log(`开始批量下载第${state.currentPage + 1}页 - 总尝试第${retry + 1}次`);

                state.actualRisCount = 0;
                state.expectedRisCount = state.currentPageItemCount;
                if (state.expectedRisCount === 0) {
                    log('当前页没有条目，跳过RIS下载', 'WARN');
                    return true;
                }
                log(`当前页期望捕获 ${state.expectedRisCount} 条RIS记录`);

                for (let i = 0; i < steps.length; i++) {
                    const step = steps[i];
                    await safeClickElement(step.selector, step.name, 3);
                    await sleep(CONFIG.BUTTON_CLICK_DELAY);
                }

                log('所有按钮点击完成，等待RIS数据响应并完整处理');

                await waitForCondition(
                    () => state.actualRisCount >= state.expectedRisCount,
                    `所有 ${state.expectedRisCount} 条RIS记录被处理`,
                    CONFIG.RIS_WAIT_TIMEOUT,
                    CONFIG.ELEMENT_CHECK_INTERVAL
                );

                log(`批量下载成功完成，已捕获 ${state.actualRisCount} 条RIS记录`);

                state.downloadedCount += state.actualRisCount;
                outputProgress();
                return true;

            } catch (error) {
                log(`批量下载尝试${retry + 1}失败: ${error.message}`, 'ERROR');

                if (retry === CONFIG.MAX_RETRIES - 1) {
                    log(`放弃批量下载第${state.currentPage + 1}页，RIS数据可能不完整`, 'ERROR');
                    state.downloadedCount += state.actualRisCount;
                    outputProgress();
                    return false;
                }

                await sleep(2000);
                try {
                    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
                    await sleep(500);
                } catch (escError) { /* ignore */ }
            }
        }
        return false;
    }

    // 处理当前页面的所有条目
    async function processCurrentPage() {
        try {
            log(`开始处理第${state.currentPage + 1}页`);

            await scrollToPageBottom(); // 确保所有条目加载

            state.currentPageItemCount = getCurrentPageItemCount();
            log(`当前页面实际加载了 ${state.currentPageItemCount} 个条目`);

            if (state.currentPageItemCount === 0) {
                log('未找到任何条目，当前页处理完成', 'WARN');
                return true;
            }

            const success = await downloadBatchRISFiles();

            if (success) {
                log(`第${state.currentPage + 1}页处理完成`);
            }

            return success;

        } catch (error) {
            log(`处理第${state.currentPage + 1}页失败:${error.message}`, 'ERROR');
            return false;
        }
    }

    // 跳转到下一页
    async function goToNextPage() {
        try {
            state.currentPage++;
            const offset = state.currentPage * CONFIG.ITEMS_PER_PAGE;
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.set('offset', offset.toString());
            setTimeout(startScraping, 128);//防崩溃
            log(`跳转到第${state.currentPage + 1}页 (offset: ${offset})`);
            window.location.href = currentUrl.toString();
            return true;
        } catch (error) {
            log(`跳转到下一页失败:${error.message}`, 'ERROR');
            return false;
        }
    }

    // 主函数：开始自动抓取
    async function startScraping() {
        if (state.isRunning) {
            log('脚本已在运行中，避免重复启动');
            return;
        }

        state.isRunning = true;
        log('脚本开始执行...');

        try {
            setupRISInterception(); // 设置一次 XHR 拦截器

            // 等待页面初始加载稳定
            await waitForCondition(
                () => document.querySelectorAll('[id^="briefResultMoreOptionsButton"]').length > 0 &&
                      document.querySelector('md-checkbox[aria-label="Select all displayed records"]'),
                '页面初始加载并有结果条目',
                CONFIG.MAX_ELEMENT_WAIT_TIME,
                CONFIG.PAGE_LOAD_CHECK_INTERVAL
            );
            log('页面初始加载检测完成。');

            state.totalResults = getTotalResults();
            if (state.totalResults === 0) {
                log('未找到任何搜索结果，任务结束', 'WARN');
                return;
            }
            log(`检测到总计 ${state.totalResults} 个结果`);

            state.currentPage = getCurrentPageFromURL();

            // 如果是第一页，先设置每页显示50个条目
            if (isFirstPage() && !state.isPageSizeSet) {
                log('检测到第一页，尝试设置每页显示50个条目');
                const setPageSizeSuccess = await setPageSizeTo50();
                if (!setPageSizeSuccess) {
                    log('设置页面大小失败，可能导致抓取不完整，但尝试继续', 'WARN');
                }
                state.totalResults = getTotalResults();
                state.totalPages = Math.ceil(state.totalResults / CONFIG.ITEMS_PER_PAGE);
            } else {
                state.totalPages = Math.ceil(state.totalResults / CONFIG.ITEMS_PER_PAGE);
            }

            log(`总页数：${state.totalPages}，当前页：${state.currentPage + 1}`);
            outputProgress();

            if (state.currentPage < state.totalPages) {
                const success = await processCurrentPage();

                if (!success) {
                    log('处理当前页面失败，停止抓取', 'ERROR');
                }

                if (state.currentPage < state.totalPages - 1 && success) {
                    log(`当前页 ${state.currentPage + 1} 处理成功，准备跳转到下一页`);
                    await goToNextPage();
                    return;
                } else if (state.currentPage >= state.totalPages - 1) {
                    log('[COMPLETE]已是最后一页或全部处理完毕。');
                } else {
                    log('当前页处理失败，不再跳转，任务结束。', 'ERROR');
                }
            } else {
                log('当前页码已超出总页数，任务结束。');
            }

            log(`抓取任务完成，总计处理 ${state.downloadedCount} 个条目`);

        } catch (error) {
            log(`抓取过程中发生错误: ${error.message}`, 'ERROR');
        } finally {
            state.isRunning = false;
            outputProgress();
        }
    }

    // 自动启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(startScraping, 100);
        });
    } else {
        setTimeout(startScraping, 100);
    }

    // 暴露状态，方便调试
    window.kubikatScraperState = state;

})();