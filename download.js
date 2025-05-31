// RIS文件自动提取脚本（完善版）
(function() {
    'use strict';

    const SEPARATOR = '[NKC-Javascript-Download]';
    const POLL_INTERVAL = 512; // 轮询间隔512毫秒
    const MAX_RETRIES = 64; // 最多重试54次

    let step1Retries = 0; // 步骤1重试计数器
    let step2Retries = 0; // 步骤2重试计数器

    /**
     * 拦截fetch请求来捕获blob数据
     * 当页面发起网络请求时，检查是否是RIS相关的下载请求
     */
    function interceptFetch() {
        const originalFetch = window.fetch;

        window.fetch = async function(...args) {
            const response = await originalFetch.apply(this, args);

            // 检查请求URL是否与RIS或引用管理相关
            const url = args[0];
            if (typeof url === 'string' && (url.includes('ris') || url.includes('citation') || url.includes('export'))) {
                try {
                    // 克隆响应以避免消耗原始响应流
                    const clonedResponse = response.clone();
                    const text = await clonedResponse.text();

                    // 尝试解析为JSON格式
                    try {
                        const jsonData = JSON.parse(text);
                        if (jsonData.data) {
                            console.log(`${SEPARATOR}[INFO]RIS数据提取成功`);
                            console.log(`${SEPARATOR}[DATA]${jsonData.data}`);
                            return response;
                        }
                    } catch (parseError) {
                        // 如果不是JSON，检查是否直接是RIS格式文本
                        if (text.includes('TY  -') || text.includes('ER  -')) {
                            console.log(`${SEPARATOR}[INFO]RIS数据提取成功（纯文本格式）`);
                            console.log(`${SEPARATOR}[DATA]${text}`);
                            return response;
                        }
                    }
                } catch (error) {
                    console.log(`${SEPARATOR}[ERROR]拦截fetch响应时出错: ${error.message}`);
                }
            }

            return response;
        };
    }

    /**
     * 拦截XMLHttpRequest请求
     * 用于捕获可能通过XHR发起的RIS下载请求
     */
    function interceptXHR() {
        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSend = XMLHttpRequest.prototype.send;

        // 重写open方法来记录请求URL
        XMLHttpRequest.prototype.open = function(method, url, ...args) {
            this._url = url; // 保存URL以供后续检查
            return originalOpen.apply(this, [method, url, ...args]);
        };

        // 重写send方法来监听响应
        XMLHttpRequest.prototype.send = function(...args) {
            this.addEventListener('load', function() {
                // 检查是否是RIS相关的请求
                if (this._url && (this._url.includes('ris') || this._url.includes('citation') || this._url.includes('export'))) {
                    try {
                        const text = this.responseText;

                        // 尝试解析JSON格式
                        try {
                            const jsonData = JSON.parse(text);
                            if (jsonData.data) {
                                console.log(`${SEPARATOR}[INFO]RIS数据提取成功（XHR）`);
                                console.log(`${SEPARATOR}[DATA]${jsonData.data}`);
                                return;
                            }
                        } catch (parseError) {
                            // 检查是否是纯RIS格式
                            if (text.includes('TY  -') || text.includes('ER  -')) {
                                console.log(`${SEPARATOR}[INFO]RIS数据提取成功（XHR纯文本格式）`);
                                console.log(`${SEPARATOR}[DATA]${text}`);
                                return;
                            }
                        }
                    } catch (error) {
                        console.log(`${SEPARATOR}[ERROR]处理XHR响应时出错: ${error.message}`);
                    }
                }
            });
            return originalSend.apply(this, args);
        };
    }

    /**
     * 步骤1：查找并点击RIS导出按钮
     * 查找aria-label="Export RIS"或id="RISPushToButtonFullView"的元素
     */
    function tryClickRISExportButton() {
        let exportButton = null;

        // 方法1：通过aria-label查找
        const allElements = document.querySelectorAll('*[aria-label="Export RIS"]');
        if (allElements.length > 0) {
            exportButton = allElements[0];
        }

        // 方法2：通过id查找（如果方法1没找到）
        if (!exportButton) {
            exportButton = document.getElementById('RISPushToButtonFullView');
        }

        // 如果还没找到且未超过重试次数，继续重试
        if (!exportButton && step1Retries < MAX_RETRIES) {
            step1Retries++;
            console.log(`${SEPARATOR}[WARN]第${step1Retries}次尝试查找RIS导出按钮`);
            setTimeout(tryClickRISExportButton, POLL_INTERVAL);
            return;
        }

        // 重试次数用完仍未找到
        if (!exportButton) {
            console.log(`${SEPARATOR}[ERROR]重试${MAX_RETRIES}次后仍未找到RIS导出按钮`);
            return;
        }

        // 成功找到按钮，点击它
        console.log(`${SEPARATOR}[INFO]找到RIS导出按钮，准备点击`);
        exportButton.click();

        // 等待一小段时间后开始查找下载按钮
        setTimeout(tryClickDownloadButton, POLL_INTERVAL);
    }

    /**
     * 步骤2：查找并点击下载按钮
     * 查找aria-label="Import to Citation Manager - Download"的button元素
     */
    function tryClickDownloadButton() {
        const buttons = document.getElementsByTagName('button');
        let downloadButton = null;

        // 遍历所有button元素查找目标按钮
        for (let button of buttons) {
            if (button.getAttribute('aria-label') === 'Import to Citation Manager - Download') {
                downloadButton = button;
                break;
            }
        }

        // 如果没找到且未超过重试次数，继续重试
        if (!downloadButton && step2Retries < MAX_RETRIES) {
            step2Retries++;
            console.log(`${SEPARATOR}[WARN]第${step2Retries}次尝试查找下载按钮`);
            setTimeout(tryClickDownloadButton, POLL_INTERVAL);
            return;
        }

        // 重试次数用完仍未找到
        if (!downloadButton) {
            console.log(`${SEPARATOR}[ERROR]重试${MAX_RETRIES}次后仍未找到下载按钮`);
            return;
        }

        // 成功找到下载按钮，点击它
        console.log(`${SEPARATOR}[INFO]找到下载按钮，准备点击`);
        downloadButton.click();

        // 等待一段时间让下载请求完成
        setTimeout(() => {
            console.log(`${SEPARATOR}[INFO]RIS提取流程执行完成，等待数据捕获`);
        }, 2000);
    }

    /**
     * 初始化函数
     * 设置网络拦截器并开始执行提取流程
     */
    function initialize() {
        console.log(`${SEPARATOR}[INFO]RIS自动提取脚本已启动`);

        // 设置网络请求拦截器
        interceptFetch();
        interceptXHR();
        console.log(`${SEPARATOR}[INFO]网络拦截器已设置完成`);

        // 开始执行步骤1：查找并点击RIS导出按钮
        tryClickRISExportButton();
    }

    // 根据文档加载状态决定何时初始化
    if (document.readyState === 'loading') {
        // 如果文档还在加载中，等待DOM内容加载完成
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        // 如果文档已加载完成，直接初始化
        initialize();
    }

})();