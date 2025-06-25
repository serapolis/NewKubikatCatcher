package NewKubikatCatcher;

import javax.swing.*;
import java.util.Objects;

public class frameSwingWorkers {
    public static class setProjectNameSwingWorker extends SwingWorker<String, Void>{
        String projectName;
        JFrame frame;
        public setProjectNameSwingWorker(JFrame frame) {
            this.frame = frame;
        }
        @Override
        protected String doInBackground() {
            projectName = JOptionPane.showInputDialog(frame, "Please provide with the name of the project:", "Name the project", JOptionPane.PLAIN_MESSAGE);
            System.out.println("[NKC-Java][INFO]项目名称拟设置为： " + projectName);
            if (!projectName.matches("^[a-zA-Z0-9]+$")) {
                JOptionPane.showMessageDialog(frame, "You should set the name of the project with only Arabic numbers and English letters.", "Error", JOptionPane.ERROR_MESSAGE);
                projectName = "";
                return null;
            }
            System.out.println("[NKC-Java][INFO]项目名称已设置为： " + projectName);
            JOptionPane.showMessageDialog(frame, "The project should be named as:" + projectName, "The project named", JOptionPane.PLAIN_MESSAGE);
            NewKubikatCatcher.frame.projectName = this.projectName;
            return null;
        }
    }
    public static class setKubikatURLSwingWorker extends SwingWorker<String, Void>{
        String projectName;
        String URL;
        JFrame frame;
        JTextField URLField;
        JProgressBar progressBar;
        browserObject browserObj;
        public setKubikatURLSwingWorker(String URL, String projectName, JFrame frame, JTextField URLField, JProgressBar progressBar, browserObject browserObj) {
            this.projectName = projectName;
            this.URL = URL;
            this.frame = frame;
            this.URLField = URLField;
            this.progressBar = progressBar;
            this.browserObj = browserObj;
        }
        @Override
        protected String doInBackground() {
            if (Objects.equals(projectName, "")){
                JOptionPane.showMessageDialog(frame, "You have not set a name for the current project!", "Error", JOptionPane.ERROR_MESSAGE);
                return null;
            }
            if (!URL.contains("&lang=en")){ //如果用户输入的Kubikat链接的页面不是英文版本的，则拒绝之
                JOptionPane.showMessageDialog(frame, "You should give me the English version of the Kubikat's Search page!", "Error", JOptionPane.ERROR_MESSAGE);
                return null;
            }
            if (!URL.contains("&offset=")){ //如果用户输入的Kubikat链接的页面没有当前页数，则拒绝之
                JOptionPane.showMessageDialog(frame, "You should give me the full link!", "Error", JOptionPane.ERROR_MESSAGE);
                return null;
            }
            URLField.setEnabled(false);
            JOptionPane.showMessageDialog(frame, "The search will start, and I will downloading RIS files and combine them after the search.", "Info", JOptionPane.PLAIN_MESSAGE);
            progressBar.setIndeterminate(true);
            browserObj.runSearch(URL, projectName);
            return null;
        }
    }
}
