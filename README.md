# 📚 LibreriaIA: Asistente de Compras de Librería con IA

## 🎯 Objetivo del Proyecto

`LibreriaIA` es un sistema de asistente de compras inteligente diseñado para optimizar el proceso de compra de útiles escolares y de oficina. La aplicación permite a los usuarios crear listas de compras y utiliza Inteligencia Artificial para sugerir productos del catálogo, ofreciendo comparativas de precios y categorías de calidad.

## ✨ Características

- **Gestión de Listas de Compras:** Crear y gestionar múltiples listas de útiles
- **Sugerencias de IA:** Recomendaciones inteligentes de productos basadas en el inventario
- **Filtros de Calidad:** Económico, Intermedio y Calidad Premium
- **Búsqueda de Productos:** Sistema de búsqueda en tiempo real
- **Exportación PDF:** Generar comprobantes de compra profesionales
- **Listas Predefinidas:** Plantillas para diferentes niveles educativos
- **Integración Firebase:** Sincronización automática con Firestore
- **Interfaz Responsiva:** Diseño moderno con Bootstrap 5

## 🛠️ Tecnologías Utilizadas

### Backend
- **Node.js** - Runtime de JavaScript
- **Express.js** - Framework web
- **MongoDB** - Base de datos NoSQL
- **Mongoose** - ODM para MongoDB
- **Firebase Admin SDK** - Integración con servicios de Firebase

### Frontend
- **Bootstrap 5** - Framework CSS
- **Font Awesome** - Iconos
- **JavaScript ES6+** - Funcionalidad del cliente
- **EJS** - Motor de plantillas

### Servicios
- **Firebase Firestore** - Base de datos en la nube
- **Firebase Storage** - Almacenamiento de archivos
- **PDFKit** - Generación de PDFs

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js 18.0.0 o superior
- MongoDB (local o Atlas)
- Cuenta de Firebase

### 1. Clonar el repositorio
```bash
git clone https://github.com/damiancarrillo01/librerIA.git
cd librerIA
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
```bash
cp env.example .env
```

Editar el archivo `.env` con tus configuraciones:
```env
# Configuración del servidor
PORT=3000
NODE_ENV=development

# Base de datos MongoDB
MONGODB_URI=mongodb://localhost:27017/libreria-ia

# Sesiones
SESSION_SECRET=tu-session-secret-aqui

# Firebase Configuration
FIREBASE_PROJECT_ID=tu-proyecto-id
FIREBASE_PRIVATE_KEY_ID=tu-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nTu-clave-privada-aqui\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=tu-service-account@tu-proyecto.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=tu-client-id
FIREBASE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/tu-service-account%40tu-proyecto.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com

# JWT Secret
JWT_SECRET=tu-jwt-secret-aqui
```

### 4. Configurar Firebase
1. Crear un proyecto en [Firebase Console](https://console.firebase.google.com/)
2. Habilitar Firestore Database y Storage
3. Crear una cuenta de servicio y descargar el archivo JSON
4. Colocar el archivo JSON en la raíz del proyecto como `proyecto1-d6fb7-firebase-adminsdk-bz4ej-2bbed03ae6.json`

### 5. Ejecutar el servidor
```bash
# Desarrollo
npm run dev

# Producción
npm start
```

El servidor estará disponible en `http://localhost:3000`

## 📁 Estructura del Proyecto

```
librerIA/
├── config/                 # Configuraciones
│   └── firebase.js        # Configuración de Firebase
├── models/                 # Modelos de datos
│   ├── Product.js         # Modelo de productos
│   ├── ShoppingList.js    # Modelo de listas de compras
│   └── ShoppingListItem.js # Modelo de ítems de lista
├── routes/                 # Rutas de la API
│   ├── shopping.js        # Rutas de listas de compras
│   ├── products.js        # Rutas de productos
│   └── auth.js            # Rutas de autenticación
├── services/               # Servicios y lógica de negocio
│   └── aiService.js       # Servicio de IA y sugerencias
├── public/                 # Archivos estáticos
│   ├── css/
│   │   └── style.css      # Estilos personalizados
│   └── js/
│       └── main.js        # JavaScript del cliente
├── views/                  # Plantillas EJS
│   ├── layout.ejs         # Plantilla base
│   └── home.ejs           # Página de inicio
├── server.js              # Servidor principal
├── package.json           # Dependencias y scripts
├── env.example            # Variables de entorno de ejemplo
└── README.md              # Este archivo
```

## 🔧 Comandos Útiles

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo (con nodemon)
npm run dev

# Ejecutar en producción
npm start

# Construir para producción
npm run build

# Ejecutar tests (cuando se implementen)
npm test
```

## 🌐 API Endpoints

### Listas de Compras
- `GET /api/shopping` - Obtener todas las listas
- `POST /api/shopping` - Crear nueva lista
- `GET /api/shopping/:id` - Obtener lista específica
- `POST /api/shopping/standard/:type` - Crear lista estándar
- `POST /api/shopping/:id/items` - Agregar ítem a lista
- `PUT /api/shopping/:listId/items/:itemId` - Actualizar ítem
- `DELETE /api/shopping/:listId/items/:itemId` - Eliminar ítem
- `GET /api/shopping/:id/export-pdf` - Exportar lista a PDF

### Productos
- `GET /api/products` - Obtener todos los productos
- `POST /api/products` - Crear nuevo producto
- `PUT /api/products/:id` - Actualizar producto
- `DELETE /api/products/:id` - Eliminar producto
- `POST /api/products/search` - Buscar productos
- `GET /api/products/:id` - Obtener producto específico

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register` - Registrarse
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/me` - Verificar sesión

## 🚀 Despliegue en Firebase

### 1. Instalar Firebase CLI
```bash
npm install -g firebase-tools
```

### 2. Inicializar Firebase
```bash
firebase login
firebase init hosting
```

### 3. Configurar hosting
```json
{
  "hosting": {
    "public": "public",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

### 4. Desplegar
```bash
firebase deploy
```

## 🤝 Contribución

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crea un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 📞 Contacto

- **Gonzalo Garcés Santana** - [@Gonzalolo1123](https://github.com/Gonzalolo1123)
- **Damian Carrillo** - [@damiancarrillo01](https://github.com/damiancarrillo01)

---

**Desarrollado con ❤️ y Node.js**
