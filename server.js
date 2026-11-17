require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET || ADMIN_PASSWORD;

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
    email: String,
    telefono: String,
    servicio: String,
    mensaje: String,
    estado: { type: String, default: 'Recibido' }, // Recibido, Diagnóstico, En Proceso, Entregado
    fecha: { type: Date, default: Date.now }
});

const ServiceRequest = mongoose.model('ServiceRequest', serviceSchema);

// Crear nueva solicitud desde el formulario público
app.post('/api/contacto', async (req, res) => {
    try {
        const nuevaSolicitud = new ServiceRequest(req.body);
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
        const ESTADOS = ['Recibido', 'Diagnóstico', 'En Proceso', 'Entregado'];
        const updateData = {};

        if (mensaje !== undefined) updateData.mensaje = mensaje;
        if (estado !== undefined) {
            if (!ESTADOS.includes(estado)) {
                return res.status(400).json({ error: 'Estado inválido' });
            }
            updateData.estado = estado;
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'Nada que actualizar' });
        }

        const servicio = await ServiceRequest.findByIdAndUpdate(id, updateData, { new: true });
        if (!servicio) {
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }

        res.json({ mensaje: 'Servicio actualizado correctamente', servicio });
    } catch (error) {
        console.error('Error al actualizar servicio (admin):', error);
        res.status(500).json({ error: 'Error al actualizar el servicio' });
    }
});

// Obtener las solicitudes del cliente autenticado (el email sale del token)
app.get('/api/mis-servicios', requireCliente, async (req, res) => {
    try {
        const servicios = await ServiceRequest
            .find({ email: req.cliente.email })
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

        const { mensaje } = req.body;
        if (typeof mensaje !== 'string' || !mensaje.trim()) {
            return res.status(400).json({ error: 'Mensaje inválido' });
        }
        if (mensaje.length > 2000) {
            return res.status(400).json({ error: 'El mensaje es demasiado largo' });
        }

        const servicioActualizado = await ServiceRequest.findOneAndUpdate(
            { _id: id, email: req.cliente.email },
            { mensaje: mensaje.trim() },
            { new: true }
        );

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
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    fechaRegistro: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Registro de usuario con bcryptjs
app.post('/api/registro', async (req, res) => {
    try {
        const { nombre, email, password } = req.body;

        if (!nombre || !email || !password) {
            return res.status(400).json({ error: 'Todos los campos son obligatorios' });
        }

        const usuarioExiste = await User.findOne({ email });
        if (usuarioExiste) {
            return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const nuevoUsuario = new User({
            nombre,
            email,
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
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Correo y contraseña requeridos' });
        }

        const usuario = await User.findOne({ email });
        if (!usuario) {
            return res.status(400).json({ error: 'Usuario o contraseña incorrectos' });
        }

        const passwordValido = await bcrypt.compare(password, usuario.password);
        if (!passwordValido) {
            return res.status(400).json({ error: 'Usuario o contraseña incorrectos' });
        }

        const token = jwt.sign(
            { role: 'cliente', id: usuario._id.toString(), email: usuario.email },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.status(200).json({
            mensaje: '¡Inicio de sesión exitoso!',
            token,
            usuario: {
                id: usuario._id,
                nombre: usuario.nombre,
                email: usuario.email
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error al iniciar sesión' });
    }
});

// --- AUTENTICACIÓN PROTEGIDA DEL ADMINISTRADOR ---
app.post('/api/admin/login', (req, res) => {
    try {
        const { password } = req.body;

        if (!ADMIN_PASSWORD) {
            return res.status(500).json({ success: false, error: 'Administrador no configurado en el servidor' });
        }

        if (password === ADMIN_PASSWORD) {
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

// --- INICIAR SERVIDOR ---
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});