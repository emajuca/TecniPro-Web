const API_URL = window.TECNIPRO_API || 'http://localhost:3000';

const escapeHtml = (text) => String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const etiquetaServicio = (valor) => window.nombreServicio
    ? window.nombreServicio(valor)
    : (valor || 'Soporte Técnico');

document.addEventListener('DOMContentLoaded', async () => {
    const usuarioGuardado = localStorage.getItem('usuarioTecniPro');
    const token = sessionStorage.getItem('clienteToken');

    // 1. Validar sesión activa (usuario + token de la API)
    if (!usuarioGuardado || !token) {
        localStorage.removeItem('usuarioTecniPro');
        sessionStorage.removeItem('clienteToken');
        alert('Acceso no autorizado. Por favor, inicia sesión.');
        window.location.href = 'index.html';
        return;
    }

    let usuario;
    try {
        usuario = JSON.parse(usuarioGuardado);
    } catch (error) {
        localStorage.removeItem('usuarioTecniPro');
        sessionStorage.removeItem('clienteToken');
        alert('Tu sesión no es válida. Inicia sesión de nuevo.');
        window.location.href = 'index.html';
        return;
    }

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
            sessionStorage.removeItem('clienteToken');
            window.location.href = 'index.html';
        });
    }

    // 3. Cargar dinámicamente los servicios y la barra de progreso
    await cargarServiciosUsuario();
});

async function cargarServiciosUsuario() {
    const contenedor = document.querySelector('.dashboard-container');
    if (!contenedor) return;

    let serviciosSec = document.getElementById('lista-servicios');
    if (!serviciosSec) {
        serviciosSec = document.createElement('div');
        serviciosSec.id = 'lista-servicios';
        contenedor.appendChild(serviciosSec);
    }

    try {
        const token = sessionStorage.getItem('clienteToken');
        const res = await fetch(`${API_URL}/api/mis-servicios`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (res.status === 401 || res.status === 403) {
            localStorage.removeItem('usuarioTecniPro');
            sessionStorage.removeItem('clienteToken');
            alert('Tu sesión expiró. Inicia sesión de nuevo.');
            window.location.href = 'index.html';
            return;
        }

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const servicios = await res.json();

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
            <div class="card-box active-service-card" id="servicio-${escapeHtml(s._id)}" style="margin-top: 20px;">
                <div class="service-header-info">
                    <h3><i class="fa-solid fa-screwdriver-wrench"></i> Dispositivo: ${escapeHtml(etiquetaServicio(s.servicio))}</h3>
                    <span class="status-badge in-progress">${escapeHtml(estado)}</span>
                </div>
                <p class="device-issue"><strong>Detalle del problema:</strong> ${escapeHtml(s.mensaje || '')}</p>

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
                    <p><i class="fa-solid fa-phone"></i> Contacto registrado: ${escapeHtml(s.telefono || 'N/A')}</p>
                    <p><i class="fa-solid fa-calendar"></i> Fecha de solicitud: ${new Date(s.fecha).toLocaleDateString()}</p>
                </div>

                <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
                    <button type="button" class="btn-secondary btn-editar"
                        data-id="${escapeHtml(s._id)}"
                        data-mensaje="${escapeHtml(s.mensaje || '')}"
                        style="padding: 6px 14px; font-size: 0.85rem;">
                        <i class="fa-solid fa-pen"></i> Modificar detalle
                    </button>
                </div>
                <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
                    <button class="btn-secondary" style="padding: 6px 14px; font-size: 0.85rem;">
                        <i class="fa-solid fa-info-circle"></i> 
                        <a href="https://wa.me/573138178896?text=Hola,%20necesito%20mas%20informacion%20sobre%20un%20servicio." target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: none;">Más información</a>
                    </button>
                </div>
            </div>
        `;
        }).join('');

        serviciosSec.querySelectorAll('.btn-editar').forEach((btn) => {
            btn.addEventListener('click', () => {
                editarServicio(btn.dataset.id, btn.dataset.mensaje);
            });
        });

    } catch (error) {
        console.error('Error cargando servicios:', error);
        serviciosSec.innerHTML = `
            <div class="card-box" style="text-align: center; padding: 40px; margin-top: 20px;">
                <i class="fa-solid fa-plug-circle-xmark" style="font-size: 2.5rem; color: var(--text-muted); margin-bottom: 15px;"></i>
                <h3>No se pudieron cargar tus servicios</h3>
                <p style="color: var(--text-muted); margin-top: 10px;">Revisa tu conexión y recarga la página.</p>
            </div>
        `;
    }
}

async function editarServicio(id, mensajeActual) {
    const nuevoMensaje = prompt('Modifica el detalle o requerimiento de tu servicio:', mensajeActual);
    if (!nuevoMensaje || nuevoMensaje.trim() === '') return;

    try {
        const token = sessionStorage.getItem('clienteToken');
        const res = await fetch(`${API_URL}/api/mis-servicios/${encodeURIComponent(id)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ mensaje: nuevoMensaje })
        });

        if (res.status === 401 || res.status === 403) {
            localStorage.removeItem('usuarioTecniPro');
            sessionStorage.removeItem('clienteToken');
            alert('Tu sesión expiró. Inicia sesión de nuevo.');
            window.location.href = 'index.html';
            return;
        }

        if (res.ok) {
            alert('¡Solicitud actualizada con éxito!');
            cargarServiciosUsuario();
        } else {
            const data = await res.json().catch(() => ({}));
            alert(data.error || 'No se pudo actualizar la solicitud.');
        }
    } catch (error) {
        console.error('Error al editar servicio:', error);
        alert('Error al conectar con el servidor.');
    }
}
