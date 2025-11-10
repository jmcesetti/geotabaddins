geotab.addin.tripExporter = function(api, state) {
  return {
    initialize: function(api, state, callback) {
      callback(); // Obligatorio: le dice a Geotab que el add-in está listo
    },
    focus: function(api, state) {
      alert("✅ Add-In cargado correctamente");
      window.open("https://www.google.com", "_blank");
    },
    blur: function() {
      // opcional: cuando el usuario sale de la página
    }
  };
};
