var socket = io.connect('http://localhost');
var canvas = new fabric.StaticCanvas('c');
var images = [];

function cleare() {
    socket.emit("clear");
}

function test() {
    socket.emit("test", "/set1/tonttu2.jpg");
}

socket.on('connect', function () {
    socket.emit("sync");
});

socket.on('clearCanvas', function (data) {
    canvas.clear();
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
                imageLast.animate("opacity", 0, {
                    from: 1,
                    onChange: canvas.renderAll.bind(canvas),
                    duration: 2500,
                    onComplete: function () {
                        canvas.remove(imageLast);
                    }
                });
            change();
            }
            else {
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

