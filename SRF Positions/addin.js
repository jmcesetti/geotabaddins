geotab.addin.srfPositions = function(api, state) {
    return {
        initialize: function(api, state, callback) {
            callback();
        },
        focus: function(api, state, callback) {
            const mapElement = document.getElementById('mapDiv');
            if (!mapElement) return;

            mapElement.innerHTML = '<div class="addin"><h3>SRF Positions</h3><p class="info">Posiciones en coordenadas -38.2112142, -69.2293903. Muévete en el mapa y haz zoom para verlas interactuar.</p></div>';

            api.canvas.circle(
                { lat: -38.2112142, lng: -69.2293903 },
                50,
                40
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

            if (callback) callback();
        },
        blur: function() {}
    };
};
