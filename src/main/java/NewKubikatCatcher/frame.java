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
        frame.setBounds(100, 100, 1000, 618);

        JMenuBar menuBar = new JMenuBar();
        frame.setJMenuBar(menuBar);

        JMenu menuList = new JMenu("Operations");
        menuBar.add(menuList);

        JMenuItem nameProjectButton = new JMenuItem("Name the project");
        nameProjectButton.addActionListener(new ActionListener() {
            public void actionPerformed(ActionEvent e) {
                frameSwingWorkers.setProjectNameSwingWorker setProjectNameSwingWorker = new frameSwingWorkers.setProjectNameSwingWorker(NewKubikatCatcher.frame.frame);
                setProjectNameSwingWorker.execute();
            }
        });
        menuList.add(nameProjectButton);

        JMenuItem runButton = new JMenuItem("Run the project");
        runButton.addActionListener(new ActionListener() {
            public void actionPerformed(ActionEvent e) {
               frameSwingWorkers.setKubikatURLSwingWorker setKubikatURLSwingWorker = new frameSwingWorkers.setKubikatURLSwingWorker(URLField.getText(), projectName, frame, URLField, progressBar, browserObj);
               setKubikatURLSwingWorker.execute();
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
