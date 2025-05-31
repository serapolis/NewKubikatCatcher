package NewKubikatCatcher;

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
import org.cef.handler.CefDisplayHandlerAdapter;
import org.cef.handler.CefLoadHandlerAdapter;
import org.cef.network.CefRequest;

import javax.swing.*;
import java.io.File;
import java.io.IOException;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;


/**
 * 管理搜索与下载的浏览器对象，集成了JCEF的初始化与事件处理。
 */
public class SearchBrowserObject {
    private static CefApp cefApp;
    private static CefClient cefClient;
    public static CefBrowser browser;

    private static boolean isSearchRunning = false;
    private static boolean isDownloadRunning = false;

    private static String projectName;
    private static final List<String> resultRISs = new ArrayList<>();
    private static final List<String> resultURLs = new ArrayList<>();

    public SearchBrowserObject() {
        cefApp = initializeJCEFApp();
        cefClient = cefApp.createClient();
        setupLoadAndDisplayHandlers();
    }

    /**
     * 初始化JCEF应用。
     */
    private CefApp initializeJCEFApp() {
        CefAppBuilder builder = new CefAppBuilder();
        builder.setInstallDir(new File("jcef-bundle"));
        builder.setProgressHandler(new ConsoleProgressHandler());
        builder.addJcefArgs("--disable-gpu");
        builder.getCefSettings().windowless_rendering_enabled = false;
        builder.setAppHandler(new MavenCefAppHandlerAdapter() {});

        try {
            return builder.build();
        } catch (IOException | UnsupportedPlatformException | InterruptedException | CefInitializationException e) {
            throw new RuntimeException("[NKC-Java][ERROR] JCEF 初始化失败: " + e.getMessage(), e);
        }
    }

    /**
     * 创建浏览器实例。
     */
    public void createBrowser(String url) {
        browser = cefClient.createBrowser(url, false, false);
    }

    /**
     * 设置加载与控制台处理器。
     */
    private void setupLoadAndDisplayHandlers() {
        // 页面加载处理器
        cefClient.addLoadHandler(new CefLoadHandlerAdapter() {
            @Override
            public void onLoadStart(CefBrowser browser, CefFrame frame, CefRequest.TransitionType transitionType) {
                if (!frame.isMain()) return;

                injectJavaScript("mask.js", frame, browser.getURL(), "伪装");
            }

            @Override
            public void onLoadEnd(CefBrowser browser, CefFrame frame, int httpStatusCode) {
                if (!frame.isMain()) return;

                if (isSearchRunning) {
                    injectJavaScript("search.js", frame, browser.getURL(), "搜索");
                }
                if (isDownloadRunning) {
                    injectJavaScript("download.js", frame, browser.getURL(), "下载");
                }
            }
        });

        // 控制台输出处理器
        cefClient.addDisplayHandler(new CefDisplayHandlerAdapter() {
            private final Set<String> uniqueURLs = new LinkedHashSet<>();
            private final Set<String> uniqueRISs = new LinkedHashSet<>();
            private int downloadIndex = 0;
            private int waitingCount = 0;

            @Override
            public boolean onConsoleMessage(CefBrowser browser, CefSettings.LogSeverity level, String message, String source, int line) {
                // 搜索链接处理
                if (message.contains("[NKC-Javascript-Search][INFO]LINK:")) {
                    String link = message.substring("[NKC-Javascript-Search][INFO]LINK:".length());
                    if (uniqueURLs.add(link)) {
                        resultURLs.add(link);
                        System.out.println("[NKC-Java][INFO] 记录链接: " + link);
                    }
                    return false;
                }

                // RIS 下载内容处理
                if (message.contains("[NKC-Javascript-Download][DATA]")) {
                    String ris = message.substring("[NKC-Javascript-Download][DATA]".length());
                    if (uniqueRISs.add(ris)) {
                        resultRISs.add(ris);
                        System.out.println("[NKC-Java][INFO] 已下载第 " + resultRISs.size() + " 条RIS 数据");
                    }else {
                        System.out.println("[NKC-Java][WARN] 没有下载 RIS 数据，一般是基于重复的原因");
                    }
                    System.out.println(message);
                    isDownloadRunning = false;
                    return false;
                }

                // 抓取完成后启动下载
                if (message.contains("[NKC-Javascript-Search][INFO]COMPLETED:抓取完成")) {
                    isSearchRunning = false;
                    System.out.println("[NKC-Java][INFO] 抓取完成，共 " + resultURLs.size() + " 条目。");
                    startDownloadTimer();
                    return false;
                }

                return false;
            }

            /**
             * 启动定时器按序列处理下载
             */
            private void startDownloadTimer() {
                Timer timer = new Timer(2000, e -> {
                    if (isDownloadRunning) {
                        waitingCount++;
                        frame.progressBar.setString("Downloading: " + downloadIndex + "/" + resultURLs.size());
                        if (waitingCount >= 8) {
                            waitingCount = 0;
                            System.out.println("[NKC-Java][WARN] 下载超时，重载页面");
                            browser.executeJavaScript("setTimeout(null, 300);window.location.href = '" + resultURLs.get(downloadIndex) + "';", browser.getURL(), 0);
                        }
                        return;
                    }


                    if (downloadIndex >= resultURLs.size()) {
                        ((Timer) e.getSource()).stop();
                        exportFinalRIS();
                        return;
                    }

                    waitingCount = 0;
                    isDownloadRunning = true;
                    String nextUrl = resultURLs.get(downloadIndex);
                    browser.executeJavaScript("window.location.href = '" + nextUrl + "';", browser.getURL(), 0);
                    downloadIndex++;
                });

                timer.start();
            }

            /**
             * 导出最终RIS文件
             */
            private void exportFinalRIS() {
                try {
                    String risContent = String.join("", resultRISs);
                    String jarDir = new File(SearchBrowserObject.class.getProtectionDomain().getCodeSource().getLocation().toURI()).getParent();
                    File outputFile = Paths.get(jarDir, projectName + ".ris").toFile();
                    Files.writeString(outputFile.toPath(), risContent, StandardCharsets.UTF_8);

                    System.out.println("[NKC-Java][INFO] 写入完成: " + outputFile.getAbsolutePath());
                    JOptionPane.showMessageDialog(frame.frame, "Done. Here is your RIS file:\n" + outputFile.getAbsolutePath(), "INFO", JOptionPane.INFORMATION_MESSAGE);

                    frame.URLField.setEnabled(true);
                    frame.progressBar.setIndeterminate(false);
                    frame.progressBar.setString("Waiting");
                } catch (IOException | URISyntaxException ex) {
                    throw new RuntimeException("导出 RIS 文件失败", ex);
                }
            }
        });
    }

    /**
     * 注入 JS 脚本文件
     */
    private void injectJavaScript(String filename, CefFrame frame, String url, String label) {
        try {
            String script = Files.readString(Paths.get(filename), StandardCharsets.UTF_8);
            frame.executeJavaScript(script, url, 0);
            System.out.println("[NKC-Java][INFO] " + label + "脚本已注入: " + filename);
        } catch (IOException e) {
            System.err.println("[NKC-Java][ERROR] 注入 " + label + "脚本失败: " + filename);
        }
    }

    /**
     * 启动搜索流程
     */
    public void runSearch(String startUrl, String projName) {
        projectName = projName;
        isSearchRunning = true;
        resultRISs.clear();
        resultURLs.clear();
        browser.loadURL(startUrl);
        System.out.println("[NKC-Java][INFO] 启动搜索: " + startUrl);
    }
}
