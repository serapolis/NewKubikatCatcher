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
import org.json.JSONObject;

import javax.swing.*;
import java.io.File;
import java.io.IOException;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.HashSet;
import java.util.Set;
import java.util.Timer;
import java.util.TimerTask;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

public class browserObject {
    private static CefApp cefApp;
    private static CefClient cefClient;
    public static CefBrowser cefBrowser;
    public static Set<String> risFiles = new HashSet<>();
    private static String projectName;
    public browserObject(){
        CefAppBuilder builder = new CefAppBuilder();
        builder.setInstallDir(new File("jcef-bundle"));
        builder.setProgressHandler(new ConsoleProgressHandler());
        builder.addJcefArgs("--disable-gpu");
        builder.getCefSettings().windowless_rendering_enabled = false;
        builder.setAppHandler(new MavenCefAppHandlerAdapter() {});

        try {
            cefApp = builder.build();
        } catch (IOException | UnsupportedPlatformException | InterruptedException | CefInitializationException e) {
            throw new RuntimeException("[NKC-Java][ERROR]JCEF 初始化失败: " + e.getMessage(), e);
        }

        cefClient = cefApp.createClient();
        cefBrowser = cefClient.createBrowser("https://kubikat.org", false, false);
    }
    private static void setUpHandlers(){
        cefClient.addLoadHandler(new CefLoadHandlerAdapter() {
            /**
             * @param browser
             * @param frame
             * @param transitionType
             */
            @Override
            public void onLoadStart(CefBrowser browser, CefFrame frame, CefRequest.TransitionType transitionType) {
                try {
                    frame.executeJavaScript(Files.readString(Paths.get("mask.js"), StandardCharsets.UTF_8), frame.getURL(), 0);
                    System.out.println("[NKC-Java][INFO]伪装脚本业已注入");
                } catch (IOException e) {
                    System.out.println("[NKC-Java][INFO]伪装脚本注入失败");
                    throw new RuntimeException(e);
                }
            }

            /**
             * @param browser
             * @param frame
             * @param httpStatusCode
             */
            @Override
            public void onLoadEnd(CefBrowser browser, CefFrame frame, int httpStatusCode) {
                try {
                    frame.executeJavaScript(Files.readString(Paths.get("uni.js"), StandardCharsets.UTF_8), frame.getURL(), 0);
                    System.out.println("[NKC-Java][INFO]抓取脚本业已注入");
                } catch (IOException e) {
                    System.out.println("[NKC-Java][INFO]抓取脚本注入失败");
                    throw new RuntimeException(e);
                }
            }
        });

        cefClient.addDisplayHandler(new CefDisplayHandlerAdapter() {
            /**
             * @param browser
             * @param level
             * @param message
             * @param source
             * @param line
             * @return
             */
            @Override
            public boolean onConsoleMessage(CefBrowser browser, CefSettings.LogSeverity level, String message, String source, int line) {
                if (message.contains("[NKC-Javascript-")){
                    System.out.println(message);
                    if (message.contains("[RIS_DATA]")){
                        String risFile = message.substring("[NKC-Javascript-uni][RIS_DATA]".length());
                        if(risFiles.add(risFile)){
                            System.out.println("[NKC-Java][INFO]该条目已作为第 " + risFiles.size() + " 个条目被记录");
                        }else{
                            System.out.println("[NKC-Java][WARN]基于重复的原因，这个条目的信息虽被下载但是未被记录");
                        }
                    }
                    if (message.contains("[PROGRESS]")){
                        JSONObject progressObj = new JSONObject(message.substring("[NKC-Javascript-uni][PROGRESS]".length()));
                        if (progressObj.getInt("totalPages") == 0){
                            frame.progressBar.setString("Catching(Page now processing/Total pages): " + progressObj.getInt("page") + "/--");
                        }else{
                            frame.progressBar.setString("Catching(Page now processing/Total pages): " + progressObj.getInt("page") + "/" + progressObj.getInt("totalPages"));
                        }
                    }
                    if(message.contains("[COMPLETE]")){
                        generateFinalRISFile();
                    }
                }
                return true;
            }
        });
    }
    private static void generateFinalRISFile(){
        Timer generateFinalRISFileTimer = new Timer();
        generateFinalRISFileTimer.schedule(new TimerTask() {
            @Override
            public void run() {
                String finalRISFileContent = String.join("", risFiles);
                finalRISFileContent = finalRISFileContent.lines().filter(line -> Pattern.compile("^[A-Z0-9]{2}  -.*").matcher(line).matches()).map(line -> Pattern.compile("\\\\[nrtbf\\\\\"']").matcher(line).replaceAll("")).collect(Collectors.joining("\n"));
                String jarDir;
                try {
                    jarDir = new File(browserObject.class.getProtectionDomain().getCodeSource().getLocation().toURI()).getParent();
                } catch (URISyntaxException e) {
                    System.out.println("[NKC-Java][ERROR]写入最终RIS文件时出现文件路径上的错误");
                    throw new RuntimeException(e);
                }
                File outputFile = Paths.get(jarDir, projectName + ".ris").toFile();
                try {
                    Files.writeString(outputFile.toPath(), finalRISFileContent, StandardCharsets.UTF_8);
                } catch (IOException e) {
                    System.out.println("[NKC-Java][ERROR]写入最终RIS文件时出现错误");
                    throw new RuntimeException(e);
                }
                System.out.println("[NKC-Java][INFO] 写入完成: " + outputFile.getAbsolutePath());
                JOptionPane.showMessageDialog(frame.frame, "Done. Here is your RIS file:\n" + outputFile.getAbsolutePath(), "INFO", JOptionPane.INFORMATION_MESSAGE);

                frame.URLField.setEnabled(true);
                frame.progressBar.setIndeterminate(false);
                frame.progressBar.setString("Waiting");
                risFiles = new HashSet<>();
                projectName = "";

                System.gc();
            }
        }, 100);
    }
    public void runSearch(String startUrl, String projectName) {
        browserObject.projectName = projectName;
        setUpHandlers();

        cefBrowser.loadURL(startUrl);

        System.out.println("[NKC-Java][INFO]抓取程序已启动");
    }
}
