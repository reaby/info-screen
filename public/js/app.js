var canvas = new fabric.StaticCanvas('c');
var images = [];
var override = [];
var textGroup = null;
var flashBox = null;
var sizeTitle = 72;
var sizeText = 50;

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
    if (override.length > 0) {
        for (var i in override) {
            override[i].animate("opacity", 0, {
                duration: 1500,
                onChange: canvas.renderAll.bind(canvas),
                onComplete: function () {
                    canvas.clear();
                    override = [];
                    displayText2(data);
                }
            });
        }
    } else {
        displayText2(data);
    }
});


function displayText2(data) {

    fabric.Image.fromURL(data.imageUrl, function (oImg) {
        oImg.set({
            scaleY: canvas.height / oImg.height,
            scaleX: canvas.width / oImg.width,
            opacity: 1
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
            displayText3(data);

        } else {
            images[0].set({
                opacity: 1
            });
            canvas.add(images[0]);
            displayText3(data);
        }
    });
}
/**
 * clears old texts from screen
 * @param data
 */
function displayText3(data) {
    clearTexts();
    displayText4(data);
    updateUI(data.dir);
}

function clearTexts() {
    var oldGroup = textGroup;
    if (textGroup) {
        oldGroup.animate("opacity", 0, {
            duration: 2500,
            onChange: canvas.renderAll.bind(canvas),
            onComplete: function () {
                canvas.remove(oldGroup);
            }
        })
        delete oldGroup;
    }
}

function parseStyle(string) {
    var out = {};
    var rows = string.split("\n");

    for (var i in rows) {
        var match, indexes = [];
        var value = rows[i];
        var r = /¤.*?¤/g;
        while (match = r.exec(value))
            indexes.push([match.index, match.index + match[0].length]);

        for (var j in indexes) {
            for (x = indexes[j][0] - (j * 2); x < indexes[j][1] - (j * 2) - 2; x++) {
                if (!out[i]) {
                    out[i] = {};
                }
                out[i][x] = {fill: 'rgb(255,0,0)'};
            }
        }
    }
    return out;
}

/**
 * finally display the text
 */
function displayText4(data) {

    var title = new fabric.IText(data.title.replace(/¤/g, ""), {
        left: 150, //Take the block's position
        top: 75,
        fill: 'white',
        fontFamily: "Arial",
        fontSize: sizeTitle,
        styles: parseStyle(data.title)

    });

    var text = new fabric.IText(data.text.replace(/¤/g, ""), {
        left: 250, //Take the block's position
        top: 200,
        width: 1600,
        height: 1000,
        fill: 'white',
        fontFamily: "Arial",
        fontSize: sizeText,
        styles: parseStyle(data.text)
    });

    title.setShadow({color: "rgba(0,0,0,1)", blur: 2, offsetX: 2, offsetY: 2});
    text.setShadow({color: "rgba(0,0,0,1)", blur: 2, offsetX: 2, offsetY: 2});

    textGroup = new fabric.Group([title, text]);
    textGroup.set({opacity: 0});

    canvas.add(textGroup);

    textGroup.animate("opacity", 1, {
        duration: 2500,
        onChange: canvas.renderAll.bind(canvas)
    });

}


socket.on('overrideText', function (data) {
    for (var i in images) {
        canvas.remove(images.shift());
    }
    for (var o in override) {
        canvas.remove(override.shift());
    }
    clearTexts();
    override = [];
    images = [];

    canvas.clear();

    fabric.Image.fromURL(data.imageUrl, function (oImg) {
        oImg.set({
            scaleY: canvas.height / oImg.height,
            scaleX: canvas.width / oImg.width,
            opacity: 1
        });

        var title = new fabric.IText(data.title.replace(/¤/g, ""), {
            left: 200, //Take the block's position
            top: 100,
            fill: 'white',
            fontFamily: "Arial",
            fontSize: sizeTitle,
            styles: parseStyle(data.title)
        });

        var text = new fabric.IText(data.text.replace(/¤/g, ""), {
            left: 250, //Take the block's position
            top: 250,
            width: 1600,
            height: 1000,
            fill: 'white',
            fontFamily: "Arial",
            fontSize: sizeText,
            styles: parseStyle(data.text)
        });

        title.setShadow({color: "rgba(0,0,0,1)", blur: 2, offsetX: 2, offsetY: 2});
        text.setShadow({color: "rgba(0,0,0,1)", blur: 2, offsetX: 2, offsetY: 2});

        override.push(oImg);
        override.push(title);
        override.push(text);

        for (var i in override) {
            canvas.add(override[i]);
        }

        if (data.flash) {
            flash();
        }
        flash();
    });

});

socket.on('updateImage', function (data) {
    clearTexts();
    updateUI(data.dir);
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


function updateUI(dir) {
    var chil = $('#changeDir').children().each(function (i, elem) {
        if (dir == $(elem).text()) {
            $(elem).attr("selected", "selected");
        }
    });
}

function change() {
    canvas.add(images[0]);
    images[0].animate("opacity", 1, {
        duration: 2500,
        onChange: canvas.renderAll.bind(canvas)
    });
}

function flash(color, cont) {

    if (!cont) {
        color = "rgb(255,255,255)";
    }

    flashBox = new fabric.Rect(
        {
            top: 0,
            left: 0,
            width: 1280,
            height: 720,
            fill: color,
            opacity: 0
        });

    canvas.add(flashBox);

    flashBox.animate("opacity", 1, {
        duration: 150,
        onChange: canvas.renderAll.bind(canvas),
        onComplete: function () {
            flashBox.animate("opacity", 0, {
                duration: 150,
                onChange: canvas.renderAll.bind(canvas),
                onComplete: function () {
                    canvas.remove(flashBox);
                    if (cont) {
                        return;
                    } else {
                        flash("rgb(255,255,255)", true)
                    }
                }
            });
        }
    });
}

