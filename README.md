# DrawThingsControl

author: @ZolAnder  
version: beta 0.10.9

DTCServer and DTCWebUI for controlling Draw Things from anywhere on the local network.

This is a working name which I may change later.

# Credits

Draw Things website:  
https://drawthings.ai/  
Draw Things author: @liuliu  
Draw Things API author: @Gooster

# Installation

The app is not signed or notarized.  
There are two options to get around the quarantine:
- Right-click on the app and allow it to run
- Remove quarantine attribute with Terminal
```
sudo xattr -r -d com.apple.quarantine DTCServer.app
```

# Usage

- Open Draw Things and enable HTTP API at port 7860
- Open DTCServer
- Open the IP of your conputer at port 8080 in your browser
- Start generating

You can save DTCWebUI as progressive web application.

Example address:  
http://10.16.0.123:8080/

DTC can also be run from Terminal:
```
PATH-TO-DTC-APP/Contents/MacOS/server
```

Clicking generation in the web UI adds tasks to the queue.
These are started by the browser one-by-one.
One generation is added for each paragraph in the prompt.
Parameters are initialized from Draw Things.
Viewing and removeing images works even without Draw Things running.
The server saves history and images in `~/DTC` and are retained across web sessions.
Settings reside in `~/DTC/settings.json` and have to be edited manually for now.

DTCServer is developed as a command-line-tool.
It is bundled as an application, but does not use Apple frameworks.
This means that it does not have a window and can not be switched to.
It can only be shut down by force quitting from the dock or the force quit menu.

# TODO

## Client Usability

- Double tap or space to zoom image
- Swipe horizontally or arrows to switch image
- Swipe vertically or escape to close image
- Thumbnails and lazy image loading?
- Make results focusable
- move results with arrows
- Project switch on enter
- Add separator element
- More result moving

## Look and Feel

- Embedded SVG icons?

## Features

- Image importing
- Unlimited LoRAs?
- Add missing models when loading
- Mark as favorite or star rating
- Restore default on double click
- Filter results view
	- Save it as a new project
- Sort results view
	- Save the new order
- Remove negative prompt