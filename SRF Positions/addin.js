geotab.addin.redCircle = (elt, service) => {
    elt.innerHTML = '<div class="addin"><h3>Red Circle Map</h3><p class="info">Círculo rojo en coordenadas -38.2112142, -69.2293903. Muévete en el mapa y haz zoom para verlo interactuar.</p></div>';

    // Draw red circle at specific coordinates
    service.canvas.circle(
        { lat: -38.2112142, lng: -69.2293903 },
        50,     // z-index
        40      // size (scales with zoom)
    ).change({
        "fill": "#FF0000",
        "fill-opacity": 0.7,
        "r": 10
    }).attach("click", () => {
        console.log("Circle clicked at -38.2112142, -69.2293903");
    }).attach("over", () => {
        console.log("Mouse over circle");
    }).attach("out", () => {
        console.log("Mouse left circle");
    });

    return {
        initialize: () => {},
        focus: () => {},
        blur: () => {}
    };
};
