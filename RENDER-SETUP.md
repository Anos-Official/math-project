# Math Match remote controller

## Deploy the relay

1. Push this project to GitHub.
2. In Render, choose New, then Web Service, and select this GitHub repository.
3. Set Root Directory to render-server.
4. Set Runtime to Node, Build Command to npm install, and Start Command to npm start.
5. Under Environment, add CONTROLLER_KEY with a long secret known only to the presenter.
6. Create the service and wait for a green deploy.

## Connect the slideshow

Open the slideshow URL with server and room query parameters. Example:

https://YOUR-USERNAME.github.io/YOUR-REPO/?server=wss://YOUR-RENDER-SERVICE.onrender.com/ws&room=period-3

## Open the controller

Open controller.html on GitHub Pages and enter the WebSocket server URL, the same room name, and the CONTROLLER_KEY value.
