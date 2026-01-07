/**
 * Text Edit Mode
 * Manages the overlay textarea for direct text editing
 */

import { state } from './state.js';
import { renderText } from './text.js';

// Sync overlay textarea position/size to match textField
export function syncOverlayTextarea() {
    if (!state.textEditMode) return;
    const rect = state.textField.bounds;
    const canvasRect = state.el.canvas.getBoundingClientRect();
    // Map Paper coordinates to canvas pixels (assumes 1:1 CSS pixels to view coordinates)
    state.el.overlayTextarea.style.left = `${canvasRect.left + rect.left}px`;
    state.el.overlayTextarea.style.top = `${canvasRect.top + rect.top}px`;
    state.el.overlayTextarea.style.width = `${rect.width}px`;
    state.el.overlayTextarea.style.height = `${rect.height}px`;
    state.el.overlayTextarea.style.fontSize = `${state.fontSize}px`;
}

function enterTextEditMode() {
    if (state.textEditMode) return;
    state.textEditMode = true;
    // Hide Paper text box visuals
    state.textField.visible = false;
    state.handle.visible = false;
    // Also hide the dashed visuals
    state.mouseRadiusCircle.visible = false;
    state.mouseRadiusSquare.visible = false;
    // Ensure any residual rendering is invisible
    state.textField.opacity = 0;
    state.handle.opacity = 0;
    // Bring textarea in sync
    if (state.el.overlayTextarea) {
        state.el.overlayTextarea.value = state.currentText || "";
        state.el.overlayTextarea.style.display = 'block';
    }
    syncOverlayTextarea();
    state.el.overlayTextarea?.focus({ preventScroll: true });
}

function exitTextEditMode() {
    if (!state.textEditMode) return;
    state.textEditMode = false;
    // Persist text back to input and re-render
    if (state.el.overlayTextarea) {
        state.currentText = state.el.overlayTextarea.value || state.currentText;
        state.el.overlayTextarea.style.display = 'none';
    }
    state.textField.visible = true;
    state.handle.visible = true;
    state.textField.opacity = 1;
    state.handle.opacity = 1;
    // Restore visuals based on shape mode
    state.mouseRadiusCircle.visible = (state.shapeMode === 'circle');
    state.mouseRadiusSquare.visible = (state.shapeMode === 'square');
    renderText();
}

export function initTextEdit() {
    // Exit text edit mode when clicking outside the overlay textarea
    document.addEventListener('mousedown', (e) => {
        if (state.textEditMode && state.el.overlayTextarea && !state.el.overlayTextarea.contains(e.target)) {
            exitTextEditMode();
        }
    });

    // Toggle text edit mode with 't' and exit with 'Escape'
    document.addEventListener('keydown', (e) => {
        if (e.key === 't' || e.key === 'T') {
            const targetIsOverlay = state.el.overlayTextarea && document.activeElement === state.el.overlayTextarea;
            
            if (!state.textEditMode) {
                // Entering text mode - prevent 't' from being typed
                e.preventDefault();
                e.stopPropagation();
                enterTextEditMode();
            } else if (state.textEditMode && !targetIsOverlay) {
                // Exiting text mode when focus is not on textarea
                e.preventDefault();
                e.stopPropagation();
                exitTextEditMode();
            }
            // If already in text mode and textarea is focused, allow typing 't'
        }
        
        // Exit text edit mode with Escape key
        if (e.key === 'Escape' && state.textEditMode) {
            e.preventDefault();
            exitTextEditMode();
        }
    });
}
