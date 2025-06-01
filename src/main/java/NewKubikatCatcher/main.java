package NewKubikatCatcher;

public class main {
    public static void main(String[] args) {
        browserObject browserObj = new browserObject();
        frame frameObj = new frame(browserObj);
        frameObj.frame.setVisible(true);
    }
}