/**
 * Force system for TypeForceOne
 * Encapsulates different force effects that can be applied to letters
 */

/**
 * Apply circle push-away force: letters are pushed away from the mouse
 * @param {Array} letters - Array of Paper.js PointText items
 * @param {Point} mousePos - Current mouse position
 * @param {Number} mouseRadius - Radius within which force is applied
 * @param {Number} forceStrength - Strength multiplier of the force
 */
export function applyCirclePushForce(letters, mousePos, mouseRadius, forceStrength) {
    for (let l of letters) {
        const dist = l.position.getDistance(mousePos);
        if (dist < mouseRadius) {
            const force = (mouseRadius - dist) * forceStrength;
            const dir = l.position.subtract(mousePos).normalize();
            l.position = l.position.add(dir.multiply(force));
        }
    }
}



/**
 * Apply circle pull force: letters are pulled towards the mouse (opposite of push)
 * @param {Array} letters - Array of Paper.js PointText items
 * @param {Point} mousePos - Current mouse position
 * @param {Number} mouseRadius - Radius within which force is applied
 * @param {Number} forceStrength - Strength multiplier of the force
 */
export function applyCirclePullForce(letters, mousePos, mouseRadius, forceStrength) {
    for (let l of letters) {
        const dist = l.position.getDistance(mousePos);
        if (dist < mouseRadius) {
            const force = (mouseRadius - dist) * forceStrength;
            const dir = mousePos.subtract(l.position).normalize(); // opposite direction
            l.position = l.position.add(dir.multiply(force));
        }
    }
}

/**
 * Apply circle spin force: letters rotate to align with the line connecting mouse pointer to letter
 * Rotation strength depends on proximity: closer to center = stronger rotation, farther = weaker.
 * Position stays the same; only rotation changes.
 * @param {Array} letters - Array of Paper.js PointText items
 * @param {Point} mousePos - Current mouse position
 * @param {Number} mouseRadius - Radius within which force is applied
 */
export function applyCircleSpinForce(letters, mousePos, mouseRadius) {
    for (let l of letters) {
        const dist = l.position.getDistance(mousePos);
        if (dist < mouseRadius) {
            // Calculate vector from letter to mouse
            const vecToMouse = mousePos.subtract(l.position);
            // Calculate angle in degrees (Paper.js uses degrees for rotation)
            const angle = Math.atan2(vecToMouse.y, vecToMouse.x) * (180 / Math.PI);
            
            // Calculate rotation strength: closer to center = stronger (1.0), farther = weaker (0.0)
            const rotationStrength = 1 - (dist / mouseRadius);
            
            // Interpolate between current rotation and target angle based on strength
            const currentRotation = l.rotation || 0;
            l.rotation = currentRotation + (angle - currentRotation) * rotationStrength;
        }
    }
}

/**
 * Apply square push force: acts like a solid wall, pushing letters in the direction of square movement
 * @param {Array} letters - Array of Paper.js PointText items
 * @param {Point} mousePos - Current mouse position
 * @param {Number} mouseRadius - Half-size of the square (square spans from -mouseRadius to +mouseRadius from center)
 * @param {Number} forceStrength - Strength multiplier of the force
 * @param {Point} movementDelta - Direction and magnitude of square movement
 */
export function applySquarePushForce(letters, mousePos, mouseRadius, forceStrength, forceDirection = 'right') {
    // mousePos is the center of the square; mouseRadius is the half-size (square spans ±mouseRadius)
    const dir = forceDirection || 'right';
    const cx = mousePos.x;
    const cy = mousePos.y;
    const left = cx - mouseRadius;
    const right = cx + mouseRadius;
    const top = cy - mouseRadius;
    const bottom = cy + mouseRadius;
    const span = mouseRadius * 2; // full width/height

    for (let l of letters) {
        const px = l.position.x;
        const py = l.position.y;

        // Only affect letters inside the square bounds
        if (px < left || px > right || py < top || py > bottom) continue;

        const dx = px - cx;
        const dy = py - cy;

        let fx = 0;
        let fy = 0;

        // Falloff: weakest at the pushing edge (distance = 0), strongest at the opposite edge (distance = span).
        // Scale by a modest fraction of mouseRadius to keep visible effect without being overpowering
        const baseScale = mouseRadius * 0.5;

        // Sharper ramp near the opposite edge: strength grows quadratically with distance/span
        if (dir === 'right') {
            const distance = right - px; // 0 at right edge (pushing), span at left edge
            const t = Math.max(0, Math.min(1, distance / span));
            const strength = t * t;
            if (strength > 0) fx = strength * baseScale * forceStrength; // push +x
        } else if (dir === 'left') {
            const distance = px - left; // 0 at left edge (pushing), span at right edge
            const t = Math.max(0, Math.min(1, distance / span));
            const strength = t * t;
            if (strength > 0) fx = -strength * baseScale * forceStrength; // push -x
        } else if (dir === 'down') {
            const distance = bottom - py; // 0 at bottom edge (pushing), span at top edge
            const t = Math.max(0, Math.min(1, distance / span));
            const strength = t * t;
            if (strength > 0) fy = strength * baseScale * forceStrength; // push +y
        } else if (dir === 'up') {
            const distance = py - top; // 0 at top edge (pushing), span at bottom edge
            const t = Math.max(0, Math.min(1, distance / span));
            const strength = t * t;
            if (strength > 0) fy = -strength * baseScale * forceStrength; // push -y
        }

        if (fx !== 0 || fy !== 0) {
            l.position = l.position.add(new paper.Point(fx, fy));
        }
    }
}

/**
 * Apply square pull force: acts like a vacuum, pulling letters uniformly from the edge closest to mouse
 * @param {Array} letters - Array of Paper.js PointText items
 * @param {Point} mousePos - Current mouse position
 * @param {Number} mouseRadius - Half-size of the square
 * @param {Number} forceStrength - Strength multiplier of the force
 */
export function applySquarePullForce(letters, mousePos, mouseRadius, forceStrength) {
    // Intentionally left empty — implementation reset
    // Keep signature so app.js can call this. Implement pull behavior here later.
    return;
}

/**
 * Apply square spin force: rotates letters inside the square based on which edge the mouse approaches from
 * @param {Array} letters - Array of Paper.js PointText items
 * @param {Point} mousePos - Current mouse position
 * @param {Number} mouseRadius - Half-size of the square
 */
export function applySquareSpinForce(letters, mousePos, mouseRadius) {
    // Intentionally left empty — implementation reset
    // Keep signature so app.js can call this. Implement spin behavior here later.
    return;
}
