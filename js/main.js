import { exportSVG } from "./export.js";
import { applyCirclePushForce, applyCirclePullForce, applyCircleSpinForce, applySquarePushForce, applySquarePullForce, applySquareSpinForce } from "./force.js";
import { renderText, applyDragTranslationToLetters } from "./text.js";
import { state } from "./state.js";
import { initInteractions } from "./interactions.js";
import { initControls } from "./controls.js";
import { initTextEdit } from "./textEdit.js";

// Init Paper.js
paper.setup(document.getElementById("canvas"));

// Initialize state with DOM elements
state.el = {
    canvas: document.getElementById("canvas"),
    overlayTextarea: document.getElementById("overlayTextarea"),
    sliderFont: document.getElementById("SliderFontSize"),
    sliderRadius: document.getElementById("SliderRadius"),
    sliderForce: document.getElementById("SliderForceStrength"),
    exportBtn: document.getElementById("exportBtn"),
    renderBtn: document.getElementById("renderBtn")
};

state.currentText = (state.el.overlayTextarea?.value || state.el.overlayTextarea?.placeholder) || "";




// ------------- TEXT BOX (Frame + Handle) ------------------

state.textField = new paper.Path.Rectangle({
    point: [700, 100],
    size: [600, 700],
    strokeColor: state.uiColor,
    fillColor: "rgba(255, 255, 255, 0.01)",
    strokeWidth: 1
});

// Handle unten rechts
state.handle = new paper.Path.Rectangle({
    center: state.textField.bounds.bottomRight,
    size: [8, 8],
    fillColor: state.uiColor,
    strokeColor: state.uiColor,
    strokeWidth: 1
});


// Visual for mouse radius (create early so renderText can preserve it)
state.mouseRadiusCircle = new paper.Path.Circle({
    center: [0, 0],
    radius: state.mouseRadius,
    strokeColor: state.uiColor,
    strokeWidth: 1,
    dashArray: [4, 4]
});

// Visual for square area
state.mouseRadiusSquare = new paper.Path.Rectangle({
    center: [0, 0],
    size: [state.mouseRadius * 2, state.mouseRadius * 2],
    strokeColor: state.uiColor,
    strokeWidth: 1,
    dashArray: [4, 4]
});
state.mouseRadiusSquare.visible = false;

// forceDirection: 'left' | 'right' | 'up' | 'down'
state.mouseRadiusSquare.forceDirection = 'right';

renderText();

// Initialize mouse/interaction handlers
initInteractions();

// Initialize UI controls
initControls();

// Initialize text edit mode
initTextEdit();
