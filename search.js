// Kubikat智能抓取脚本（优化版）
(function() {
    'use strict';

    const SEPARATOR = '[NKC-Javascript-Search]';
    const POLL_INTERVAL = 1000; // 轮询间隔1000ms
    const MAX_RETRIES = 32; // 最多重试32次

    let retryCount = 0;

    // 获取页面信息（处理逗号分隔的数字）
    function getPageInfo() {
        const spans = document.getElementsByTagName('span');
        for (let span of spans) {
            const text = span.textContent.trim();
            // 匹配各种格式：1-10 of 11,939 Results 或 991-1,000 of 11,939 Results均可
            const match = text.match(/([\d,]+)-([\d,]+)\s+of\s+([\d,]+)\s+Results/i);
            if (match) {
                return {
                    startNum: parseInt(match[1].replace(/,/g, '')),
                    endNum: parseInt(match[2].replace(/,/g, '')),
                    totalResults: parseInt(match[3].replace(/,/g, ''))
                };
            }
        }
        return null;
    }

    // 提取条目链接
    function extractItemLinks() {
        const links = [];
        const aElements = document.getElementsByTagName('a');
        for (let a of aElements) {
            const href = a.getAttribute('href');
            if (href && href.startsWith('https://www.kubikat.org/discovery/fulldisplay?docid=')) {
                links.push(href);
            }
        }
        return links;
    }

    // 获取下一页URL
    function getNextPageUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const currentOffset = parseInt(urlParams.get('offset') || '0');
        const nextOffset = currentOffset + 10;
        const url = new URL(window.location.href);
        url.searchParams.set('offset', nextOffset.toString());
        return url.toString();
    }

    // 主处理函数（带重试机制）
    function tryProcessPage() {
        const pageInfo = getPageInfo();
        const links = extractItemLinks();

        // 检查是否成功获取到数据
        if (!pageInfo && retryCount < MAX_RETRIES) {
            retryCount++;
            console.log(`${SEPARATOR}[WARN]RETRY:第${retryCount}次尝试，未找到页面信息`);
            setTimeout(tryProcessPage, POLL_INTERVAL);
            return;
        }

        if (links.length === 0 && retryCount < MAX_RETRIES) {
            retryCount++;
            console.log(`${SEPARATOR}[WARN]RETRY:第${retryCount}次尝试，未找到链接`);
            setTimeout(tryProcessPage, POLL_INTERVAL);
            return;
        }

        // 重试次数用完但仍无数据
        if (!pageInfo) {
            console.log(`${SEPARATOR}[ERROR]ERROR:重试${MAX_RETRIES}次后仍无法获取页面信息`);
            return;
        }

        // 成功获取数据
        const currentOffset = parseInt(new URLSearchParams(window.location.search).get('offset') || '0');
        console.log(`${SEPARATOR}[INFO]PAGE_INFO:offset=${currentOffset}，显示${pageInfo.startNum}-${pageInfo.endNum}，总共${pageInfo.totalResults}个结果`);
        console.log(`${SEPARATOR}[INFO]LINKS_COUNT:${links.length}${SEPARATOR}`);

        // 输出所有链接
        links.forEach(link => {
            console.log(`${SEPARATOR}[INFO]LINK:${link}`);
        });

        // 判断是否完成或继续下一页
        if (pageInfo.endNum >= pageInfo.totalResults) {
            console.log(`${SEPARATOR}[INFO]COMPLETED:抓取完成，共处理${pageInfo.totalResults}个结果`);
        } else {
            const nextUrl = getNextPageUrl();
            console.log(`${SEPARATOR}[INFO]NEXT_PAGE:${nextUrl}`);
            setTimeout(() => window.location.href = nextUrl, 1000);
        }
    }

    // 启动
    console.log(`${SEPARATOR}[INFO]SCRIPT_START:开始智能抓取`);
    tryProcessPage();

})();