var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
const fs = require('fs');
const path = require('path');

/** @var string */
var directory = "set1";

/** @var integer */
var fileCounter = -1;

/** @var object */
var imageFile = "";

var buffer = {};

/** @var int timeout in milliseconds */
var loopTimeout = 20000;

/** @var boolean stop the loop ? */
var loopStop = false;

var timeoutId = [];

var len = 1;

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

    socket.on("edit", function (data) {
        sendEditSlide(socket, data);
    });

    socket.on("saveSlide", function (data) {
        saveSlide(data);
    });

    socket.on("list", function (data) {
        sendFilelist(socket, data);
    });

    socket.on("next", function () {
        doLoop(true);
    });

    socket.on("prev", function () {
        fileCounter -= 2;
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
    socket.emit(buffer.method, buffer.data);
}

function sendOverride(data) {
    buffer.method = 'overrideText';
    buffer.data = {
        imageUrl: '/images/default/background.jpg',
        title: data.title,
        text: data.text
    };
    io.emit(buffer.method, buffer.data);
}


function saveSlide(data) {
    var out = {
        title: data.title,
        text: data.text
    };

    fs.writeFile("public/images/" + data.dir + "/" + data.file, JSON.stringify(out), function (err) {
        if (err) {
            console.log("fail");
            return;
        }
        console.log("success!");
    });
}

function sendEditSlide(socket, inData) {
    try {
        var data = JSON.parse(fs.readFileSync(__dirname + "/public/images/" + inData.dir + "/" + inData.file, 'utf8'));
        data.dir = inData.dir;
        data.file = inData.file;
        socket.emit("getEditData", data);
    } catch (e) {
        console.log("error while parsing editData json");
    }
}


function doLoop(value) {
    loopStop = !value;
    if (value) {
        mainLoop();
    }
}

function listFiles(dir) {
    return fs.readdirSync(dir).reduce(function (list, file) {
        var name = path.join(dir, file);
        var isDir = fs.statSync(name).isDirectory();
        return list.concat(isDir ? [] : [file]);
    }, []);
}

function listDirs(dir) {
    return fs.readdirSync(dir).reduce(function (list, file) {
        var name = path.join(dir, file);
        var isDir = fs.statSync(name).isDirectory();
        return list.concat(isDir ? [file] : []);
    }, []);
}

function sendFilelist(socket, dir) {
    var list = listDirs("public/images");
    if (dir.indexOf(".") !== -1) {
        return;
    }
    var files = listFiles("public/images/" + dir);
    var list2 = [];
    for (var i in files) {
        var file = files[i];
        if (file.slice(-3) == "jpg" || file.slice(-3) == "png") {
            list2.push(file);
        }
        if (file.slice(-4) == "json") {
            list2.push(file);
        }
    }
    var data = {dir: dir, dirs: list, files: list2};
    socket.emit("doFileList", data);
}

/**
 * main loop
 */
function mainLoop() {
    if (loopStop) {
        // do nothing
    }
    else {
        for (var i in timeoutId) {
            var id = timeoutId.shift();
            clearTimeout(id);
        }

        timeoutId.push(setTimeout(mainLoop, loopTimeout));

        fs.readdir(__dirname + "/public/images/" + directory, function (err, files) {
            var filteredFiles = [];
            for (var i in files) {
                var file = files[i];
                if (file.slice(0, 1) == ".") continue;
                filteredFiles.push(file);
            }

            len = filteredFiles.length;

            fileCounter += 1;
            if (fileCounter < 0) fileCounter = Math.abs(len + fileCounter);
            fileCounter = fileCounter % len;

            var file = filteredFiles[fileCounter];

            if (file.slice(-3) == "jpg" || file.slice(-3) == "png") {
                buffer.method = 'updateImage';
                buffer.data = {imageUrl: '/images/' + directory + '/' + file};
            } else if (file.slice(-4) == "json") {
                try {
                    var data = JSON.parse(fs.readFileSync(__dirname + "/public/images/" + directory + "/" + file, 'utf8'));
                    buffer.method = 'displayText';
                    buffer.data = {
                        imageUrl: '/images/default/background.jpg',
                        title: data.title,
                        text: data.text
                    };
                } catch (e) {
                    console.log("error while  parsing slide data");
                }
            }
            io.emit(buffer.method, buffer.data);
        });
    }
}
