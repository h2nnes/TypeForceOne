/**
 * Mouse and interaction handlers for TypeForceOne
 * Handles all Paper.js mouse events and cursor updates
 */

import { state } from './state.js';
import { applyCirclePushForce, applyCirclePullForce, applyCircleSpinForce, applySquarePushForce, applySquarePullForce, applySquareSpinForce } from './force.js';
import { renderText, applyDragTranslationToLetters } from './text.js';
import { syncOverlayTextarea } from './textEdit.js';

function updateSquareCursor() {
    if (state.shapeMode === 'square' && state.mouseRadiusSquare.forceDirection) {
        const direction = state.mouseRadiusSquare.forceDirection;
        const cursorMap = {
            'right': 'e-resize',
            'left': 'w-resize',
            'down': 's-resize',
            'up': 'n-resize'
        };
        state.el.canvas.style.cursor = cursorMap[direction] || 'default';
    } else {
        state.el.canvas.style.cursor = 'default';
    }
}

export function initInteractions() {
    // Setup cycleForceDirection method on mouseRadiusSquare
    state.mouseRadiusSquare.cycleForceDirection = function() {
        const order = ['right', 'down', 'left', 'up'];
        const idx = order.indexOf(this.forceDirection);
        const next = order[(idx + 1) % order.length];
        this.forceDirection = next;
        updateSquareCursor();
    };

    // ---------- ZENTRALE MOUSE-HANDLER mittels hitTest (robust) ----------
    paper.view.onMouseDown = function(event) {
        // Prüfe, ob wir das Handle treffen (zuerst)
        let hit = paper.project.hitTest(event.point, { fill: true, stroke: true, tolerance: 6 });

        // Standard: keine Aktion
        state.draggingTextField = false;
        state.resizeTextField = false;

        // If editing text via overlay, ignore Paper interactions
        if (state.textEditMode) {
            return;
        }

        if (hit) {
            if (hit.item === state.handle || state.handle.contains(event.point)) {
                // Beginne Resizing
                state.resizeTextField = true;
                return;
            }
            // Falls Klick auf das Feld (aber nicht auf Handle) → Drag
            if (hit.item === state.textField || state.textField.contains(event.point)) {
                state.draggingTextField = true;
                state.pointerGrabOffset = state.textField.position.subtract(event.point);
                state.initialTextFieldPosition = state.textField.position.clone(); // Store position for letter offset calculation
                return;
            }
        }
        
        // In square mode, cycle force direction when clicking outside handle and textField
        if (state.shapeMode === 'square') {
            if (state.mouseRadiusSquare && typeof state.mouseRadiusSquare.cycleForceDirection === 'function') {
                state.mouseRadiusSquare.cycleForceDirection();
            }
        }
    };

    paper.view.onMouseDrag = function(event) {
        if (state.textEditMode) return;
        // Wenn wir gerade resize machen
        if (state.resizeTextField) {
            // Compute new size from top-left corner so rectangle grows down/right
            const topLeft = state.textField.bounds.topLeft;
            const minWidth = 60;
            const minHeight = 40;
            const newWidth = Math.max(minWidth, event.point.x - topLeft.x);
            const newHeight = Math.max(minHeight, event.point.y - topLeft.y);

            // Scale the existing rectangle instead of recreating it (better performance).
            // Compute scale factors for width and height.
            const oldBounds = state.textField.bounds;
            const scaleX = oldBounds.width > 0 ? newWidth / oldBounds.width : 1;
            const scaleY = oldBounds.height > 0 ? newHeight / oldBounds.height : 1;

            // Scale around the top-left corner (Paper.js supports passing center point to scale).
            state.textField.scale(scaleX, scaleY, topLeft);

            // Manually update the size property so internal dimensions stay accurate.
            state.textField.size = [newWidth, newHeight];

            // Update handle position to follow bottom-right
            state.handle.position = state.textField.bounds.bottomRight;

            // Reflow text and force a redraw so the change is visible immediately
            renderText();
            paper.view.update();
            return;
        }

        // Wenn wir gerade draggen (verschieben)
        if (state.draggingTextField) {
            state.textField.position = event.point.add(state.pointerGrabOffset);
            state.handle.position = state.textField.bounds.bottomRight;

            paper.view.update();
            return;
        }
    };

    paper.view.onMouseUp = function(event) {

        if (state.draggingTextField) {
            // Apply the drag translation to all letters to finalize the movement
            const dragTranslation = state.textField.position.subtract(state.initialTextFieldPosition);
            applyDragTranslationToLetters(dragTranslation);
            syncOverlayTextarea();
        }
        
        state.draggingTextField = false;
        state.resizeTextField = false;
    };

    paper.view.onMouseMove = function (event) {
        if (state.textEditMode) {
            return;
        }
        let shapePos = event.point;

        // If Shift is held, constrain shape movement to axis-aligned (horizontal or vertical)
        if (event.modifiers && event.modifiers.shift) {
            // Initialize constraint start position on first Shift-constrained move
            if (!state.shiftConstrainedShapeStart) {
                state.shiftConstrainedShapeStart = event.point.clone();
            }
            const delta = event.point.subtract(state.shiftConstrainedShapeStart);
            // Determine dominant axis: if |dx| > |dy|, lock to horizontal; else lock to vertical
            if (Math.abs(delta.x) > Math.abs(delta.y)) {
                // Horizontal: keep start Y, use current X
                shapePos = new paper.Point(event.point.x, state.shiftConstrainedShapeStart.y);
            } else {
                // Vertical: keep start X, use current Y
                shapePos = new paper.Point(state.shiftConstrainedShapeStart.x, event.point.y);
            }
        } else {
            // Reset constraint tracking when Shift is released
            state.shiftConstrainedShapeStart = null;
        }

        state.mouseRadiusCircle.position = shapePos;
        state.mouseRadiusSquare.position = shapePos;

        // Update cursor if in square mode
        if (state.shapeMode === 'square') {
            updateSquareCursor();
        }

        state.forceStrength = parseFloat(state.el.sliderForce?.value || state.forceStrength) || state.forceStrength;

        // Apply the selected force type based on shape mode
        if (state.shapeMode === 'square') {
            // Square wall-like forces
            if (state.forceType === "pull") {
                applySquarePullForce(state.letters, event.point, state.mouseRadius, state.forceStrength);
            } else if (state.forceType === "spin") {
                applySquareSpinForce(state.letters, event.point, state.mouseRadius);
            } else {
                applySquarePushForce(state.letters, event.point, state.mouseRadius, state.forceStrength, state.mouseRadiusSquare.forceDirection);
            }
        } else {
            // Circle radial forces
            if (state.forceType === "pull") {
                applyCirclePullForce(state.letters, event.point, state.mouseRadius, state.forceStrength);
            } else if (state.forceType === "spin") {
                applyCircleSpinForce(state.letters, event.point, state.mouseRadius, state.forceStrength);
            } else {
                applyCirclePushForce(state.letters, event.point, state.mouseRadius, state.forceStrength);
            }
        }
    };
}
