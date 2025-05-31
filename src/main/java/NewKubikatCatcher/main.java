package NewKubikatCatcher;

public class main {
    public static void main(String[] args) {
        SearchBrowserObject searchBrowserObj = new SearchBrowserObject();
        searchBrowserObj.createBrowser("https://kubikat.org");//先创建出来JCEF的browser对象，即默认显示kubikat页面
        frame frameObj = new frame(searchBrowserObj);
        frameObj.frame.setVisible(true);

    }
}