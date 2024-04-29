# DrawThingsControl

author: @ZolAnder  
version: beta 0.10.3

DTCServer and DTCWebUI for controlling Draw Things from anywhere on the local network.

This is a working name which I may change later.

# Credits

Draw Things website:  
https://drawthings.ai/  
Draw Things author: @liuliu  
Draw Things API author: @Gooster

# Usage

- Open Draw Things and enable HTTP API at port 7860
- Open DTCServer
- Open the IP of your conputer at port 8080 in your browser
- Start generating

You can save DTCWebUI as progressive web application.

Example address:  
http://10.16.0.123:8080/

DTC can also be run from Terminal:  
`PATH-TO-DTC-APP/Contents/MacOS/server`

Clicking generation in the web UI adds tasks to the queue.
These are started by the browser one-by-one.
One generation is added for each paragraph in the prompt.
Parameters are initialized from Draw Things.
Viewing and removeing images works even without Draw Things running.
The server saves history and images in `~/DTC` and are retained across web sessions.
Settings reside in `~/DTC/settings.json` and have to be edited manuallyfor now.

DTCServer is developed as a command-line-tool.
It is bundled as an application, but does not use Apple frameworks.
This means that it does not have a window and can not be switched to.
It can only be shut down by force quitting from the dock or the force quit menu.

# TODO

- Thumbnails and lazy full image loading
- Reordering history items
- Setting paramaters in the prompt
- Dynamic prompts with wildcards
- Image importing
- Project handling