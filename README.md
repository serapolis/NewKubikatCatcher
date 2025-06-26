# NewKubikatCatcher

## About

An automatic RIS downloader for the new version of Kubikat, created by SORAMI Miyabitama, under the MIT License.
This program is only valid for amd64 device with Windows 7 or upper and Linux, MacOS(for both arm64 devices and amd64 devices).

## Way to use

### Run the program

It have to be warned that the program is always unavailable during its first running, and when it does go so, just restart it. 

#### On Windows

Just double click the "runNewKubikatCatcher.bat".

#### On Linux

You should have your own JRE or JDK, and try to run the program through it.

#### On MacOS

You should launch the bash terminal at first, and then switch to the folder with the program through command "cd", which should be like:

`` cd ./NewKubikatCatcher ``

It is found that the program will meet some problems in the MacOS due to the lack of code-signature, if so, just open the setting panel and choose to trust the program itself and its accompanied executive files.

If you are not sure with the CPU that your device equipped, you can try both of ways.

##### arm64

Run the code in the bash terminal that you've launched before:

``
chmod +x ./Mac_arm_run.sh 
``

``
chmod +x ./OpenJDK_24_0_1_mac_arm/bin/java
``

Then:

``./Mac_arm_run.sh ``

##### amd64

Run the code in the bash terminal that you've launched before:

`` 
chmod +x ./Mac_x64_run.sh 
``

``
chmod +x ./OpenJDK_24_0_1_mac_x64/bin/java
``

Then:

``./Mac_x64_run.sh ``

### After launched

1. Visit the Kubikat, and switch to the **English** version;
2. Search what you want, and copy the **complete link** of first page of the results, which should be like this:"https://www.kubikat.org/discovery/search?query=title,contains,Cantonese,AND&tab=LibraryCatalog&search_scope=MyInstitution&vid=49MPG_KUBIKAT:VU1&lang=en&mode=advanced&offset=0";
3. Then, click the bat file of the program;
4. Click "Opreations", and then choose "Name the project", name the project;
5. Paste the link you've gotten into the textfield;
6. Click "Opreations", and then choose "Run the project", run the project;
7. Waiting, and soon you'll get your RIS file, and when it is running, make sure that your **Internet connection and your device are stable**.
