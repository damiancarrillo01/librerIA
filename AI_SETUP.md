# Configuración de la API de IA - LibreriaIA

## Configuración de Variables de Entorno

Para que la API de IA funcione correctamente, necesitas crear un archivo `.env` en la raíz del proyecto con las siguientes variables:

### 1. Variables de Firebase (ya existentes)
```
FIREBASE_PROJECT_ID=tu-proyecto-id
FIREBASE_PRIVATE_KEY_ID=tu-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nTu-clave-privada-aqui\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=tu-client-email@tu-proyecto.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=tu-client-id
FIREBASE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/tu-client-email%40tu-proyecto.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
```

### 2. Nueva Variable para Google Generative AI
```
GOOGLE_AI_API_KEY=tu-clave-api-de-google-generative-ai
```

## Cómo Obtener la Clave de API de Google Generative AI

1. **Ve a Google AI Studio**: https://makersuite.google.com/app/apikey
2. **Inicia sesión** con tu cuenta de Google
3. **Crea una nueva clave de API**:
   - Haz clic en "Create API Key"
   - Copia la clave generada
4. **Pega la clave** en tu archivo `.env` como valor de `GOOGLE_AI_API_KEY`

## Estructura del Archivo .env

Crea un archivo llamado `.env` en la raíz del proyecto con este contenido:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=tu-proyecto-id
FIREBASE_PRIVATE_KEY_ID=tu-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nTu-clave-privada-aqui\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=tu-client-email@tu-proyecto.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=tu-client-id
FIREBASE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/tu-client-email%40tu-proyecto.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com

# Google Generative AI (Gemini) API Key
GOOGLE_AI_API_KEY=tu-clave-api-de-google-generative-ai

# Otras configuraciones
NODE_ENV=development
PORT=3000
```

## Nuevas Funcionalidades de IA

### 1. Sugerencias Inteligentes
- **Endpoint**: `POST /api/ai/sugerir`
- **Funcionalidad**: Obtiene sugerencias de productos usando IA
- **Parámetros**: `item`, `cantidad`, `calidad`, `contexto`

### 2. Generación de Listas Inteligentes
- **Endpoint**: `POST /api/ai/generar-lista`
- **Funcionalidad**: Genera listas de compras completas usando IA
- **Parámetros**: `tipo_lista`, `calidad`, `items_adicionales`

### 3. Análisis de Tendencias
- **Endpoint**: `GET /api/ai/tendencias/:userId`
- **Funcionalidad**: Analiza el historial de compras del usuario
- **Parámetros**: `userId` en la URL

### 4. Procesamiento Completo de Listas
- **Endpoint**: `POST /api/ai/procesar`
- **Funcionalidad**: Genera y guarda listas completas en Firebase
- **Parámetros**: `listType`, `quality`, `additionalItems`

## Verificación de la Configuración

Para verificar que todo está configurado correctamente:

1. **Reinicia el servidor** después de crear el archivo `.env`
2. **Verifica los logs** del servidor - deberías ver mensajes de inicialización de Firebase y IA
3. **Prueba un endpoint** de IA para confirmar que funciona

## Notas Importantes

- **Seguridad**: Nunca subas el archivo `.env` a Git (ya está en `.gitignore`)
- **Límites de API**: Google Generative AI tiene límites de uso, revisa la documentación oficial
- **Fallback**: Si la API de IA falla, el sistema usa sugerencias locales como respaldo
- **Costo**: El uso de Google Generative AI puede generar costos, revisa los precios en la consola de Google

## Solución de Problemas

### Error: "GOOGLE_AI_API_KEY no está definida"
- Verifica que el archivo `.env` existe en la raíz del proyecto
- Asegúrate de que la variable `GOOGLE_AI_API_KEY` esté correctamente definida
- Reinicia el servidor después de crear/modificar el archivo `.env`

### Error: "API key not valid"
- Verifica que la clave de API sea correcta
- Asegúrate de que la clave tenga permisos para Google Generative AI
- Revisa que no haya espacios extra en la clave

### Error: "Rate limit exceeded"
- La API tiene límites de uso, espera un momento antes de hacer más solicitudes
- Considera implementar cache para reducir el número de llamadas a la API 