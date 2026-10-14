require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
    .then(() => console.log('🟢 Conectado exitosamente a MongoDB Atlas'))
    .catch(err => console.error('🔴 Error al conectar a MongoDB:', err));

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

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});