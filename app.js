// // Init Paper.js on the canvas
// paper.setup(document.getElementById('canvas'));

// sliderForceStrength = document.getElementById("SliderForceStrength");

// let letters = [];
// let fontSize;
// let mouseRadius = 140; 
// let forceStrength;

// let mouseRadiusCircle = new paper.Path.Circle({
//     center: [0, 0],
//     radius: mouseRadius,
//     strokeColor: 'white',
//     strokeWidth: 1,
//     visible: true // erst sichtbar sobald Maus bewegt wird
// });


 

// // Render Text
// function renderText() {
//     paper.project.activeLayer.removeChildren();
//     letters = [];

//     // Immer aktuellen Wert vom SliderFontSize lesen
//     fontSize = document.getElementById('SliderFontSize').value;

//     const text = document.getElementById("inputText").value;
//     let x = 50;
//     let y = paper.view.center.y;

//     for (let char of text) {
//         let t = new paper.PointText({
//             point: [x, y],
//             content: char,
//             fillColor: "white",
//             fontSize: fontSize
//         });

//         letters.push(t);
//         x += t.bounds.width + 2;
//     }

//     // Maus Radius Kreis wieder hinzufügen
//     paper.project.activeLayer.addChild(mouseRadiusCircle);

// }

// // Mouse push force
// paper.view.onMouseMove = function(event) {
//     // Aktuelle Force Strength holen
//     forceStrength = sliderForceStrength.value;

//     // Kreis an Mausposition setzen
//     mouseRadiusCircle.position = event.point;
//     mouseRadiusCircle.visible = true;
    
//     for (let l of letters) {

//         const dist = l.position.getDistance(event.point);

//         if (dist < mouseRadius) {
//             let force = (mouseRadius - dist) * forceStrength;
//             let direction = l.position.subtract(event.point).normalize();
//             l.position = l.position.add(direction.multiply(force));
//         }
//     }
// };

// // Export SVG
// function exportSVG() {
//     let svg = paper.project.exportSVG({ asString: true });

//     // Download
//     let blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
//     let url = URL.createObjectURL(blob);

//     let link = document.createElement("a");
//     link.href = url;
//     link.download = "typo_force_export.svg";
//     link.click();

//     URL.revokeObjectURL(url);
// }

// // Input events
// document.getElementById("renderBtn").addEventListener("click", renderText);
// document.getElementById("exportBtn").addEventListener("click", exportSVG);
// document.getElementById("SliderFontSize").addEventListener("input", renderText);
// sliderForceStrength.addEventListener("input", () => {
//     forceStrength = parseFloat(sliderForceStrength.value);
// });



// // Initial text
// renderText();












// Init Paper.js
paper.setup(document.getElementById("canvas"));

let letters = [];
let fontSize = 60;
let forceStrength = 0.08;
let mouseRadius = 120;





// ------------- TEXT BOX (Frame + Handle) ------------------

let frame = new paper.Path.Rectangle({
    point: [1000, 100],
    size: [600, 700],
    strokeColor: "white",
    fillColor: "black",
    strokeWidth: 1
});

// Handle unten rechts
let handle = new paper.Path.Circle({
    center: frame.bounds.bottomRight,
    radius: 8,
    fillColor: "white"
});

let draggingHandle = false;

frame.onMouseDown = function () {
    draggingHandle = true;
};

paper.view.onMouseUp = function () {
    draggingHandle = false;
};

paper.view.onMouseDrag = function (event) {
    if (draggingHandle) {
        // Frame neu skalieren
        frame.bounds.bottomRight = event.point;

        // Handle anpassen
        handle.position = frame.bounds.bottomRight;

        // Text neu umbrechen
        renderText();
    }
};





// ------------- TEXT LAYOUT ENGINE ------------------

function renderText() {
    paper.project.activeLayer.removeChildren();

    // Frame & Handle zurück hinzufügen
    paper.project.activeLayer.addChild(frame);
    paper.project.activeLayer.addChild(handle);

    letters = [];

    const text = document.getElementById("inputText").value;
    fontSize = parseFloat(document.getElementById("SliderFontSize").value);

    const words = text.split(" ");
    const startX = frame.bounds.left + 10;
    const startY = frame.bounds.top + 10;
    const maxWidth = frame.bounds.width - 20;
    const lineHeight = fontSize * 1.25;

    let x = startX;
    let y = startY;

    for (let w of words) {
        let testWord = new paper.PointText({
            point: [0, 0],
            content: w,
            fontSize: fontSize
        });

        let wordWidth = testWord.bounds.width;
        testWord.remove();

        // Zeilenumbruch
        if (x + wordWidth > startX + maxWidth) {
            x = startX;
            y += lineHeight;
        }

        // Buchstaben zeichnen
        for (let c of w) {
            let letter = new paper.PointText({
                point: [x, y],
                content: c,
                fontSize: fontSize,
                fillColor: "white"
            });
            letters.push(letter);
            x += letter.bounds.width;
        }

        // Leerzeichen hinzufügen
        x += new paper.PointText({ content: " ", fontSize }).bounds.width;
    }
}

renderText();


// ---------- FORCE SYSTEM (Push Away) ----------------

let radiusCircle = new paper.Path.Circle({
    center: [0, 0],
    radius: mouseRadius,
    strokeColor: "white",
    dashArray: [4, 4]
});


paper.view.onMouseMove = function (event) {

    radiusCircle.position = event.point;

    forceStrength = parseFloat(document.getElementById("SliderForceStrength").value);

    for (let l of letters) {
        let dist = l.position.getDistance(event.point);

        if (dist < mouseRadius) {
            let force = (mouseRadius - dist) * forceStrength;
            let dir = l.position.subtract(event.point).normalize();
            l.position = l.position.add(dir.multiply(force));
        }
    }
};





// ------------ EXPORT SVG -----------------------

function exportSVG() {
    frame.visible = false;
    handle.visible = false;
    radiusCircle.visible = false;

    let svg = paper.project.exportSVG({ asString: true });

    frame.visible = true;
    handle.visible = true;
    radiusCircle.visible = true;

    let blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    let url = URL.createObjectURL(blob);

    let link = document.createElement("a");
    link.href = url;
    link.download = "layout.svg";
    link.click();
}

document.getElementById("exportBtn").addEventListener("click", exportSVG);
document.getElementById("renderBtn").addEventListener("click", renderText);











