// tripExporter.js

geotab.customButtons.tripExporter = async (event, api, state) => {
  'use strict';

  event.preventDefault();

  try {
    console.log("✅ Botón Exportar Viaje presionado!");
    // Abre una nueva pestaña en Chrome
    window.open("https://www.google.com", "_blank");
  } catch (error) {
    console.error("❌ Error ejecutando tripExporter:", error);
    alert("Ocurrió un error al ejecutar el botón.");
  }
};
