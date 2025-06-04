// JCEF Demo: 拦截并替换 bundle.js 的内容
// 编译运行前请确保已配置 JCEF 运行环境

import me.friwi.jcefmaven.CefAppBuilder;
import me.friwi.jcefmaven.CefInitializationException;
import me.friwi.jcefmaven.MavenCefAppHandlerAdapter;
import me.friwi.jcefmaven.UnsupportedPlatformException;
import me.friwi.jcefmaven.impl.progress.ConsoleProgressHandler;
import org.cef.CefApp;
import org.cef.CefClient;
import org.cef.CefSettings;
import org.cef.browser.CefBrowser;
import org.cef.browser.CefFrame;
import org.cef.callback.CefCallback;
import org.cef.handler.CefDisplayHandlerAdapter;
import org.cef.handler.CefRequestHandlerAdapter;
import org.cef.handler.CefResourceHandler;
import org.cef.handler.CefResourceRequestHandlerAdapter;
import org.cef.misc.BoolRef;
import org.cef.misc.IntRef;
import org.cef.misc.StringRef;
import org.cef.network.CefRequest;

import javax.swing.*;
import java.awt.*;
import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;

public class JcefBundleInterceptDemo {
    public static void main(String[] args) {
        CefAppBuilder builder = new CefAppBuilder();
        builder.setInstallDir(new File("jcef-bundle"));
        builder.setProgressHandler(new ConsoleProgressHandler());
        builder.addJcefArgs("--disable-gpu");
        builder.getCefSettings().windowless_rendering_enabled = false;
        builder.setAppHandler(new MavenCefAppHandlerAdapter() {});

        CefApp cefApp;

        try {
            cefApp = builder.build();
        } catch (IOException | UnsupportedPlatformException | InterruptedException | CefInitializationException e) {
            throw new RuntimeException("[NKC-Java][ERROR]JCEF 初始化失败: " + e.getMessage(), e);
        }

        CefClient client = cefApp.createClient();
        CefBrowser browser = client.createBrowser("https://www.kubikat.org/discovery/search?query=any,contains,warburg&tab=LibraryCatalog&search_scope=MyInstitution&vid=49MPG_KUBIKAT:VU1&offset=0&lang=en", false, false);
        client.addDisplayHandler(new CefDisplayHandlerAdapter() {
            @Override
            public boolean onConsoleMessage(CefBrowser browser, CefSettings.LogSeverity level, String message, String source, int line) {
                System.out.println(message);
                return false;
            }
        });

        // 注册资源拦截器
        client.addRequestHandler(new CefRequestHandlerAdapter() {
            @Override
            public CefResourceRequestHandlerAdapter getResourceRequestHandler(CefBrowser browser, CefFrame frame, CefRequest request, boolean isNavigation, boolean isDownload, String requestInitiator, BoolRef disableDefaultHandling) {
                return new CefResourceRequestHandlerAdapter() {
                    @Override
                    public CefResourceHandler getResourceHandler(CefBrowser browser, CefFrame frame, CefRequest request) {
                        String url = request.getURL();
                        if (url.contains("lib/bundle.js")) {
                            System.out.println("[JCEF] Intercepting: " + url);
                            try {
                                String jsCode = Files.readString(Paths.get("bundle.js"), StandardCharsets.UTF_8);
                                return new MemoryJsHandler(jsCode);
                            } catch (IOException e) {
                                throw new RuntimeException(e);
                            }
                        }
                        return null;
                    }
                };
            }
        });

        // 创建浏览器
        Component browserUI = browser.getUIComponent();
        // 假设 browser 是你已创建的 CefBrowser 实例


        JFrame frame = new JFrame("JCEF Patch Demo");
        frame.getContentPane().add(browserUI);
        frame.setSize(1280, 720);
        frame.setVisible(true);
        frame.setDefaultCloseOperation(WindowConstants.EXIT_ON_CLOSE);
    }

    // 内存资源处理器：返回任意 JS 代码
    public static class MemoryJsHandler implements CefResourceHandler {
        private final byte[] data;
        private int offset = 0;

        public MemoryJsHandler(String jsContent) {
            this.data = jsContent.getBytes(StandardCharsets.UTF_8);
        }

        @Override
        public boolean processRequest(org.cef.network.CefRequest request, CefCallback callback) {
            offset = 0;  // 每次新请求重置偏移
            callback.Continue();
            return true;
        }

        @Override
        public void getResponseHeaders(org.cef.network.CefResponse response, IntRef response_length, StringRef redirectUrl) {
            response.setStatus(200);
            response.setMimeType("application/javascript");
            response_length.set(data.length);
        }

        @Override
        public boolean readResponse(byte[] buffer, int bytesToRead, IntRef bytesRead, CefCallback callback) {
            int bytesLeft = data.length - offset;
            if (bytesLeft <= 0) {
                bytesRead.set(0);
                return false; // 读完了
            }
            int length = Math.min(bytesLeft, bytesToRead);
            System.arraycopy(data, offset, buffer, 0, length);
            offset += length;
            bytesRead.set(length);
            return true; // 还有数据
        }

        /**
         *
         */
        @Override
        public void cancel() {
            //
        }
    }
}
