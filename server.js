require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
// Render está detrás de un proxy: confiar en el primer salto para obtener la IP real.
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '10kb' }));

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET || ADMIN_PASSWORD;

// Los emails se guardan y se buscan siempre sin espacios y en minúsculas.
const normalizarEmail = (email) => String(email || '').trim().toLowerCase();
const COLACION_EMAIL = { locale: 'es', strength: 2 };

const SERVICIOS_VALIDOS = ['computadores', 'celulares', 'consolas'];
const ESTADOS_VALIDOS = ['Recibido', 'Diagnóstico', 'En Proceso', 'Entregado'];
const LIMITES = {
    nombre: 100,
    email: 254,
    telefono: 30,
    mensaje: 2000,
    mensajeMinimo: 5,
    password: 128
};

const limpiarTexto = (valor) => typeof valor === 'string' ? valor.trim() : '';
const esEmailValido = (email) => email.length <= LIMITES.email
    && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
const esTelefonoValido = (telefono) => {
    if (telefono.length < 7 || telefono.length > LIMITES.telefono) return false;
    if (!/^[+()\d\s.-]+$/.test(telefono)) return false;
    const digitos = telefono.replace(/\D/g, '');
    return digitos.length >= 7 && digitos.length <= 15;
};

// Limitador en memoria, suficiente para una sola instancia en Render.
function crearLimitador({ ventanaMs, maximo, mensaje }) {
    const registros = new Map();
    const limpieza = setInterval(() => {
        const ahora = Date.now();
        for (const [clave, registro] of registros) {
            if (registro.reinicio <= ahora) registros.delete(clave);
        }
    }, 60000);
    if (limpieza.unref) limpieza.unref();

    return (req, res, next) => {
        const ahora = Date.now();
        const clave = req.ip || req.socket.remoteAddress || 'desconocido';
        let registro = registros.get(clave);

        if (!registro || registro.reinicio <= ahora) {
            registro = { total: 0, reinicio: ahora + ventanaMs };
            registros.set(clave, registro);
        }

        registro.total += 1;
        const restantes = Math.max(0, maximo - registro.total);
        res.set('RateLimit-Limit', String(maximo));
        res.set('RateLimit-Remaining', String(restantes));
        res.set('RateLimit-Reset', String(Math.ceil(registro.reinicio / 1000)));

        if (registro.total > maximo) {
            res.set('Retry-After', String(Math.max(1, Math.ceil((registro.reinicio - ahora) / 1000))));
            return res.status(429).json({ error: mensaje });
        }

        next();
    };
}

const limitarContacto = crearLimitador({
    ventanaMs: 15 * 60 * 1000,
    maximo: Number(process.env.RATE_LIMIT_CONTACTO) || 10,
    mensaje: 'Demasiadas solicitudes desde esta conexión. Espera unos minutos e inténtalo de nuevo.'
});
const limitarLogin = crearLimitador({
    ventanaMs: 15 * 60 * 1000,
    maximo: Number(process.env.RATE_LIMIT_LOGIN) || 10,
    mensaje: 'Demasiados intentos de inicio de sesión. Espera unos minutos e inténtalo de nuevo.'
});
const limitarRegistro = crearLimitador({
    ventanaMs: 60 * 60 * 1000,
    maximo: Number(process.env.RATE_LIMIT_REGISTRO) || 5,
    mensaje: 'Demasiados registros desde esta conexión. Espera un rato e inténtalo de nuevo.'
});
const limitarAdminLogin = crearLimitador({
    ventanaMs: 15 * 60 * 1000,
    maximo: Number(process.env.RATE_LIMIT_ADMIN) || 5,
    mensaje: 'Demasiados intentos de acceso administrativo. Espera unos minutos.'
});

function validarContacto(body = {}) {
    const datos = {
        nombre: limpiarTexto(body.nombre),
        email: normalizarEmail(body.email),
        telefono: limpiarTexto(body.telefono),
        servicio: limpiarTexto(body.servicio).toLowerCase(),
        mensaje: limpiarTexto(body.mensaje)
    };
    const errores = {};

    if (datos.nombre.length < 2) {
        errores.nombre = 'Escribe tu nombre completo.';
    } else if (datos.nombre.length > LIMITES.nombre) {
        errores.nombre = `El nombre no puede superar ${LIMITES.nombre} caracteres.`;
    }

    if (!datos.email) {
        errores.email = 'Escribe tu correo electrónico.';
    } else if (!esEmailValido(datos.email)) {
        errores.email = 'Escribe un correo electrónico válido.';
    }

    if (!datos.telefono) {
        errores.telefono = 'Escribe tu teléfono o WhatsApp.';
    } else if (!esTelefonoValido(datos.telefono)) {
        errores.telefono = 'Escribe un teléfono válido (entre 7 y 15 dígitos).';
    }

    if (!SERVICIOS_VALIDOS.includes(datos.servicio)) {
        errores.servicio = 'Selecciona el tipo de dispositivo.';
    }

    if (datos.mensaje.length < LIMITES.mensajeMinimo) {
        errores.mensaje = 'Describe el problema con un poco más de detalle.';
    } else if (datos.mensaje.length > LIMITES.mensaje) {
        errores.mensaje = `El mensaje no puede superar ${LIMITES.mensaje} caracteres.`;
    }

    return { datos, errores };
}

// Verifica el token que entrega /api/admin/login.
function requireAdmin(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';

    if (!token) {
        return res.status(401).json({ error: 'Token de administrador requerido' });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        if (payload.role !== 'admin') {
            return res.status(403).json({ error: 'No autorizado' });
        }
        req.admin = payload;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
    }
}

// Verifica el token del cliente que entrega /api/login.
function requireCliente(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';

    if (!token) {
        return res.status(401).json({ error: 'Debes iniciar sesión' });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        if (payload.role !== 'cliente' || !payload.email) {
            return res.status(403).json({ error: 'No autorizado' });
        }
        req.cliente = payload;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Sesión inválida o expirada' });
    }
}

mongoose.connect(MONGO_URI)
    .then(() => console.log('🟢 Conectado exitosamente a MongoDB Atlas'))
    .catch(err => console.error('🔴 Error al conectar a MongoDB:', err));

// --- MODELO Y RUTAS DE SERVICIOS / CONTACTO ---
const serviceSchema = new mongoose.Schema({
    nombre: String,
    email: { type: String, lowercase: true, trim: true },
    telefono: String,
    servicio: String,
    mensaje: String,
    estado: { type: String, default: 'Recibido' }, // Recibido, Diagnóstico, En Proceso, Entregado
    fecha: { type: Date, default: Date.now }
});

const ServiceRequest = mongoose.model('ServiceRequest', serviceSchema);

// Crear nueva solicitud desde el formulario público
app.post('/api/contacto', limitarContacto, async (req, res) => {
    const { datos, errores } = validarContacto(req.body || {});

    if (Object.keys(errores).length > 0) {
        return res.status(400).json({
            error: 'Revisa los campos marcados.',
            errores
        });
    }

    try {
        const nuevaSolicitud = new ServiceRequest(datos);
        await nuevaSolicitud.save();
        res.status(201).json({ mensaje: '¡Solicitud guardada en MongoDB con éxito!' });
    } catch (error) {
        console.error('Error al guardar contacto:', error);
        res.status(500).json({ error: 'Hubo un error al guardar la solicitud' });
    }
});

// Obtener todas las solicitudes (Para el Panel Admin)
app.get('/api/admin/servicios', requireAdmin, async (req, res) => {
    try {
        const servicios = await ServiceRequest.find().sort({ fecha: -1 });
        res.json(servicios);
    } catch (error) {
        console.error('Error al obtener servicios admin:', error);
        res.status(500).json({ error: 'Error al obtener todos los servicios' });
    }
});

// Actualizar estado o detalle de una solicitud (solo administrador)
app.put('/api/admin/servicios/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ error: 'ID de servicio inválido' });
        }

        const { mensaje, estado } = req.body;
        const updateData = {};

        if (mensaje !== undefined) {
            const mensajeLimpio = limpiarTexto(mensaje);
            if (mensajeLimpio.length < LIMITES.mensajeMinimo) {
                return res.status(400).json({ error: 'El mensaje es demasiado corto' });
            }
            if (mensajeLimpio.length > LIMITES.mensaje) {
                return res.status(400).json({ error: 'El mensaje es demasiado largo' });
            }
            updateData.mensaje = mensajeLimpio;
        }

        if (estado !== undefined) {
            if (!ESTADOS_VALIDOS.includes(estado)) {
                return res.status(400).json({ error: 'Estado inválido' });
            }
            updateData.estado = estado;
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'Nada que actualizar' });
        }

        const servicio = await ServiceRequest.findByIdAndUpdate(
            id,
            updateData,
            { returnDocument: 'after' }
        );
        if (!servicio) {
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }

        res.json({ mensaje: 'Servicio actualizado correctamente', servicio });
    } catch (error) {
        console.error('Error al actualizar servicio (admin):', error);
        res.status(500).json({ error: 'Error al actualizar el servicio' });
    }
});

// Eliminar una solicitud (solo administrador)
app.delete('/api/admin/servicios/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ error: 'ID de servicio inválido' });
        }

        const servicio = await ServiceRequest.findByIdAndDelete(id);
        if (!servicio) {
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }

        res.json({ mensaje: 'Solicitud eliminada correctamente' });
    } catch (error) {
        console.error('Error al eliminar servicio (admin):', error);
        res.status(500).json({ error: 'Error al eliminar el servicio' });
    }
});

// Obtener las solicitudes del cliente autenticado (el email sale del token)
app.get('/api/mis-servicios', requireCliente, async (req, res) => {
    try {
        const servicios = await ServiceRequest
            .find({ email: normalizarEmail(req.cliente.email) })
            .collation(COLACION_EMAIL)
            .sort({ fecha: -1 });
        res.json(servicios);
    } catch (error) {
        console.error('Error al obtener servicios del cliente:', error);
        res.status(500).json({ error: 'Error al obtener los servicios' });
    }
});

// Actualizar el detalle de una solicitud propia (no permite cambiar el estado)
app.put('/api/mis-servicios/:id', requireCliente, async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ error: 'ID de servicio inválido' });
        }

        const mensajeLimpio = limpiarTexto(req.body?.mensaje);
        if (mensajeLimpio.length < LIMITES.mensajeMinimo) {
            return res.status(400).json({ error: 'El mensaje es demasiado corto' });
        }
        if (mensajeLimpio.length > LIMITES.mensaje) {
            return res.status(400).json({ error: 'El mensaje es demasiado largo' });
        }

        const servicioActualizado = await ServiceRequest.findOneAndUpdate(
            { _id: id, email: normalizarEmail(req.cliente.email) },
            { mensaje: mensajeLimpio },
            { returnDocument: 'after' }
        ).collation(COLACION_EMAIL);

        if (!servicioActualizado) {
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }

        res.json({ mensaje: 'Servicio actualizado correctamente', servicio: servicioActualizado });
    } catch (error) {
        console.error('Error al actualizar servicio del cliente:', error);
        res.status(500).json({ error: 'Error al actualizar el servicio' });
    }
});

// --- MODELO Y RUTAS DE USUARIOS ---
const userSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    fechaRegistro: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Registro de usuario con bcryptjs
app.post('/api/registro', limitarRegistro, async (req, res) => {
    try {
        const { nombre, email, password } = req.body || {};
        const nombreLimpio = limpiarTexto(nombre);
        const emailNormalizado = normalizarEmail(email);
        const passwordSegura = typeof password === 'string' ? password : '';
        const errores = {};

        if (nombreLimpio.length < 2) {
            errores.nombre = 'Escribe tu nombre completo.';
        } else if (nombreLimpio.length > LIMITES.nombre) {
            errores.nombre = `El nombre no puede superar ${LIMITES.nombre} caracteres.`;
        }

        if (!emailNormalizado) {
            errores.email = 'Escribe tu correo electrónico.';
        } else if (!esEmailValido(emailNormalizado)) {
            errores.email = 'Escribe un correo electrónico válido.';
        }

        if (passwordSegura.length < 6) {
            errores.password = 'La contraseña debe tener al menos 6 caracteres.';
        } else if (passwordSegura.length > LIMITES.password) {
            errores.password = `La contraseña no puede superar ${LIMITES.password} caracteres.`;
        }

        if (Object.keys(errores).length > 0) {
            return res.status(400).json({
                error: 'Revisa los campos marcados.',
                errores
            });
        }

        const usuarioExiste = await User
            .findOne({ email: emailNormalizado })
            .collation(COLACION_EMAIL);

        if (usuarioExiste) {
            return res.status(400).json({
                error: 'El correo electrónico ya está registrado',
                errores: { email: 'Este correo ya tiene una cuenta.' }
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(passwordSegura, salt);

        const nuevoUsuario = new User({
            nombre: nombreLimpio,
            email: emailNormalizado,
            password: hashedPassword
        });

        await nuevoUsuario.save();
        res.status(201).json({ mensaje: '¡Usuario registrado con éxito!' });

    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ error: 'Error al registrar el usuario' });
    }
});

// Login de usuario
app.post('/api/login', limitarLogin, async (req, res) => {
    try {
        const { email, password } = req.body || {};
        const emailNormalizado = normalizarEmail(email);
        const passwordSegura = typeof password === 'string' ? password : '';

        if (!emailNormalizado || !passwordSegura || passwordSegura.length > LIMITES.password) {
            return res.status(400).json({ error: 'Correo y contraseña requeridos' });
        }

        const usuario = await User
            .findOne({ email: emailNormalizado })
            .collation(COLACION_EMAIL);

        if (!usuario) {
            return res.status(400).json({ error: 'Usuario o contraseña incorrectos' });
        }

        const passwordValido = await bcrypt.compare(passwordSegura, usuario.password);
        if (!passwordValido) {
            return res.status(400).json({ error: 'Usuario o contraseña incorrectos' });
        }

        const token = jwt.sign(
            {
                role: 'cliente',
                id: usuario._id.toString(),
                email: normalizarEmail(usuario.email)
            },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.status(200).json({
            mensaje: '¡Inicio de sesión exitoso!',
            token,
            usuario: {
                id: usuario._id,
                nombre: usuario.nombre,
                email: normalizarEmail(usuario.email)
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error al iniciar sesión' });
    }
});

// --- AUTENTICACIÓN PROTEGIDA DEL ADMINISTRADOR ---
app.post('/api/admin/login', limitarAdminLogin, (req, res) => {
    try {
        const { password } = req.body || {};

        if (!ADMIN_PASSWORD) {
            return res.status(500).json({ success: false, error: 'Administrador no configurado en el servidor' });
        }

        if (typeof password === 'string' && password.length <= 200 && password === ADMIN_PASSWORD) {
            const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '2h' });
            return res.status(200).json({
                success: true,
                token,
                mensaje: 'Acceso de administrador autorizado'
            });
        }

        return res.status(401).json({ success: false, error: 'Contraseña de administrador incorrecta' });
    } catch (error) {
        console.error('Error validando administrador:', error);
        res.status(500).json({ error: 'Error al validar credenciales del administrador' });
    }
});

// --- RUTA DE SALUD (para verificar el despliegue) ---
app.get('/', (req, res) => {
    res.json({ service: 'TecniPro API', status: 'ok' });
});

// Respuestas JSON uniformes para bodies inválidos o demasiado grandes.
app.use((err, req, res, next) => {
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ error: 'La solicitud es demasiado grande' });
    }
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'Solicitud inválida' });
    }
    console.error('Error no controlado:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
});

// --- INICIAR SERVIDOR ---
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});