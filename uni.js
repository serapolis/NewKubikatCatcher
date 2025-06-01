// JCEF Kubikat自动抓取脚本 - 精简版
// 专注于XHR方式的RIS数据抓取

(function() {
    'use strict';

    // 配置常量
    const CONFIG = {
        LOG_PREFIX: '[NKC-Javascript-uni]',
        ELEMENT_CHECK_INTERVAL: 128,
        MAX_ELEMENT_WAIT_TIME: 16384,
        DOWNLOAD_DELAY: 1024,
        PAGE_LOAD_CHECK_INTERVAL: 128,
        MAX_RETRIES: 8,
        ITEMS_PER_PAGE: 10,
        RIS_WAIT_TIMEOUT: 512
    };

    // 全局状态
    let state = {
        currentPage: 0,
        totalResults: 0,
        totalPages: 0,
        downloadedCount: 0,
        isRunning: false,
        currentItemIndex: 0,
        pendingRISDownload: null
    };

    // 简化日志输出
    function log(message, type = 'INFO') {
        if (type === 'ERROR' || type === 'WARN') {
            console.log(`${CONFIG.LOG_PREFIX}[${type}]${message}`);
        }
    }

    // 输出RIS数据
    function outputRIS(risData, itemIndex, pageNumber, globalIndex) {
        console.log(`${CONFIG.LOG_PREFIX}[RIS_DATA]${risData}`);
    }

    // 输出进度信息
    function outputProgress() {
        const progress = {
            page: state.currentPage + 1,
            totalPages: state.totalPages,
            downloaded: state.downloadedCount,
            total: state.totalResults
        };
        console.log(`${CONFIG.LOG_PREFIX}[PROGRESS]${JSON.stringify(progress)}`);
    }

    // 等待元素出现
    function waitForElement(selector, timeout = CONFIG.MAX_ELEMENT_WAIT_TIME) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            function checkElement() {
                const element = document.querySelector(selector);
                if (element && element.offsetParent !== null) {
                    resolve(element);
                    return;
                }

                if (Date.now() - startTime > timeout) {
                    reject(new Error(`等待元素超时: ${selector}`));
                    return;
                }

                setTimeout(checkElement, CONFIG.ELEMENT_CHECK_INTERVAL);
            }

            checkElement();
        });
    }

    // 等待页面加载
    function waitForPageLoad() {
        return new Promise((resolve) => {
            function checkPageReady() {
                const resultElements = document.querySelectorAll('[id^="briefResultMoreOptionsButton"]');
                if (resultElements.length > 0) {
                    resolve();
                    return;
                }
                setTimeout(checkPageReady, CONFIG.PAGE_LOAD_CHECK_INTERVAL);
            }
            checkPageReady();
        });
    }

    // 延迟函数
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
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
            return 0;
        }
    }

    // 获取当前页面按钮ID
    function getCurrentPageButtonIds() {
        const buttons = document.querySelectorAll('[id^="briefResultMoreOptionsButton"]');
        const ids = Array.from(buttons).map(button => {
            const match = button.id.match(/briefResultMoreOptionsButton(\d+)/);
            return match ? parseInt(match[1]) : null;
        }).filter(id => id !== null).sort((a, b) => a - b);

        return ids;
    }

    // 等待RIS数据响应
    function waitForRISData(timeout = CONFIG.RIS_WAIT_TIMEOUT) {
        return new Promise((resolve, reject) => {
            state.pendingRISDownload = { resolve, reject };
            setTimeout(() => {
                if (state.pendingRISDownload && state.pendingRISDownload.resolve === resolve) {
                    state.pendingRISDownload = null;
                    reject(new Error('等待RIS数据超时'));
                }
            }, timeout);
        });
    }

    // 设置XHR拦截器 - 专注于RIS数据
    function setupRISInterception() {
        const originalXHRSend = window.XMLHttpRequest.prototype.send;
        const originalXHROpen = window.XMLHttpRequest.prototype.open;

        // 拦截XHR open方法
        window.XMLHttpRequest.prototype.open = function(method, url, ...args) {
            this._method = method;
            this._url = url;
            return originalXHROpen.apply(this, [method, url, ...args]);
        };

        // 拦截XHR send方法
        window.XMLHttpRequest.prototype.send = function(body) {
            const xhr = this;

            xhr.addEventListener('load', function() {
                const requestUrl = this.responseURL || this._url;

                // 检查是否为RIS请求
                const isRISRequest = requestUrl && (
                    requestUrl.includes('/primaws/rest/pub/edelivery') ||
                    requestUrl.includes('edelivery') ||
                    requestUrl.includes('/export') ||
                    requestUrl.includes('exportFormat=ris') ||
                    requestUrl.includes('format=ris')
                );

                if (isRISRequest && this.status === 200) {
                    try {
                        const responseText = this.responseText;

                        // 尝试解析JSON格式
                        try {
                            const data = JSON.parse(responseText);
                            if (data.data) {
                                const globalIndex = state.currentPage * CONFIG.ITEMS_PER_PAGE + state.currentItemIndex;
                                outputRIS(data.data, state.currentItemIndex, state.currentPage + 1, globalIndex);
                                state.downloadedCount++;
                                outputProgress();

                                if (state.pendingRISDownload) {
                                    state.pendingRISDownload.resolve(data.data);
                                    state.pendingRISDownload = null;
                                }
                            }
                        } catch (jsonError) {
                            // 如果不是JSON，检查是否是直接的RIS文本
                            if (responseText.includes('TY  -') || responseText.includes('ER  -')) {
                                const globalIndex = state.currentPage * CONFIG.ITEMS_PER_PAGE + state.currentItemIndex;
                                outputRIS(responseText, state.currentItemIndex, state.currentPage + 1, globalIndex);
                                state.downloadedCount++;
                                outputProgress();

                                if (state.pendingRISDownload) {
                                    state.pendingRISDownload.resolve(responseText);
                                    state.pendingRISDownload = null;
                                }
                            }
                        }
                    } catch (error) {
                        log(`处理RIS数据失败: ${error.message}`, 'ERROR');
                    }
                }
            });

            return originalXHRSend.apply(this, arguments);
        };
    }

    // 下载单个条目的RIS文件
    async function downloadRISFile(buttonId, itemIndex) {
        state.currentItemIndex = itemIndex;

        for (let retry = 0; retry < CONFIG.MAX_RETRIES; retry++) {
            try {
                // 点击更多选项按钮
                const moreOptionsSelector = `#briefResultMoreOptionsButton${buttonId}`;
                const moreOptionsButton = await waitForElement(moreOptionsSelector);
                moreOptionsButton.click();

                await sleep(800);

                // 点击导出RIS按钮
                const exportButton = await waitForElement('button[aria-label="Export RIS"]');
                exportButton.click();

                await sleep(1000);

                // 点击下载按钮
                const downloadButton = await waitForElement('button[aria-label="Import to Citation Manager - Download"]');
                downloadButton.click();

                // 等待RIS数据响应
                try {
                    await waitForRISData();
                    return true;
                } catch (waitError) {
                    await sleep(CONFIG.DOWNLOAD_DELAY);
                    return true; // 继续处理，数据可能已在后台获取
                }

            } catch (error) {
                if (retry === CONFIG.MAX_RETRIES - 1) {
                    log(`放弃下载条目ID:${buttonId}`, 'ERROR');
                    return false;
                }
                await sleep(2000);
            }
        }

        return false;
    }

    // 处理当前页面的所有条目
    async function processCurrentPage() {
        try {
            await waitForPageLoad();
            const buttonIds = getCurrentPageButtonIds();

            if (buttonIds.length === 0) {
                throw new Error('未找到任何条目按钮');
            }

            for (let i = 0; i < buttonIds.length; i++) {
                if (!state.isRunning) return false;
                await downloadRISFile(buttonIds[i], i + 1);
            }

            return true;

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
            window.location.href = currentUrl.toString();
            return true;
        } catch (error) {
            log(`跳转到下一页失败:${error.message}`, 'ERROR');
            return false;
        }
    }

    // 主函数：开始自动抓取
    async function startScraping() {
        if (state.isRunning) return;

        state.isRunning = true;

        try {
            setupRISInterception();
            await waitForPageLoad();

            state.totalResults = getTotalResults();
            if (state.totalResults === 0) {
                throw new Error('未找到搜索结果');
            }

            state.totalPages = Math.ceil(state.totalResults / CONFIG.ITEMS_PER_PAGE);
            state.currentPage = getCurrentPageFromURL();

            outputProgress();

            // 主循环：处理每页
            while (state.currentPage < state.totalPages && state.isRunning) {
                const success = await processCurrentPage();

                if (!success) {
                    log('处理当前页面失败，停止抓取', 'ERROR');
                    break;
                }

                if (state.currentPage < state.totalPages - 1) {
                    await goToNextPage();
                    return;
                } else {
                    break;
                }
            }

            console.log(`${CONFIG.LOG_PREFIX}[COMPLETE]抓取任务完成，总计处理${state.downloadedCount}个条目`);

        } catch (error) {
            console.log(`${CONFIG.LOG_PREFIX}[ERROR]抓取过程中发生错误:${error.message}`);
        } finally {
            state.isRunning = false;
        }
    }

    // 自动启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { //不必要的等待，注入时已经在加载完成后注入
            setTimeout(startScraping, 1);
        });
    } else {
        setTimeout(startScraping, 1);
    }

    window.kubikatScraperState = state;

})();