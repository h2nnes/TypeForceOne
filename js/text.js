// Text rendering and layout functions

import { state } from './state.js';

// Hilfsfunktionen: nur Buchstaben entfernen (nicht textField/handle)

export function clearLettersOnly() {
    // Entferne alle children, die nicht textField, handle oder mouseRadius visuals sind
    // (falls du andere UI-Items im Layer hast, erweitere die Prüfung)
    for (let child of paper.project.activeLayer.children.slice()) {
        if (child === state.textField || child === state.handle || 
            child === state.mouseRadiusCircle || child === state.mouseRadiusSquare) continue;
        // entferne Letter-Objekte; sichere Vorsicht falls child schon entfernt wurde
        try { child.remove(); } catch (e) {}
    }
    state.letters.length = 0;
}


export function renderText() {
    // Entferne nur zuvor gerenderte Buchstaben, nicht das Feld oder Handle
    clearLettersOnly();

    // Stelle sicher, dass textField & handle wieder oben im Layer sind
    paper.project.activeLayer.addChild(state.textField);
    paper.project.activeLayer.addChild(state.handle);

    state.letters.length = 0;

    const text = state.currentText || "";
    state.fontSize = parseFloat((state.el?.sliderFont?.value) || state.fontSize) || state.fontSize;

    const words = text.split(" ");
    const startX = state.textField.bounds.left + 10;
    const startY = state.textField.bounds.top + 10; // top of the line (we'll compute baseline from this)
    const maxWidth = state.textField.bounds.width - 20;
    const lineHeight = state.fontSize * 1.25;

    let x = startX;
    let y = startY;

    for (let w of words) {
        let testWord = new paper.PointText({
            point: [0, 0],
            content: w,
            fontSize: state.fontSize
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
        
        const baselineOffset = state.fontSize * 0.85; // tweak this multiplier if needed per font
        for (let c of w) {
            let letter = new paper.PointText({
                point: [x, y + baselineOffset],
                content: c,
                fontSize: state.fontSize,
                fillColor: state.fontColor
            });
            state.letters.push(letter);
            // Initialize offset to zero (no force displacement yet)
            letter.data.offset = new paper.Point(0, 0);
            x += letter.bounds.width;
        }

        // Leerzeichen hinzufügen
        x += new paper.PointText({ content: " ", fontSize: state.fontSize }).bounds.width;
    }
}


// Apply a drag delta to every letter (keeps force-induced offsets intact)
export function applyDragTranslationToLetters(dragTranslation) {
    if (!dragTranslation) return;
    if (dragTranslation.x === 0 && dragTranslation.y === 0) return;
    for (let letter of state.letters) {
        letter.position = letter.position.add(dragTranslation);
    }
}
