/**
 * Shared application state
 * Central place for all variables used across modules
 */

export const state = {
    // Text rendering
    letters: [],
    fontSize: 60,
    fontColor: "white",
    fontFamily: "ABCDiatypeRoundedVariable",
    currentText: "",
    
    // Force system
    forceStrength: 0.08,
    mouseRadius: 120,
    shapeMode: 'circle', // 'circle' or 'square'
    forceType: "push", // "push", "pull", or "spin"
    
    // UI styling
    uiColor: "white",

    // Typography adjustments
    lineHeightFactor: 1.25, // multiplier applied to fontSize for line spacing
    trackingEm: 0, // additional spacing between glyphs in em (multiples of fontSize)
    
    // Drag & interaction state
    draggingTextField: false,
    pointerGrabOffset: null,
    resizeTextField: false,
    initialTextFieldPosition: null,
    shiftConstrainedShapeStart: null,
    textEditMode: false,
    selectionMode: false,
    // Last known mouse position and modifiers (Paper.Point / object)
    lastMousePoint: null,
    lastMouseModifiers: null,
    
    // Paper.js objects (set after initialization)
    textField: null,
    handle: null,
    mouseRadiusCircle: null,
    mouseRadiusSquare: null,
    
    // DOM elements (set after initialization)
    el: null
};
