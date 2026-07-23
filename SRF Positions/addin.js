geotab.addin.srfPositions = function (elt, service) {
    var circle = null;

    var LAT = -38.2112142;
    var LNG = -69.2293903;
    var RADIUS = 12;
    var Z_INDEX = 10;

    function drawCircle() {
        if (circle) {
            circle.remove();
            circle = null;
        }

        circle = service.canvas.circle({ lat: LAT, lng: LNG }, RADIUS, Z_INDEX)
            .change({
                "fill": "#FF0000",
                "fill-opacity": 0.7,
                "stroke": "#CC0000",
                "stroke-width": 2
            })
            .attach("click", function () {
                console.log("SRF: circulo clickeado");
            })
            .attach("over", function (coords) {
                service.tooltip.showAt(
                    coords,
                    {
                        main: "Posicion SRF",
                        secondary: ["Lat: " + LAT, "Lng: " + LNG]
                    },
                    1
                );
            })
            .attach("out", function () {
                service.tooltip.hide();
            });

        console.log("SRF Positions: circulo dibujado en", LAT, LNG);
    }

    function clearCircle() {
        if (circle) {
            circle.remove();
            circle = null;
            console.log("SRF Positions: circulo eliminado");
        }
    }

    // Build the panel UI
    elt.innerHTML = [
        '<div class="srf-panel">',
        '  <h3 class="srf-title">SRF Positions</h3>',
        '  <div class="srf-coords">',
        '    <span class="srf-label">Lat:</span> ' + LAT,
        '    <br>',
        '    <span class="srf-label">Lng:</span> ' + LNG,
        '  </div>',
        '  <div class="srf-actions">',
        '    <button id="srf-draw" class="srf-btn srf-btn--primary">Dibujar</button>',
        '    <button id="srf-clear" class="srf-btn srf-btn--secondary">Limpiar</button>',
        '  </div>',
        '  <div id="srf-status" class="srf-status"></div>',
        '</div>'
    ].join('');

    elt.querySelector("#srf-draw").addEventListener("click", function () {
        drawCircle();
        elt.querySelector("#srf-status").textContent = "Circulo dibujado.";
    });

    elt.querySelector("#srf-clear").addEventListener("click", function () {
        clearCircle();
        elt.querySelector("#srf-status").textContent = "Limpiar.";
    });

    // Draw immediately on load
    drawCircle();
};
