button.onclick = async function () {
    try {
        const result = await api.call("Get", {
            typeName: "Trip",
            resultsLimit: 100,
            search: {
                fromDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                toDate: new Date().toISOString()
            }
        });
        const trips = result || [];
        if (!trips.length) {
            alert("No trips found.");
            return;
        }

        const data = trips.map(t => ({
            Vehicle: t.device?.name || "",
            Driver: t.driver?.name || "",
            Start: new Date(t.start).toLocaleString(),
            End: new Date(t.stop).toLocaleString(),
            DurationMinutes: Math.round((new Date(t.stop) - new Date(t.start)) / 60000),
            DistanceKm: (t.distance / 1000).toFixed(2)
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Trips");
        XLSX.writeFile(wb, "trip_history.xlsx");
    } catch (err) {
        console.error(err);
        alert("Error exporting trips.");
    }
};
