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

    // Allow dropping a font file to use it for rendering
    function setupFontDrop() {
        const target = state.el.canvas || window;
        const noop = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; };
        ['dragenter', 'dragover'].forEach(evt => target.addEventListener(evt, noop));

        target.addEventListener('drop', async (e) => {
            e.preventDefault();
            const file = e.dataTransfer?.files?.[0];
            if (!file) return;
            if (!/\.(ttf|otf|woff2?|ttc|otc)$/i.test(file.name)) return;

            const fontName = file.name.replace(/\.[^/.]+$/, '');
            const url = URL.createObjectURL(file);
            try {
                const face = new FontFace(fontName, `url(${url})`);
                await face.load();
                document.fonts.add(face);
                state.fontFamily = fontName;
                if (state.el.overlayTextarea) state.el.overlayTextarea.style.fontFamily = `'${fontName}', sans-serif`;
                renderText();
            } catch (err) {
                console.error('Font load failed', err);
            } finally {
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            }
        });
    }

    setupFontDrop();

    // Inactivity handling: hide textField frame+handle after timeout when pointer stayed within textField
    let inactivityTimeout = null;
    const INACTIVITY_MS = 1000;

    function scheduleInactivityCheck() {
        if (inactivityTimeout) clearTimeout(inactivityTimeout);
        inactivityTimeout = setTimeout(() => {
            // Don't hide while editing text, dragging or resizing
            if (state.textEditMode || state.draggingTextField || state.resizeTextField) return;
            if (!state.textField) return;
            // After inactivity, always hide the Paper frame (handle + textField).
            // The frame will only be restored when the cursor moves inside the textField bounds.
            try {
                state.textField.visible = false;
                state.handle.visible = false;
            } catch (e) {
                // bounds may be undefined during init; ignore
            }
        }, INACTIVITY_MS);
    }

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
            return;
        }

        // Wenn wir gerade draggen (verschieben)
        if (state.draggingTextField) {
            state.textField.position = event.point.add(state.pointerGrabOffset);
            state.handle.position = state.textField.bounds.bottomRight;

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
    // Throttle mouse updates using requestAnimationFrame
    let isForceUpdateScheduled = false;

    paper.view.onMouseMove = function (event) {
        // Always remember latest pointer so mode switches can reposition visuals
        state.lastMousePoint = event.point;
        state.lastMouseModifiers = event.modifiers;

        // Always (re)schedule inactivity check and restore frame if we move inside bounds
        scheduleInactivityCheck();
        if (state.textField && !state.textField.visible) {
            try {
                if (state.textField.bounds.contains(state.lastMousePoint)) {
                    state.textField.visible = true;
                    state.handle.visible = true;
                }
            } catch (e) {}
        }

        if (state.textEditMode || state.selectionMode) {
            return;
        }

        // If an update is already scheduled, skip (wait for next frame)
        if (isForceUpdateScheduled) return;

        // Schedule the force update for next animation frame
        isForceUpdateScheduled = true;
        requestAnimationFrame(() => {
            isForceUpdateScheduled = false;

            if (!state.lastMousePoint) return;

            let shapePos = state.lastMousePoint;

            // If Shift is held, constrain shape movement to axis-aligned (horizontal or vertical)
            if (state.lastMouseModifiers && state.lastMouseModifiers.shift) {
                // Initialize constraint start position on first Shift-constrained move
                if (!state.shiftConstrainedShapeStart) {
                    state.shiftConstrainedShapeStart = state.lastMousePoint.clone();
                }
                const delta = state.lastMousePoint.subtract(state.shiftConstrainedShapeStart);
                // Determine dominant axis: if |dx| > |dy|, lock to horizontal; else lock to vertical
                if (Math.abs(delta.x) > Math.abs(delta.y)) {
                    // Horizontal: keep start Y, use current X
                    shapePos = new paper.Point(state.lastMousePoint.x, state.shiftConstrainedShapeStart.y);
                } else {
                    // Vertical: keep start X, use current Y
                    shapePos = new paper.Point(state.shiftConstrainedShapeStart.x, state.lastMousePoint.y);
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
                    applySquarePullForce(state.letters, shapePos, state.mouseRadius, state.forceStrength);
                } else if (state.forceType === "spin") {
                    applySquareSpinForce(state.letters, shapePos, state.mouseRadius);
                } else {
                    applySquarePushForce(state.letters, shapePos, state.mouseRadius, state.forceStrength, state.mouseRadiusSquare.forceDirection);
                }
            } else {
                // Circle radial forces
                if (state.forceType === "pull") {
                    applyCirclePullForce(state.letters, shapePos, state.mouseRadius, state.forceStrength);
                } else if (state.forceType === "spin") {
                    applyCircleSpinForce(state.letters, shapePos, state.mouseRadius, state.forceStrength);
                } else {
                    applyCirclePushForce(state.letters, shapePos, state.mouseRadius, state.forceStrength);
                }
            }
        });
    };
}
