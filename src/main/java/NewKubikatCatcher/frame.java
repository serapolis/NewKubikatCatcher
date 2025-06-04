package NewKubikatCatcher;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import java.awt.*;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.util.Objects;

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
        mainPanel = new JPanel();
        URLField = new JTextField();

        frame.setTitle("NewKubikatCatcher");
        frame.setResizable(false);
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        frame.setBounds(100, 100, 720, 445);

        JMenuBar menuBar = new JMenuBar();
        frame.setJMenuBar(menuBar);

        JMenu menuList = new JMenu("Operations");
        menuBar.add(menuList);

        JMenuItem nameProjectButton = new JMenuItem("Name the project");
        nameProjectButton.addActionListener(new ActionListener() {
            public void actionPerformed(ActionEvent e) {
                projectName = JOptionPane.showInputDialog(frame, "Please provide with the name of the project:", "Name the project", JOptionPane.PLAIN_MESSAGE);
                System.out.println("[NKC-Java][INFO]项目名称已设置： " + projectName);
                if (!projectName.matches("^[a-zA-Z0-9]+$")){
                    JOptionPane.showMessageDialog(frame, "You should set the name of the project with only Arabic numbers and English letters.", "Error", JOptionPane.ERROR_MESSAGE);
                    projectName = "";
                }
            }
        });
        menuList.add(nameProjectButton);

        JMenuItem runButton = new JMenuItem("Run the project");
        runButton.addActionListener(new ActionListener() {
            public void actionPerformed(ActionEvent e) {
                String URL = URLField.getText();
                if (Objects.equals(projectName, "")){
                    JOptionPane.showMessageDialog(frame, "You have not set a name for the current project!", "Error", JOptionPane.ERROR_MESSAGE);
                    return;
                }
                if (!URL.contains("&lang=en")){ //如果用户输入的Kubikat链接的页面不是英文版本的，则拒绝之
                    JOptionPane.showMessageDialog(frame, "You should give me the English version of the Kubikat's Search page!", "Error", JOptionPane.ERROR_MESSAGE);
                    return;
                }
                if (!URL.contains("&offset=")){ //如果用户输入的Kubikat链接的页面没有当前页数，则拒绝之
                    JOptionPane.showMessageDialog(frame, "You should give me the full link!", "Error", JOptionPane.ERROR_MESSAGE);
                    return;
                }
                URLField.setEnabled(false);
                JOptionPane.showMessageDialog(frame, "The search will start, and I will downloading RIS files and combine them after the search.", "Info", JOptionPane.PLAIN_MESSAGE);
                progressBar.setIndeterminate(true);
                browserObj.runSearch(URL, projectName);
            }
        });
        menuList.add(runButton);

        JMenuItem aboutButton = new JMenuItem("About");
        aboutButton.addActionListener(new ActionListener() {
            public void actionPerformed(ActionEvent e) {
                JOptionPane.showMessageDialog(frame, "NewKubikatCatcher(V1.4), by SORAMI Miyabitama, \nwhich is under the MIT license, adopting those open-sourse softweres:\nOpenJDK\nJCEF\nJSON-java", "About", JOptionPane.PLAIN_MESSAGE);
            }
        });
        menuList.add(aboutButton);

        URLField = new JTextField();
        URLField.setToolTipText("Kubikat's Search's URL");
        menuBar.add(URLField);
        URLField.setEnabled(true);
        URLField.setColumns(10);

        mainPanel = new JPanel();
        mainPanel.setBorder(new EmptyBorder(5, 5, 5, 5));

        frame.setContentPane(mainPanel);
        mainPanel.setLayout(new BorderLayout(0, 0));

        frame.getContentPane().add(browserObj.cefBrowser.getUIComponent(), BorderLayout.CENTER);

        progressBar = new JProgressBar();
        progressBar.setString("Waiting");
        progressBar.setIndeterminate(false);
        progressBar.setStringPainted(true);
        mainPanel.add(progressBar, BorderLayout.NORTH);
    }
}
