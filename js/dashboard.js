document.addEventListener('DOMContentLoaded', async () => {
    const usuarioGuardado = localStorage.getItem('usuarioTecniPro');

    // 1. Validar sesión activa
    if (!usuarioGuardado) {
        alert('Acceso no autorizado. Por favor, inicia sesión.');
        window.location.href = 'index.html';
        return;
    }

    const usuario = JSON.parse(usuarioGuardado);
    const saludoElemento = document.getElementById('userName');
    if (saludoElemento && usuario.nombre) {
        saludoElemento.textContent = usuario.nombre;
    }

    // 2. Configurar Botón de Cerrar Sesión
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('usuarioTecniPro');
            window.location.href = 'index.html';
        });
    }

    // 3. Cargar dinámicamente los servicios y la barra de progreso
    await cargarServiciosUsuario(usuario.email);
});

async function cargarServiciosUsuario(email) {
    const contenedor = document.querySelector('.dashboard-container');
    if (!contenedor) return;

    try {
        const res = await fetch(`http://localhost:3000/api/servicios/${email}`);
        const servicios = await res.json();

        let serviciosSec = document.getElementById('lista-servicios');
        if (!serviciosSec) {
            serviciosSec = document.createElement('div');
            serviciosSec.id = 'lista-servicios';
            contenedor.appendChild(serviciosSec);
        }

        if (!servicios || servicios.length === 0) {
            serviciosSec.innerHTML = `
                <div class="card-box" style="text-align: center; padding: 40px; margin-top: 20px;">
                    <i class="fa-solid fa-folder-open" style="font-size: 2.5rem; color: var(--text-muted); margin-bottom: 15px;"></i>
                    <h3>No tienes servicios solicitados</h3>
                    <p style="color: var(--text-muted); margin-top: 10px;">Solicita un diagnóstico para tu equipo desde la página principal.</p>
                </div>
            `;
            return;
        }

        serviciosSec.innerHTML = servicios.map(s => {
            const estado = s.estado || 'Recibido';
            const p1 = 'completed';
            const p2 = ['Diagnóstico', 'En Proceso', 'Entregado'].includes(estado) ? 'completed' : (estado === 'Diagnóstico' ? 'active' : '');
            const p3 = ['En Proceso', 'Entregado'].includes(estado) ? 'completed' : (estado === 'En Proceso' ? 'active' : '');
            const p4 = estado === 'Entregado' ? 'completed active' : '';

            return `
            <div class="card-box active-service-card" id="servicio-${s._id}" style="margin-top: 20px;">
                <div class="service-header-info">
                    <h3><i class="fa-solid fa-screwdriver-wrench"></i> Dispositivo: ${s.servicio || 'Soporte Técnico'}</h3>
                    <span class="status-badge in-progress">${estado}</span>
                </div>
                <p class="device-issue"><strong>Detalle del problema:</strong> ${s.mensaje}</p>

                <!-- Barra de Progreso Visual de 4 Pasos -->
                <div class="progress-tracker">
                    <div class="step ${p1}">
                        <i class="fa-solid fa-check"></i>
                        <span>1. Recibido</span>
                    </div>
                    <div class="step ${p2}">
                        <i class="fa-solid fa-stethoscope"></i>
                        <span>2. Diagnóstico</span>
                    </div>
                    <div class="step ${p3}">
                        <i class="fa-solid fa-gears"></i>
                        <span>3. En Proceso</span>
                    </div>
                    <div class="step ${p4}">
                        <i class="fa-solid fa-truck-fast"></i>
                        <span>4. Entregado</span>
                    </div>
                </div>

                <div class="service-meta">
                    <p><i class="fa-solid fa-phone"></i> Contacto registrado: ${s.telefono || 'N/A'}</p>
                    <p><i class="fa-solid fa-calendar"></i> Fecha de solicitud: ${new Date(s.fecha).toLocaleDateString()}</p>
                </div>

                <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
                    <button onclick="editarServicio('${s._id}', '${s.mensaje.replace(/'/g, "\\'")}')" class="btn-secondary" style="padding: 6px 14px; font-size: 0.85rem;">
                        <i class="fa-solid fa-pen"></i> Modificar detalle
                    </button>
                </div>
                <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
                    <button class="btn-secondary" style="padding: 6px 14px; font-size: 0.85rem;">
                        <i class="fa-solid fa-info-circle"></i> 
                        <a href="https://wa.me/573138178896?text=Hola,%20necesito%20mas%20informacion%20sobre%20un%20servicio." target="_blank" style="color: inherit; text-decoration: none;">Más información</a>
                    </button>
                </div>
            </div>
        `;
        }).join('');

    } catch (error) {
        console.error('Error cargando servicios:', error);
    }
}

async function editarServicio(id, mensajeActual) {
    const nuevoMensaje = prompt('Modifica el detalle o requerimiento de tu servicio:', mensajeActual);
    if (!nuevoMensaje || nuevoMensaje.trim() === '') return;

    try {
        const res = await fetch(`http://localhost:3000/api/servicios/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mensaje: nuevoMensaje })
        });

        if (res.ok) {
            alert('¡Solicitud actualizada con éxito!');
            const usuario = JSON.parse(localStorage.getItem('usuarioTecniPro'));
            cargarServiciosUsuario(usuario.email);
        } else {
            alert('No se pudo actualizar la solicitud.');
        }
    } catch (error) {
        console.error('Error al editar servicio:', error);
        alert('Error al conectar con el servidor.');
    }
}