var socket = io.connect('http://localhost');
var canvas = new fabric.StaticCanvas('c');
var images = [];
var override = [];
var isOverride = false;

function clearCanvas() {
    socket.emit("clear");
}

function loopStop() {
    socket.emit("stop");
}

function loopNext() {
    socket.emit("next");
}

function loopPrev() {
    socket.emit("prev");
}

socket.on('connect', function () {
    socket.emit("sync");
});

function reset() {
    $('#title').val("");
    $('#text').val("");
}

function showText() {
    socket.emit("override", {
            title: $('#title').val(),
            text: $('#text').val()
        }
    );
}

socket.on('clearCanvas', function (data) {
    if (images.length > 0) {
        for (var i in images) {
            images[i].animate("opacity", 0, {
                duration: 1500,
                onChange: canvas.renderAll.bind(canvas),
                onComplete: function () {
                    canvas.clear();
                    images = [];
                }
            });
        }
    } else {
        canvas.clear();
    }
});

socket.on('displayText', function (data) {
    for (var i in images) {
        canvas.remove(images.shift());
    }
    for (var o in override) {
        canvas.remove(override.shift());
    }
    override = [];
    images = [];

    canvas.clear();

    fabric.Image.fromURL(data.imageUrl, function (oImg) {
        oImg.set({
            scaleY: canvas.height / oImg.height,
            scaleX: canvas.width / oImg.width,
            opacity: 1
        });


        var title = new fabric.Text(data.title, {
            left: 200, //Take the block's position
            top: 100,
            fill: 'white',
            fontFamily: "Arial",
            fontSize: 120
        });

        var text = new fabric.Textbox(data.text, {
            left: 250, //Take the block's position
            top: 250,
            width: 1600,
            height: 1000,
            fill: 'white',
            fontFamily: "Arial",
            fontSize: 90
        });

        title.setShadow({color: "rgba(0,0,0,1)", blur: 2, offsetX: 2, offsetY: 2});
        text.setShadow({color: "rgba(0,0,0,1)", blur: 2, offsetX: 2, offsetY: 2});

        override.push(oImg);
        override.push(title);
        override.push(text);

        for (var i in override) {
            canvas.add(override[i]);
        }
        canvas.renderAll();
    });

});

socket.on('updateImage', function (data) {

    fabric.Image.fromURL(data.imageUrl, function (oImg) {
            oImg.set({
                scaleY: canvas.height / oImg.height,
                scaleX: canvas.width / oImg.width,
                opacity: 0
            });
            images.push(oImg);

            if (images.length > 1) {
                var imageLast = images.shift();
                canvas.add(images[0]);
                images[0].animate("opacity", 1, {
                    from: 0,
                    onChange: canvas.renderAll.bind(canvas),
                    duration: 2500,
                    onComplete: function () {
                        canvas.remove(imageLast);

                    }
                });
           //     change();
            }
            else {
                canvas.clear();
                images[0].set({
                    opacity: 1
                });
                canvas.add(images[0]);
            }
        }
    );
});

function change() {
    canvas.add(images[0]);
    images[0].animate("opacity", 1, {
        duration: 2500,
        onChange: canvas.renderAll.bind(canvas)
    });
}

