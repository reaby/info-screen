# Info Screen
A InfoScreen system build upon node.js and socket.io. 
You get multiple public views which are synced from backend and an admin
interface which controls the slide show.

### how to setup ?

1. install node.js and npm
2. git clone this repo
3. run `npm install` at cloned repo folder
4. edit `config.js` -> set listen port 
  `public/js/config.js` -> change localhost to point your servers ip or domain name
5. `node server.js` 
6.  browse to your server `http://server:port` and admin interface is at `http://server:port/admin`

### how to use ?

The slideshow should be easy to use.
Just put 1280x720px png or jpg images to `public\images\` set-folders to display the slides.
Change `public\images\default\background.jpg` for text image background.
You can highlite text between ¤-characters, the highlited text will go different color.

