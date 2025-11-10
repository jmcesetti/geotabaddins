"use strict";

geotab.customButtons.tripExporter = function (event, api, state) {
  event.preventDefault();

  // Obtener el estado actual (viajes seleccionados, etc.)
  const currentState = state.getState ? state.getState() : state;
  const selectedTrip = currentState?.id || null;

  // Si no hay viaje seleccionado
  if (!selectedTrip || !Array.isArray(selectedTrip) || selectedTrip.length === 0) {
    alert("Por favor seleccioná un viaje primero.");
    return;
  }

  // Por ahora: abrimos una nueva pestaña con un mensaje simple
  const tripInfo = selectedTrip.join(", ");
  const newWindow = window.open("", "_blank");

  newWindow.document.write(`
    <html>
      <head>
        <title>Exportar Viaje</title>
        <style>
          body { font-family: Arial; padding: 20px; }
          h2 { color: #2a6; }
        </style>
      </head>
      <body>
        <h2>Viaje seleccionado</h2>
        <p><b>ID(s):</b> ${tripInfo}</p>
        <p>Más información será exportada aquí...</p>
      </body>
    </html>
  `);
};

