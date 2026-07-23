geotab.addin.srfPositions = function (elt, service) {
    var circle = null;

    elt.innerHTML = [
        '<div id="srf-positions">',
        '  <button id="srf-draw">Dibujar circulo</button>',
        '  <button id="srf-clear">Limpiar</button>',
        '</div>'
    ].join('');

    function drawCircle() {
        if (circle) {
            circle.remove();
            circle = null;
        }

        circle = service.canvas.circle({ lat: -38.2112142, lng: -69.2293903 }, 50, 40)
            .change({
                "fill": "#FF0000",
                "fill-opacity": 0.7,
                "stroke": "#CC0000",
                "stroke-width": 2,
                "r": 12
            })
            .attach("click", function () {
                console.log("Circulo clickeado: -38.2112142, -69.2293903");
            })
            .attach("over", function () {
                service.tooltip.showAt(
                    { x: 0, y: 0 },
                    { main: "Posicion SRF", secondary: ["Lat: -38.2112142", "Lng: -69.2293903"] },
                    1
                );
                console.log("Mouse sobre el circulo");
            })
            .attach("out", function () {
                service.tooltip.hide();
                console.log("Mouse fuera del circulo");
            });

        console.log("Circulo SRF dibujado");
    }

    function clearCircle() {
        if (circle) {
            circle.remove();
            circle = null;
        }
        console.log("Circulo SRF eliminado");
    }

    elt.querySelector("#srf-draw").addEventListener("click", function () {
        drawCircle();
    }, false);

    elt.querySelector("#srf-clear").addEventListener("click", function () {
        clearCircle();
    }, false);
};
