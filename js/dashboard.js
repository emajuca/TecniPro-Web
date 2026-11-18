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

function mostrarEstadoDashboard(mensaje, tipo = 'exito') {
    const status = document.getElementById('dashboard-status');
    if (!status) return;

    status.textContent = mensaje;
    status.className = `form-status ${tipo === 'error' ? 'error' : ''}`.trim();
    status.hidden = false;

    clearTimeout(mostrarEstadoDashboard.timer);
    mostrarEstadoDashboard.timer = setTimeout(() => {
        status.hidden = true;
    }, 6000);
}

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

    // 2. Mostrar el perfil del cliente y su menú de cuenta
    const nombreCliente = usuario.nombre ? String(usuario.nombre).trim() : 'Cliente';
    const perfilNombre = document.getElementById('profileName');
    const perfilInicial = document.getElementById('profileInitial');
    if (perfilNombre) perfilNombre.textContent = nombreCliente;
    if (perfilInicial) perfilInicial.textContent = nombreCliente.charAt(0).toUpperCase();

    const profileBtn = document.getElementById('profileBtn');
    const profileMenu = document.getElementById('profileMenu');
    const cerrarPerfil = () => {
        if (!profileMenu || !profileBtn) return;
        profileMenu.hidden = true;
        profileBtn.setAttribute('aria-expanded', 'false');
    };

    if (profileBtn && profileMenu) {
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const abrir = profileMenu.hidden;
            profileMenu.hidden = !abrir;
            profileBtn.setAttribute('aria-expanded', String(abrir));
        });

        document.addEventListener('click', (e) => {
            if (!profileMenu.hidden && !profileMenu.contains(e.target) && !profileBtn.contains(e.target)) {
                cerrarPerfil();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !profileMenu.hidden) {
                cerrarPerfil();
                profileBtn.focus();
            }
        });
    }

    // 3. Configurar Botón de Cerrar Sesión
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('usuarioTecniPro');
            sessionStorage.removeItem('clienteToken');
            window.location.href = 'index.html';
        });
    }

    // 4. Cargar dinámicamente los servicios y la barra de progreso
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
                    <h2>No tienes servicios solicitados</h2>
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
                    <h2><i class="fa-solid fa-screwdriver-wrench"></i> Dispositivo: ${escapeHtml(etiquetaServicio(s.servicio))}</h2>
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

                <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap;">
                    <button type="button" class="btn-secondary btn-editar"
                        data-id="${escapeHtml(s._id)}"
                        data-mensaje="${escapeHtml(s.mensaje || '')}"
                        aria-label="Modificar detalle de la solicitud de ${escapeHtml(etiquetaServicio(s.servicio))}"
                        style="padding: 6px 14px; font-size: 0.85rem;">
                        <i class="fa-solid fa-pen" aria-hidden="true"></i> Modificar detalle
                    </button>
                    <a class="btn-secondary"
                        href="https://wa.me/573138178896?text=Hola,%20necesito%20mas%20informacion%20sobre%20un%20servicio."
                        target="_blank" rel="noopener noreferrer"
                        style="padding: 6px 14px; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 6px;">
                        <i class="fa-solid fa-info-circle" aria-hidden="true"></i> Más información por WhatsApp
                    </a>
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
                <h2>No se pudieron cargar tus servicios</h2>
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
            mostrarEstadoDashboard('Solicitud actualizada correctamente.');
            cargarServiciosUsuario();
        } else {
            const data = await res.json().catch(() => ({}));
            mostrarEstadoDashboard(data.error || 'No se pudo actualizar la solicitud.', 'error');
        }
    } catch (error) {
        console.error('Error al editar servicio:', error);
        mostrarEstadoDashboard('Error al conectar con el servidor.', 'error');
    }
}
