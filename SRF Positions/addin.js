geotab.addin.srfPositions = (elt, service) => {
    var circle = null;

    elt.innerHTML = '<div id="srf-positions"><p>SRF Positions activo</p></div>';

    service.page.attach("focus", function() {
        if (circle) {
            circle.remove();
            circle = null;
        }

        circle = service.canvas.circle(
            { lat: -38.2112142, lng: -69.2293903 },
            50,
            40
        )
        .change({
            "fill": "#FF0000",
            "fill-opacity": 0.7,
            "stroke": "#CC0000",
            "stroke-width": 2,
            "r": 12
        })
        .attach("click", function() {
            console.log("Circle clicked at -38.2112142, -69.2293903");
        })
        .attach("over", function() {
            console.log("Mouse over circle");
        })
        .attach("out", function() {
            console.log("Mouse left circle");
        });

        console.log("SRF Positions focused - circle drawn");
    });

    service.page.attach("blur", function() {
        if (circle) {
            circle.remove();
            circle = null;
        }
        console.log("SRF Positions blurred");
    });
};
