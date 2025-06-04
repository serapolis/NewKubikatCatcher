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
