/**
 * UI Controls and event listeners
 * Manages all sliders, buttons, radio controls, and wheel input
 */

import { state } from './state.js';
import { renderText } from './text.js';
import { exportSVG } from './export.js';

export function initControls() {
    // --- Font Size Slider ---
    if (state.el.sliderFont) {
        state.el.sliderFont.addEventListener("input", renderText);
    }

    // --- Force Strength Slider ---
    if (state.el.sliderForce) {
        const initial = parseFloat(state.el.sliderForce.value);
        if (!isNaN(initial)) {
            state.forceStrength = initial;
        }
        state.el.sliderForce.addEventListener('input', (event) => {
            const v = parseFloat(event.target.value);
            if (!isNaN(v)) {
                state.forceStrength = v;
            }
        });
    }

    // --- Mouse Radius Slider ---
    if (state.el.sliderRadius) {
        const initial = parseFloat(state.el.sliderRadius.value);
        if (!isNaN(initial)) {
            state.mouseRadius = initial;
            state.mouseRadiusCircle.radius = state.mouseRadius;
        }
        state.el.sliderRadius.addEventListener('input', (event) => {
            const v = parseFloat(event.target.value);
            if (!isNaN(v)) {
                // scale existing circle instead of recreating it
                const currentRadius = (state.mouseRadiusCircle?.bounds) ? state.mouseRadiusCircle.bounds.width / 2 : state.mouseRadius || 1;
                const factor = currentRadius > 0 ? v / currentRadius : 1;
                state.mouseRadius = v;
                if (state.mouseRadiusCircle && typeof state.mouseRadiusCircle.scale === 'function') {
                    // scale around the item's center (default)
                    state.mouseRadiusCircle.scale(factor);
                    // restore stroke/dash to constant visual size
                    state.mouseRadiusCircle.strokeWidth = 1;
                    state.mouseRadiusCircle.dashArray = [4, 4];
                    // ensure it's present and visible
                    paper.project.activeLayer.addChild(state.mouseRadiusCircle);
                    state.mouseRadiusCircle.bringToFront();
                    paper.view.update();
                }
                // also scale square
                if (state.mouseRadiusSquare && typeof state.mouseRadiusSquare.scale === 'function') {
                    state.mouseRadiusSquare.scale(factor);
                    state.mouseRadiusSquare.strokeWidth = 1;
                    state.mouseRadiusSquare.dashArray = [4, 4];
                }
            }
        });
    }

    // --- Wheel / trackpad support: adjust mouseRadius with scroll gestures ---
    const minRadius = parseFloat((state.el.sliderRadius?.min) || 10);
    const maxRadius = parseFloat((state.el.sliderRadius?.max) || 200);
    const wheelStep = 3; // change per wheel "tick"

    if (state.el.canvas) {
        state.el.canvas.addEventListener('wheel', (event) => {
            // Prevent the page from scrolling when adjusting radius
            event.preventDefault();

            // On most devices: deltaY < 0 => scroll up (increase), deltaY > 0 => scroll down (decrease)
            const delta = event.deltaY < 0 ? wheelStep : -wheelStep;
            let newRadius = Math.round(Math.max(minRadius, Math.min(maxRadius, state.mouseRadius + delta)));

            if (newRadius !== state.mouseRadius) {
                const currentRadius = (state.mouseRadiusCircle?.bounds) ? state.mouseRadiusCircle.bounds.width / 2 : state.mouseRadius || 1;
                const factor = currentRadius > 0 ? newRadius / currentRadius : 1;
                state.mouseRadius = newRadius;

                if (state.mouseRadiusCircle && typeof state.mouseRadiusCircle.scale === 'function') {
                    state.mouseRadiusCircle.scale(factor);
                    state.mouseRadiusCircle.strokeWidth = 1;
                    state.mouseRadiusCircle.dashArray = [4, 4];
                    paper.project.activeLayer.addChild(state.mouseRadiusCircle);
                    state.mouseRadiusCircle.bringToFront();
                    paper.view.update();
                }

                if (state.mouseRadiusSquare && typeof state.mouseRadiusSquare.scale === 'function') {
                    state.mouseRadiusSquare.scale(factor);
                    state.mouseRadiusSquare.strokeWidth = 1;
                    state.mouseRadiusSquare.dashArray = [4, 4];
                }

                // keep the slider in sync if present
                if (state.el.sliderRadius) state.el.sliderRadius.value = state.mouseRadius;
            }
        }, { passive: false });
    }

    // --- Export and Render Buttons ---
    if (state.el.exportBtn) {
        state.el.exportBtn.addEventListener("click", () => exportSVG(paper, state.textField, state.handle, state.mouseRadiusCircle));
    }
    
    if (state.el.renderBtn) {
        state.el.renderBtn.addEventListener("click", renderText);
    }

    // --- Force Type Radio Buttons (push / pull / spin) ---
    const forceRadios = document.querySelectorAll('input[name="force"]');
    forceRadios.forEach(radio => {
        radio.addEventListener("change", (e) => {
            state.forceType = e.target.value;
            console.log("Force type changed to:", state.forceType);
        });
    });

    // --- Shape Mode Radio Buttons (circle / square) ---
    const shapeRadios = document.querySelectorAll('input[name="shape"]');
    shapeRadios.forEach(radio => {
        radio.addEventListener("change", (e) => {
            state.shapeMode = e.target.value;
            state.mouseRadiusCircle.visible = (state.shapeMode === 'circle');
            state.mouseRadiusSquare.visible = (state.shapeMode === 'square');
            console.log("Shape changed to:", state.shapeMode);
        });
    });

    // --- Keyboard Shortcuts for Shape Mode ---
    document.addEventListener('keydown', (e) => {
        // Ignore if typing in text edit mode
        if (state.textEditMode) return;

        const key = e.key.toLowerCase();
        
        if (key === 'c' && state.shapeMode !== 'circle') {
            state.shapeMode = 'circle';
            state.mouseRadiusCircle.visible = true;
            state.mouseRadiusSquare.visible = false;
            // Reset cursor to default when switching to circle mode
            if (state.el.canvas) state.el.canvas.style.cursor = 'default';
            // Update radio button UI
            const circleRadio = document.getElementById('shapeCircle');
            if (circleRadio) circleRadio.checked = true;
            console.log("Shape changed to: circle");
        } else if (key === 's') {
            if (state.shapeMode !== 'square') {
                // Switch to square mode
                state.shapeMode = 'square';
                state.mouseRadiusCircle.visible = false;
                state.mouseRadiusSquare.visible = true;
                // Update radio button UI
                const squareRadio = document.getElementById('shapeSquare');
                if (squareRadio) squareRadio.checked = true;
                console.log("Shape changed to: square");
            } else {
                // Already in square mode - cycle through force directions
                if (state.mouseRadiusSquare && typeof state.mouseRadiusSquare.cycleForceDirection === 'function') {
                    state.mouseRadiusSquare.cycleForceDirection();
                }
            }
        }
    });
}
