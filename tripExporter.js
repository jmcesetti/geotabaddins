geotab.addin.tripExporter = function (api, state) {
    return {
        initialize: function (api, state, callback) {
            callback();
        },
        focus: function (api, state) {
            // Add button click handler
            const button = document.getElementById("addinButton_tripExporter");
            if (button) {
                button.onclick = async function () {
                    try {
                        const trips = state.data || [];
                        if (!trips.length) {
                            alert("No trips selected.");
                            return;
                        }

                        // Extract data for Excel
                        const data = trips.map(t => ({
                            Vehicle: t.device?.name || "",
                            Driver: t.driver?.name || "",
                            Start: new Date(t.start).toLocaleString(),
                            End: new Date(t.stop).toLocaleString(),
                            DurationMinutes: Math.round((new Date(t.stop) - new Date(t.start)) / 60000),
                            DistanceKm: (t.distance / 1000).toFixed(2)
                        }));

                        // Convert to worksheet
                        const ws = XLSX.utils.json_to_sheet(data);
                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, "Trips");

                        // Export
                        XLSX.writeFile(wb, "trip_history.xlsx");
                    } catch (err) {
                        console.error(err);
                        alert("Error exporting trips.");
                    }
                };
            }
        },
        blur: function () {}
    };
};
