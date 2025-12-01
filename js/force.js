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
