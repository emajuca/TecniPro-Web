# TecniPro | Servicio Técnico a Domicilio

Sitio web y API para solicitar y gestionar servicios técnicos a domicilio de computadores, celulares y consolas. Incluye landing pública, registro e inicio de sesión de clientes, panel de seguimiento de solicitudes, panel administrativo y asistente virtual.

**Sitio publicado:** <https://emajuca.github.io/TecniPro-Web/>  
**API publicada:** <https://tecnipro-api.onrender.com>

## Funcionalidades

### Sitio público
- Landing con servicios, beneficios, preguntas frecuentes y formulario de contacto.
- Validación de datos en cliente y servidor.
- Registro e inicio de sesión de clientes en un modal accesible.
- Botones directos a WhatsApp y asistente virtual **TecniBot**.
- Páginas legales de privacidad, términos, tratamiento de datos y garantía.

### Panel del cliente
- Seguimiento del estado de cada solicitud: Recibido, Diagnóstico, En Proceso y Entregado.
- Barra de progreso visual por servicio.
- Edición del detalle o requerimiento de una solicitud propia.
- Acceso directo a WhatsApp para solicitar más información.
- Menú de perfil con acceso al inicio y cierre de sesión.

### Panel administrativo
- Acceso protegido con contraseña y token temporal.
- Listado de todas las solicitudes.
- Cambio de estado y edición del detalle.
- Eliminación de solicitudes.

### Experiencia de uso
- Diseño responsive con menú móvil accesible.
- Navegación por teclado y cierre de menús con `Escape`.
- Logo optimizado para pantallas de alta densidad.
- Sesión de cliente persistida en `sessionStorage` con validación de expiración.

## Tecnologías

**Frontend:** HTML5, CSS3 y JavaScript vanilla. Sin framework ni paso de compilación.

**Backend:** Node.js 20.19 o superior, Express 5, Mongoose, JWT, bcryptjs, CORS y dotenv.

**Base de datos:** MongoDB Atlas (también compatible con una instancia local de MongoDB).

## Estructura del proyecto

```text
TecniPro-Web/
├── index.html              # Landing pública
├── dashboard.html          # Panel del cliente
├── admin.html              # Panel administrativo
├── server.js               # API Express y conexión a MongoDB
├── scripts.js              # Lógica general del sitio y del login
├── js/
│   ├── config.js           # URL de la API según el entorno
│   ├── dashboard.js        # Lógica del panel del cliente
│   ├── admin.js            # Lógica del panel administrativo
│   └── chatbot.js          # Asistente virtual TecniBot
├── css/
│   ├── reset.css
│   ├── styles.css          # Estilos globales
│   ├── dashboard.css
│   ├── chatbot.css
│   ├── whatsapp.css
│   └── legal.css
├── assets/img/             # Logo y recursos gráficos
├── legal html/             # Políticas y documentos legales
└── package.json
```

## Requisitos

- [Node.js](https://nodejs.org/) 20.19 o superior.
- npm.
- Una base de datos MongoDB (Atlas o local).
- Un servidor estático para el frontend en local (Live Server, `npx serve`, etc.).

## Configuración local

1. Clona el repositorio e instala las dependencias:

   ```bash
   git clone https://github.com/emajuca/TecniPro-Web.git
   cd TecniPro-Web
   npm install
   ```

2. Crea un archivo `.env` en la raíz del proyecto con las variables indicadas abajo. No subas este archivo al repositorio.

3. Inicia la API:

   ```bash
   npm start
   ```

   La API queda disponible en `http://localhost:3000`.

4. Sirve el frontend desde la raíz del proyecto. Por ejemplo:

   ```bash
   npx serve . -l 8080
   ```

   Luego abre `http://localhost:8080`.

   También puedes abrir `index.html` directamente o usar una extensión como Live Server. `js/config.js` detecta si estás en local y apunta a `http://localhost:3000`.

5. Para entrar al panel administrativo abre `http://localhost:8080/admin.html` e ingresa la contraseña definida en `ADMIN_PASSWORD`.

### Variables de entorno

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `MONGO_URI` | Sí | Cadena de conexión a MongoDB. |
| `ADMIN_PASSWORD` | Sí, para el panel admin | Contraseña de acceso administrativo. |
| `JWT_SECRET` | Recomendada | Secreto para firmar los tokens. Si no se define, se usa `ADMIN_PASSWORD`. |
| `PORT` | No | Puerto de la API. Por defecto `3000`. |
| `RATE_LIMIT_CONTACTO` | No | Máximo de solicitudes de contacto por IP cada 15 minutos. Por defecto `10`. |
| `RATE_LIMIT_LOGIN` | No | Máximo de intentos de login de cliente por IP cada 15 minutos. Por defecto `10`. |
| `RATE_LIMIT_REGISTRO` | No | Máximo de registros por IP cada hora. Por defecto `5`. |
| `RATE_LIMIT_ADMIN` | No | Máximo de intentos de login administrativo por IP cada 15 minutos. Por defecto `5`. |

> `.env` está incluido en `.gitignore`. Nunca publiques la cadena de MongoDB, el secreto JWT ni contraseñas reales.

## API

Base local: `http://localhost:3000`  
Base publicada: `https://tecnipro-api.onrender.com`

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| `GET` | `/` | Público | Estado del servicio. |
| `POST` | `/api/contacto` | Público | Crea una solicitud de servicio. |
| `POST` | `/api/registro` | Público | Registra un cliente nuevo. |
| `POST` | `/api/login` | Público | Inicia sesión y devuelve un token de cliente (8 h). |
| `GET` | `/api/mis-servicios` | Cliente | Lista las solicitudes del cliente autenticado. |
| `PUT` | `/api/mis-servicios/:id` | Cliente | Actualiza el detalle de una solicitud propia. |
| `POST` | `/api/admin/login` | Público | Valida la contraseña y devuelve un token de admin (2 h). |
| `GET` | `/api/admin/servicios` | Admin | Lista todas las solicitudes. |
| `PUT` | `/api/admin/servicios/:id` | Admin | Cambia el estado o el detalle de una solicitud. |
| `DELETE` | `/api/admin/servicios/:id` | Admin | Elimina una solicitud. |

Las rutas protegidas esperan el token en la cabecera:

```http
Authorization: Bearer <token>
```

Todas las respuestas son JSON. Los errores de validación devuelven `400` con un objeto `errores` por campo.

## Seguridad

- Contraseñas de clientes cifradas con bcryptjs (10 rondas).
- Tokens JWT con expiración: 8 horas para clientes y 2 horas para administradores.
- Validación y límites de longitud en servidor para nombres, correos, teléfonos, mensajes y contraseñas.
- Límite de tamaño de las solicitudes JSON a 10 KB.
- Rate limiting por IP en contacto, registro, login y acceso administrativo.
- `trust proxy` configurado para obtener la IP real detrás de Render.
- CORS habilitado para separar el frontend estático de la API.

El limitador de peticiones funciona en memoria y está pensado para una sola instancia del servidor.

## Despliegue

- **Frontend:** GitHub Pages sirve la rama `main` desde la raíz del repositorio. Cada push a `main` publica los cambios automáticamente.
- **Backend:** Render ejecuta `npm start` desde `main`. Configura las variables de entorno en el panel de Render, no en el repositorio.
- **Comprobación rápida:** `GET /` debe responder `{"service":"TecniPro API","status":"ok"}`.

### Caché de assets

Los HTML referencian CSS y JavaScript con un parámetro de versión, por ejemplo `styles.css?v=20261117c`. Al modificar esos archivos, actualiza el valor de `?v=` en las páginas correspondientes para que los navegadores descarguen la versión nueva.

## Accesibilidad y rendimiento

- Enlace para saltar al contenido principal.
- Menús y modales con atributos ARIA, cierre con `Escape` y manejo de foco.
- Contraste y jerarquía de encabezados revisados.
- Logo reducido de 447 KB a 32 KB manteniendo la nitidez en pantallas retina.
- Auditorías de Lighthouse con 100 en Accesibilidad y Buenas Prácticas en las páginas principales.

## Licencia

ISC. Consulta `package.json` para más detalles.
