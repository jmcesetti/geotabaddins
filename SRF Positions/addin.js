geotab.addin.srfPositions = function(api, state) {
    var circle = null;

    return {
        initialize: function(api, state, callback) {
            window.geotabApi = api;
            window.geotabMap = state.map;

            console.log("SRF Positions initialized");

            callback();
        },

        focus: function() {
            if (!window.geotabApi || !window.geotabMap) {
                console.error("Map or API not available");
                return;
            }

            if (circle) {
                circle.remove();
                circle = null;
            }

            circle = window.geotabApi.canvas.circle(
                { lat: -38.2112142, lng: -69.2293903 },
                12
            );

            circle.change({
                "fill": "#FF0000",
                "fill-opacity": 0.7,
                "stroke": "#CC0000",
                "stroke-width": 2
            });

            circle.attach("click", function() {
                console.log("Circle clicked at -38.2112142, -69.2293903");
            });

            circle.attach("over", function() {
                console.log("Mouse over circle");
            });

            circle.attach("out", function() {
                console.log("Mouse left circle");
            });

            console.log("SRF Positions focused - circle drawn");
        },

        blur: function() {
            if (circle) {
                circle.remove();
                circle = null;
            }
            console.log("SRF Positions blurred");
        }
    };
};
