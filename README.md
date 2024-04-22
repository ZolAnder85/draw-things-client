# DrawThingsControl

author: @ZolAnder
version: beta 0.10.1

Web UI and server app for controlling Draw Things from anywhere on the local network.
This is a working name which I may change later.

# Special Thanks

Draw Things Author: @liuliu
Draw Things API Author: @Gooster

Draw Things website:
https://drawthings.ai/

# Usage

- Open Draw Things and enable HTTP API at port 7860
- Open DTC application
- Navigate to the IP of your computer at port 8080
- Start generating

Example address:
http://10.16.0.123:8080/

DTC can also be run from Terminal.
Working directory of execution does not matter.

Example command:
PATH-TO-DTC-APP/Contents/MacOS/server

Clicking generation in the web UI adds tasks to the queue.
These are started by the browser one-by-one.
One generation is added for each paragraph in the prompt.
Parameters are initialized from Draw Things.
Last generations are stored locally and get loaded back when returning.
The capacity of the history is limited by the browser.

Models are defined in the main HTML documents.
Run this command in Terminal to edit the list of models:
open -a TextEdit PATH-TO-DTC-APP/Contents/MacOS/public/index.html

DTC application is developed as a command-line-tool.
It is bundled as an application, but does not use Apple frameworks.
This means that it does not have a window and can not be switched to.
It can only be shut down by force quitting from the dock or the force quit menu.