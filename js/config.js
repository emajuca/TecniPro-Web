/* =========================================================
   CONFIGURACIÓN DE LA API
   ---------------------------------------------------------
   En local (localhost o abriendo el HTML con doble clic) usa
   el backend de tu PC. En GitHub Pages usa el backend
   desplegado en Render.

   Si el servicio de Render tiene otro nombre, cambia solo
   la URL de la última línea.
   ========================================================= */

(() => {
    const isLocal = window.location.protocol === 'file:'
        || ['localhost', '127.0.0.1'].includes(window.location.hostname);

    window.TECNIPRO_API = isLocal
        ? 'http://localhost:3000'
        : 'https://tecnipro-api.onrender.com';
})();
