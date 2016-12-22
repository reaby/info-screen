var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
const fs = require('fs');
const path = require('path');
var basicAuth = require('basic-auth');
var config = require('./config.json');

server.listen(config.listenPort);

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

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/public/index.html');
});


var auth = function (req, res, next) {
    function unauthorized(res) {
        res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
        return res.sendStatus(401);
    }

    var user = basicAuth(req);

    if (!user || !user.name || !user.pass) {
        return unauthorized(res);
    }

    if (user.name === config.adminUsername && user.pass === config.adminPass) {
        return next();
    } else {
        return unauthorized(res);
    }
};

app.get('/admin', auth, function (req, res) {
    res.sendFile(__dirname + '/public/admin.html');
});

/*
 app.get('/:name', function (req, res) {
 res.sendFile(__dirname + '/public/' + req.params.name);
 });
 */

/*app.get('/getInfo', function (req, res) {
    request(req.query.url, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            res.send(body);
        }
        else {
            res.status(response.statusCode);
            console.log("Error " + response.statusCode)
        }
    });
});
*/

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

    sendFilelist(socket, "set1");

    // when client connects, it calls for sync!
    socket.on("sync", function () {
        syncImage(socket);
    });

    socket.on("stop", function () {
        doLoop(false);
    });

    socket.on("playVideo", function (id) {
        io.emit("playVideo", id);
        doLoop(false);
    });

    socket.on("stopVideo", function () {
        io.emit("stopVideo");
        doLoop(true);
    });

    socket.on("endVideo", function () {
        io.emit("endVideo");
        doLoop(true);
    })

    socket.on("changeDir", function (dir) {
        directory = dir;
        fileCounter = -1;
        doLoop(true);
    });

    socket.on("override", function (data) {
        doLoop(false);
        sendOverride(data);
    });

    socket.on("delete", function (data) {
        if (data.dir.indexOf(".") !== -1) {
            console.log("invalid directory:" + data.dir);
            return;
        }

        fs.unlink("public/images/" + data.dir + "/" + data.file, function (err) {
            if (err) {
                console.log("error while deleting: public/images/" + data.dir + "/" + data.file);
                return;
            }
            sendFilelist(socket, data.dir);
            console.log("delete success: public/images/" + data.dir + "/" + data.file);
        });


    });

    socket.on("edit", function (data) {
        sendEditSlide(socket, data);
    });

    socket.on("saveSlide", function (data) {
        saveSlide(data);
    });

    socket.on("list", function (dir) {
        sendFilelist(socket, dir);
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
    var data = {
        dir: directory,
        currDir: dir,
        dirs: list,
        files: list2
    };
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

            if (file == null || file == "") {
                console.log("can't locate empty file");
                io.emit(buffer.method, buffer.data);
                return;
            }

            if (file.slice(-3) == "jpg" || file.slice(-3) == "png") {
                buffer.method = 'updateImage';
                buffer.data = {
                    imageUrl: '/images/' + directory + '/' + file,
                    dir: directory
                };
            } else if (file.slice(-4) == "json") {
                try {
                    var data = JSON.parse(fs.readFileSync(__dirname + "/public/images/" + directory + "/" + file, 'utf8'));
                    buffer.method = 'displayText';
                    buffer.data = {
                        imageUrl: '/images/default/background.jpg',
                        title: data.title,
                        text: data.text,
                        dir: directory
                    };
                } catch (e) {
                    console.log("error while  parsing slide data");
                }
            }

            io.emit(buffer.method, buffer.data);
        });
    }
}
