export function exportSVG(paper, textField, handle, radiusCircle) {
    // UI-Elemente ausblenden
    textField.visible = false;
    handle.visible = false;
    radiusCircle.visible = false;

    let svg = paper.project.exportSVG({ asString: true });

    // UI-Elemente wieder anzeigen
    textField.visible = true;
    handle.visible = true;
    radiusCircle.visible = true;

    // Download
    let blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    let url = URL.createObjectURL(blob);

    let link = document.createElement("a");
    link.href = url;
    link.download = "layout.svg";
    link.click();
}