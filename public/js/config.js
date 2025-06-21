/**
 * Define la URL base de la API dependiendo del entorno (desarrollo o producción).
 * Esto permite que el frontend funcione tanto localmente como en el servidor de producción
 * sin necesidad de cambiar las URLs manualmente.
 */
const getApiBaseUrl = () => {
    // Si la página se carga desde localhost, es el entorno de desarrollo.
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000';
    }
    // De lo contrario, es el entorno de producción.
    return 'https://libreria-ia-backend.onrender.com';
};

// Se define la constante que se usará en toda la aplicación.
const API_BASE_URL = getApiBaseUrl();

console.log(`API Base URL: ${API_BASE_URL}`); 