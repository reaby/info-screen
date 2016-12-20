var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
const fs = require('fs');

var directory = "set1";
var filecounter = -1;
var imageFile = "";

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


    socket.on("sync", function () {
        updateImage(socket);
    });

    socket.on("clear", function (data) {
        console.log("clearing");
        io.emit('clearCanvas');
    });

    socket.on("test", function (data) {
        console.log("updateImage");

    });

    socket.on('clearCanvas', function (data) {
        console.log(data);
    });
});

setInterval(changeSlide, 20000);

changeSlide();


function updateImage(socket) {
    fs.readdir(__dirname + "/public/images/" + directory, function (err, files) {
        var filteredFiles = [];
        for (var i in files) {
            var file = files[i];
            if (file.slice(0, 1) == ".") continue;
            filteredFiles.push(file);
        }
        socket.emit('updateImage', {
                imageUrl: '/images/' + directory + '/' + filteredFiles[filecounter]
            }
        );
    });
}

function changeSlide() {
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
        io.emit('updateImage', {
            imageUrl: '/images/' + directory + '/' + filteredFiles[filecounter]
        });


    });
}
