geotab.addin.tripExporter = function (api, state) {
    return {
        initialize: function (api, state, callback) {
            callback();
        },
        focus: function (api, state) {},
        blur: function (api, state) {},
        click: async function () {
            try {
                // Obtener los viajes seleccionados
                const selectedTrips = state.getSelected ? state.getSelected() : state.data || [];

                if (!selectedTrips || !selectedTrips.length) {
                    alert("Por favor selecciona al menos un viaje.");
                    return;
                }

                // Crear datos para exportar
                const data = selectedTrips.map(t => ({
                    Vehículo: t.device?.name || "",
                    Conductor: t.driver?.name || "",
                    Inicio: new Date(t.start).toLocaleString(),
                    Fin: new Date(t.stop).toLocaleString(),
                    "Duración (min)": Math.round((new Date(t.stop) - new Date(t.start)) / 60000),
                    "Distancia (km)": (t.distance / 1000).toFixed(2)
                }));

                // Convertir a CSV
                const headers = Object.keys(data[0]).join(",");
                const rows = data.map(row => Object.values(row).join(","));
                const csvContent = [headers, ...rows].join("\n");

                // Descargar CSV
                const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = "trips_history.csv";
                link.click();

            } catch (error) {
                console.error("Error al exportar viajes:", error);
                alert("Ocurrió un error al exportar los viajes.");
            }
        }
    };
};
