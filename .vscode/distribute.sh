mkdir DTC
ditto DTCServer.app DTC/DTCServer.app
ditto README.md DTC/
ditto LICENSE.txt DTC/
create-dmg --volname DTC --eula .vscode/LICENSE.RTF --skip-jenkins --app-drop-link 0 0 DTC.beta.0.10.9.dmg DTC > /dev/null
rm -rf DTC
open DTC.beta.0.10.9.dmg