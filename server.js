var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
const fs = require('fs');

/** @var string */
var directory = "set1";

/** @var integer */
var filecounter = -1;

/** @var string */
var imageFile = "";

/** @var int timeout in milliseconds */
var loopTimeout = 20000;

/** @var boolean stop the loop ? */
var loopStop = false;

server.listen(80);

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/public/index.html');
});

app.get('/:name', function (req, res) {
    res.sendFile(__dirname + '/public/' + req.params.name);
});

app.get('/images/:dir/:name', function (req, res, next) {

    var options = {
        root: __dirname + '/public/images/',
        dotfiles: 'deny',
        headers: {
            'x-timestamp': Date.now(),
            'x-sent': true
        }
    };

    var fileName = req.params.dir + "/" + req.params.name;

    res.sendFile(fileName, options, function (err) {
        if (err) {
            console.log(err);
            res.status(err.status).end();
        }
        else {
            console.log('Sent:', fileName);
        }
    });

});

app.get('/js/:name', function (req, res, next) {

    var options = {
        root: __dirname + '/public/js/',
        dotfiles: 'deny',
        headers: {
            'x-timestamp': Date.now(),
            'x-sent': true
        }
    };

    var fileName = req.params.name;
    console.log(req.params.name);
    res.sendFile(fileName, options, function (err) {
        if (err) {
            console.log(err);
            res.status(err.status).end();
        }
        else {
            console.log('Sent:', fileName);
        }
    });

});


io.on('connection', function (socket) {

    // when client connects, it calls for sync!
    socket.on("sync", function () {
        syncImage(socket);
    });

    socket.on("stop", function () {
        loopStop = true;
    });

    socket.on("continue", function () {
        loopStop = false;
        loop();
    });

    socket.on("clear", function (data) {
        io.emit('clearCanvas');
        loopStop = true;
    });

});

// Start the loop
loop();

/**
 * syncs the image for incoming connection
 * @param socket
 */
function syncImage(socket) {
    fs.readdir(__dirname + "/public/images/" + directory, function (err, files) {
        if (err) {
            console.log(err);
            return;
        }

        socket.emit('updateImage', {
                imageUrl: imageFile
            }
        );
    });
}


/**
 * main loop
 */
function loop() {
    if (!loopStop) {
        setTimeout(loop, loopTimeout);
        fs.readdir(__dirname + "/public/images/" + directory, function (err, files) {
            var filteredFiles = [];
            for (var i in files) {
                var file = files[i];
                if (file.slice(0, 1) == ".") continue;
                filteredFiles.push(file);
            }
            var len = filteredFiles.length;
            if (filecounter > len) filecounter = 0;

            filecounter = (filecounter + 1) % len;
            imageFile = '/images/' + directory + '/' + filteredFiles[filecounter];

            io.emit('updateImage', {
                imageUrl: imageFile
            });

        });
    }
}
