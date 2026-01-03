/**
 * Force system for TypeForceOne
 * Encapsulates different force effects that can be applied to letters
 */

/**
 * Apply push-away force: letters are pushed away from the mouse
 * @param {Array} letters - Array of Paper.js PointText items
 * @param {Point} mousePos - Current mouse position
 * @param {Number} mouseRadius - Radius within which force is applied
 * @param {Number} forceStrength - Strength multiplier of the force
 */
export function applyPushForce(letters, mousePos, mouseRadius, forceStrength) {
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
 * Apply pull force: letters are pulled towards the mouse (opposite of push)
 * @param {Array} letters - Array of Paper.js PointText items
 * @param {Point} mousePos - Current mouse position
 * @param {Number} mouseRadius - Radius within which force is applied
 * @param {Number} forceStrength - Strength multiplier of the force
 */
export function applyPullForce(letters, mousePos, mouseRadius, forceStrength) {
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
 * Apply spin force: letters rotate to align with the line connecting mouse pointer to letter
 * Rotation strength depends on proximity: closer to center = stronger rotation, farther = weaker.
 * Position stays the same; only rotation changes.
 * @param {Array} letters - Array of Paper.js PointText items
 * @param {Point} mousePos - Current mouse position
 * @param {Number} mouseRadius - Radius within which force is applied
 */
export function applySpinForce(letters, mousePos, mouseRadius) {
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
