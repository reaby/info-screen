var socket = io.connect('http://localhost');
var canvas = new fabric.StaticCanvas('c');

socket.on('clearCanvas', function (data) {
    canvas.clear();
});


socket.on('updateImage', function (data) {
    canvas.clear();
    fabric.Image.fromURL(data.imageUrl, function (oImg) {
        canvas.add(oImg);
    });
});
