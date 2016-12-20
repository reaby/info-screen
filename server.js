var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
const fs = require('fs');

/** @var string */
var directory = "set1";

/** @var integer */
var fileCounter = -1;

/** @var string */
var imageFile = "";

/** @var int timeout in milliseconds */
var loopTimeout = 20000;

/** @var boolean stop the loop ? */
var loopStop = false;

var timeoutId = [];

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
        doLoop(false);
    });

    socket.on("override", function (data) {
        doLoop(false);
        sendOverride(data);
    });


    socket.on("next", function () {
        doLoop(true);
    });

    socket.on("prev", function () {
        fileCounter--;
        doLoop(true);
    });

    socket.on("clear", function (data) {
        io.emit('clearCanvas');
        doLoop(false);
    });

});

// Start the loop
mainLoop();

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

function sendOverride(data) {
    console.log(data);

    io.emit('displayText', {
        imageUrl: '/images/overrides/background.jpg',
        title: data.title,
        text: data.text
    });
}


function doLoop(value) {
    loopStop = !value;
    for (var i in timeoutId) {
        clearTimeout(timeoutId.shift());
    }

    if (value) {
        mainLoop();
    }
}

/**
 * main loop
 */
function mainLoop() {
    if (loopStop) {
        // do nothing
    }
    else {
        timeoutId.push(setTimeout(mainLoop, loopTimeout));

        fs.readdir(__dirname + "/public/images/" + directory, function (err, files) {
            var filteredFiles = [];
            for (var i in files) {
                var file = files[i];
                if (file.slice(0, 1) == ".") continue;
                filteredFiles.push(file);
            }
            var len = filteredFiles.length;

            if (fileCounter > len) fileCounter = 0;
            fileCounter = (fileCounter + 1) % len;
            if (fileCounter < 0) fileCounter = 0;


            imageFile = '/images/' + directory + '/' + filteredFiles[fileCounter];

            io.emit('updateImage', {
                imageUrl: imageFile
            });

        });
    }
}
