package NewKubikatCatcher;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import java.awt.*;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;

public class frame {

    public static JFrame frame;
    public static JPanel mainPanel;
    public static JTextField URLField;
    public static JProgressBar progressBar;
    public static String projectName = "";

    public frame(browserObject browserObj){
        createJFrame(browserObj);
    }

    private static void createJFrame(browserObject browserObj){

        frame = new JFrame();
        mainPanel = new JPanel(); // 只初始化一次 mainPanel
        URLField = new JTextField(); // 只初始化一次 URLField

        frame.setTitle("NewKubikatCatcher");
        frame.setResizable(false);
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        frame.setBounds(100, 100, 1000, 618);

        JToolBar toolBar = new JToolBar();
        toolBar.setFloatable(false);

        JButton nameProjectButton = new JButton("Name the project");
        nameProjectButton.addActionListener(new ActionListener() {
            public void actionPerformed(ActionEvent e) {
                frameSwingWorkers.setProjectNameSwingWorker setProjectNameSwingWorker = new frameSwingWorkers.setProjectNameSwingWorker(NewKubikatCatcher.frame.frame);
                setProjectNameSwingWorker.execute();
            }
        });
        toolBar.add(nameProjectButton);

        URLField.setToolTipText("Kubikat's Search's URL");
        toolBar.add(URLField);
        URLField.setEnabled(true);
        URLField.setColumns(10);

        JButton runButton = new JButton("Run the project");
        runButton.addActionListener(new ActionListener() {
            public void actionPerformed(ActionEvent e) {
                frameSwingWorkers.setKubikatURLSwingWorker setKubikatURLSwingWorker = new frameSwingWorkers.setKubikatURLSwingWorker(URLField.getText(), projectName, frame, URLField, progressBar, browserObj);
                setKubikatURLSwingWorker.execute();
            }
        });
        toolBar.add(runButton);

        JButton aboutButton = new JButton("About");
        aboutButton.addActionListener(new ActionListener() {
            public void actionPerformed(ActionEvent e) {
                JOptionPane.showMessageDialog(frame, "NewKubikatCatcher(V1.8), by SORAMI Miyabitama, \nwhich is under the MIT license, adopting those open-sourse softweres:\nOpenJDK\nJCEF\nJSON-java", "About", JOptionPane.PLAIN_MESSAGE);
            }
        });
        toolBar.add(aboutButton);

        // 创建一个用于放置工具栏和进度条的面板
        JPanel topPanel = new JPanel(new BorderLayout());
        topPanel.add(toolBar, BorderLayout.NORTH); // 工具栏在顶部

        progressBar = new JProgressBar();
        progressBar.setString("Waiting");
        progressBar.setIndeterminate(false);
        progressBar.setStringPainted(true);
        topPanel.add(progressBar, BorderLayout.SOUTH); // 进度条在工具栏下方

        mainPanel.setBorder(new EmptyBorder(5, 5, 5, 5));
        mainPanel.setLayout(new BorderLayout(0, 0));

        // 将包含工具栏和进度条的面板添加到 mainPanel 的北部
        mainPanel.add(topPanel, BorderLayout.NORTH);

        // 将浏览器组件添加到 mainPanel 的中心
        if (browserObj != null && browserObj.cefBrowser != null) {
            mainPanel.add(browserObj.cefBrowser.getUIComponent(), BorderLayout.CENTER);
        } else {
            // 处理 browserObj 或 cefBrowser 为 null 的情况，例如添加一个占位符
            mainPanel.add(new JLabel("Browser component is not available."), BorderLayout.CENTER);
        }

        frame.setContentPane(mainPanel); // 将 mainPanel 设置为 JFrame 的内容面板
        frame.setVisible(true); // 使框架可见
    }
}