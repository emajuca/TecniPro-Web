require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
    .then(() => console.log('🟢 Conectado exitosamente a MongoDB Atlas'))
    .catch(err => console.error('🔴 Error al conectar a MongoDB:', err));

// --- MODELO Y RUTA DE CONTACTO ---
const serviceSchema = new mongoose.Schema({
    nombre: String,
    email: String,
    telefono: String,
    servicio: String,
    mensaje: String,
    fecha: { type: Date, default: Date.now }
});

const ServiceRequest = mongoose.model('ServiceRequest', serviceSchema);

app.post('/api/contacto', async (req, res) => {
    try {
        const nuevaSolicitud = new ServiceRequest(req.body);
        await nuevaSolicitud.save();
        res.status(201).json({ mensaje: '¡Solicitud guardada en MongoDB con éxito!' });
    } catch (error) {
        res.status(500).json({ error: 'Hubo un error al guardar la solicitud' });
    }
});

const userSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    fechaRegistro: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

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

        res.status(200).json({
            mensaje: '¡Inicio de sesión exitoso!',
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

// --- INICIAR SERVIDOR AL FINAL ---
app.listen(PORT, () => {
    console.log(` Servidor corriendo en http://localhost:${PORT}`);
});