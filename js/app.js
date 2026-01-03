import { exportSVG } from "./export.js";
import { applyPushForce, applyPullForce, applySpinForce } from "./force.js";

// Init Paper.js
paper.setup(document.getElementById("canvas"));

let letters = [];
let fontSize = 60;
let forceStrength = 0.08;
let mouseRadius = 120;
let forceType = "push"; // "push" or "pull" 
let fontColor = "white";
let uiColor = "white";

let draggingTextField = false;
let pointerGrabOffset; // offset between pointer and box when grabbed
let resizeTextField = false;
let initialTextFieldPosition; // Track position at start of drag

// Cache DOM elements once
const el = {
    inputText: document.getElementById("inputText"),
    sliderFont: document.getElementById("SliderFontSize"),
    sliderRadius: document.getElementById("SliderRadius"),
    sliderForce: document.getElementById("SliderForceStrength"),
    exportBtn: document.getElementById("exportBtn"),
    renderBtn: document.getElementById("renderBtn")
};



// ------------- TEXT BOX (Frame + Handle) ------------------

let textField = new paper.Path.Rectangle({
    point: [700, 100],
    size: [600, 700],
    strokeColor: uiColor,
    fillColor: "rgba(255, 255, 255, 0.01)",
    strokeWidth: 1
});

// Handle unten rechts
let handle = new paper.Path.Rectangle({
    center: textField.bounds.bottomRight,
    size: [8, 8],
    fillColor: uiColor,
    strokeColor: uiColor,
    strokeWidth: 1
});


// Visual for mouse radius (create early so renderText can preserve it)
let mouseRadiusCircle = new paper.Path.Circle({
    center: [0, 0],
    radius: mouseRadius,
    strokeColor: uiColor,
    strokeWidth: 1,
    dashArray: [4, 4]
});


// Initialize mouseRadius from slider and wire live updates (if slider exists)
if (el.sliderRadius) {
    const initial = parseFloat(el.sliderRadius.value);
    if (!isNaN(initial)) {
        mouseRadius = initial;
        mouseRadiusCircle.radius = mouseRadius;
    }
    el.sliderRadius.addEventListener('input', (event) => {
        const v = parseFloat(event.target.value);
        if (!isNaN(v)) {
            // scale existing circle instead of recreating it
            const currentRadius = (mouseRadiusCircle && mouseRadiusCircle.bounds) ? mouseRadiusCircle.bounds.width / 2 : mouseRadius || 1;
            const factor = currentRadius > 0 ? v / currentRadius : 1;
            mouseRadius = v;
            if (mouseRadiusCircle && typeof mouseRadiusCircle.scale === 'function') {
                // scale around the item's center (default)
                mouseRadiusCircle.scale(factor);
                // restore stroke/dash to constant visual size
                mouseRadiusCircle.strokeWidth = 1;
                mouseRadiusCircle.dashArray = [4, 4];
                // ensure it's present and visible
                paper.project.activeLayer.addChild(mouseRadiusCircle);
                mouseRadiusCircle.bringToFront();
                paper.view.update();
            }
        }
    });
}

// --- Wheel / trackpad support: adjust mouseRadius with scroll gestures ---
const minRadius = parseFloat((el.sliderRadius && el.sliderRadius.min) || 10);
const maxRadius = parseFloat((el.sliderRadius && el.sliderRadius.max) || 200);
const wheelStep = 3; // change per wheel "tick"

const canvasEl = document.getElementById('canvas');
if (canvasEl) {
    canvasEl.addEventListener('wheel', (event) => {
        // Prevent the page from scrolling when adjusting radius
        event.preventDefault();

        // On most devices: deltaY < 0 => scroll up (increase), deltaY > 0 => scroll down (decrease)
        const delta = event.deltaY < 0 ? wheelStep : -wheelStep;
        let newRadius = Math.round(Math.max(minRadius, Math.min(maxRadius, mouseRadius + delta)));

        if (newRadius !== mouseRadius) {
            const currentRadius = (mouseRadiusCircle && mouseRadiusCircle.bounds) ? mouseRadiusCircle.bounds.width / 2 : mouseRadius || 1;
            const factor = currentRadius > 0 ? newRadius / currentRadius : 1;
            mouseRadius = newRadius;

            if (mouseRadiusCircle && typeof mouseRadiusCircle.scale === 'function') {
                mouseRadiusCircle.scale(factor);
                mouseRadiusCircle.strokeWidth = 1;
                mouseRadiusCircle.dashArray = [4, 4];
                paper.project.activeLayer.addChild(mouseRadiusCircle);
                mouseRadiusCircle.bringToFront();
                paper.view.update();
            }

            // keep the slider in sync if present
            if (el.sliderRadius) el.sliderRadius.value = mouseRadius;
        }
    }, { passive: false });
}




// ---------- Hilfsfunktionen: nur Buchstaben entfernen (nicht textField/handle) ----------
function clearLettersOnly() {
    // Entferne alle children, die nicht textField, handle oder mouseRadiusCircle sind
    // (falls du andere UI-Items im Layer hast, erweitere die Prüfung)
    for (let child of paper.project.activeLayer.children.slice()) {
        if (child === textField || child === handle || child === mouseRadiusCircle) continue;
        // entferne Letter-Objekte; sichere Vorsicht falls child schon entfernt wurde
        try { child.remove(); } catch (e) {}
    }
    letters = [];
}





// ------------- TEXT LAYOUT ENGINE ------------------

function renderText() {
    // Entferne nur zuvor gerenderte Buchstaben, nicht das Feld oder Handle
    clearLettersOnly();

    // Stelle sicher, dass textField & handle wieder oben im Layer sind
    paper.project.activeLayer.addChild(textField);
    paper.project.activeLayer.addChild(handle);



    letters = [];

    const text = (el.inputText && el.inputText.value) || "";
    fontSize = parseFloat((el.sliderFont && el.sliderFont.value) || fontSize) || fontSize;

    const words = text.split(" ");
    const startX = textField.bounds.left + 10;
    const startY = textField.bounds.top + 10; // top of the line (we'll compute baseline from this)
    const maxWidth = textField.bounds.width - 20;
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

        /* Paper.js positions PointText by its insertion point (baseline).
        We want text to be laid out top→down, so compute a baseline offset
        from the top `y` and use that for the PointText `point` Y coordinate. */
        
        const baselineOffset = fontSize * 0.85; // tweak this multiplier if needed per font
        for (let c of w) {
            let letter = new paper.PointText({
                point: [x, y + baselineOffset],
                content: c,
                fontSize: fontSize,
                fillColor: fontColor
            });
            letters.push(letter);
            // Initialize offset to zero (no force displacement yet)
            letter.data.offset = new paper.Point(0, 0);
            x += letter.bounds.width;
        }

        // Leerzeichen hinzufügen
        x += new paper.PointText({ content: " ", fontSize }).bounds.width;
    }
}

renderText();



// ---------- ZENTRALE MOUSE-HANDLER mittels hitTest (robust) ----------
paper.view.onMouseDown = function(event) {
    // Prüfe, ob wir das Handle treffen (zuerst)
    let hit = paper.project.hitTest(event.point, { fill: true, stroke: true, tolerance: 6 });

    // Standard: keine Aktion
    draggingTextField = false;
    resizeTextField = false;

    if (hit) {
        if (hit.item === handle || handle.contains(event.point)) {
            // Beginne Resizing
            resizeTextField = true;
            return;
        }
        // Falls Klick auf das Feld (aber nicht auf Handle) → Drag
        if (hit.item === textField || textField.contains(event.point)) {
            draggingTextField = true;
            pointerGrabOffset = textField.position.subtract(event.point);
            initialTextFieldPosition = textField.position.clone(); // Store position for letter offset calculation
            return;
        }
    }
};



paper.view.onMouseDrag = function(event) {
    // Wenn wir gerade resize machen
    if (resizeTextField) {

        // Compute new size from top-left corner so rectangle grows down/right
        const topLeft = textField.bounds.topLeft;
        const minWidth = 60;
        const minHeight = 40;
        const newWidth = Math.max(minWidth, event.point.x - topLeft.x);
        const newHeight = Math.max(minHeight, event.point.y - topLeft.y);

        // Scale the existing rectangle instead of recreating it (better performance).
        // Compute scale factors for width and height.
        const oldBounds = textField.bounds;
        const scaleX = oldBounds.width > 0 ? newWidth / oldBounds.width : 1;
        const scaleY = oldBounds.height > 0 ? newHeight / oldBounds.height : 1;

        // Scale around the top-left corner (Paper.js supports passing center point to scale).
        textField.scale(scaleX, scaleY, topLeft);

        // Manually update the size property so internal dimensions stay accurate.
        textField.size = [newWidth, newHeight];

        // Update handle position to follow bottom-right
        handle.position = textField.bounds.bottomRight;

        // Reflow text and force a redraw so the change is visible immediately
        renderText();
        paper.view.update();
        return;
    }

    // Wenn wir gerade draggen (verschieben)
    if (draggingTextField) {
        textField.position = event.point.add(pointerGrabOffset);
        handle.position = textField.bounds.bottomRight;

        paper.view.update();
        return;
    }
};

paper.view.onMouseUp = function(event) {

    if (draggingTextField) {
        // Apply the drag translation to all letters to finalize the movement
        const dragTranslation = textField.position.subtract(initialTextFieldPosition);
        applyDragTranslationToLetters(dragTranslation);
    }
    
    draggingTextField = false;
    resizeTextField = false;
};


// Apply a drag delta to every letter (keeps force-induced offsets intact)
function applyDragTranslationToLetters(dragTranslation) {
    if (!dragTranslation) return;
    if (dragTranslation.x === 0 && dragTranslation.y === 0) return;
    for (let letter of letters) {
        letter.position = letter.position.add(dragTranslation);
    }
}


// ---------- FORCE SYSTEM (Push Away) ----------------

paper.view.onMouseMove = function (event) {

    mouseRadiusCircle.position = event.point;

    forceStrength = parseFloat((el.sliderForce && el.sliderForce.value) || forceStrength) || forceStrength;

    // Apply the selected force type
    if (forceType === "pull") {
        applyPullForce(letters, event.point, mouseRadius, forceStrength);
    } else if (forceType === "spin") {
        applySpinForce(letters, event.point, mouseRadius);
    } else {
        applyPushForce(letters, event.point, mouseRadius, forceStrength);
    }
};


if (el.sliderFont) el.sliderFont.addEventListener("input", renderText);
if (el.exportBtn) el.exportBtn.addEventListener("click", () => exportSVG(paper, textField, handle, mouseRadiusCircle));
if (el.renderBtn) el.renderBtn.addEventListener("click", renderText);

// Wire force type radio buttons (push / pull / spin)
const forceRadios = document.querySelectorAll('input[name="force"]');
forceRadios.forEach(radio => {
    radio.addEventListener("change", (e) => {
        forceType = e.target.value;
        console.log("Force type changed to:", forceType);
    });
});
