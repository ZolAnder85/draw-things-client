rm DTC.beta.0.10.8.dmg
mkdir DTC
ditto DTCServer.app DTC/DTCServer.app
ditto README.md DTC/
ditto LICENSE.txt DTC/
create-dmg --volname DTC --eula LICENSE.RTF --skip-jenkins --app-drop-link 0 0 DTC.beta.0.10.8.dmg DTC > /dev/null
rm -rf DTC
open DTC.beta.0.10.8.dmg