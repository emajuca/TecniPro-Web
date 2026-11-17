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
    let token = sessionStorage.getItem('adminToken');

    if (!token) {
        const passwordIngresada = prompt("Ingrese la contraseña de Administrador:");
        if (!passwordIngresada) {
            window.location.href = "index.html";
            return;
        }

        try {
            // Validar clave y obtener el token de acceso
            const response = await fetch(`${API_URL}/api/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: passwordIngresada })
            });

            const data = await response.json();

            if (response.ok && data.success && data.token) {
                token = data.token;
                sessionStorage.setItem('adminToken', token);
                sessionStorage.setItem('adminAuth', 'true');
            } else {
                alert("Acceso denegado. Contraseña incorrecta.");
                window.location.href = "index.html";
                return;
            }
        } catch (error) {
            console.error('Error de autenticación:', error);
            alert("Error al conectar con el servidor.");
            window.location.href = "index.html";
            return;
        }
    }

    // Una vez verificado el acceso, cargar solicitudes
    cargarTodasLasSolicitudes();
});

function cerrarSesionAdmin() {
    sessionStorage.removeItem('adminToken');
    sessionStorage.removeItem('adminAuth');
    alert('Tu sesión expiró. Vuelve a iniciar sesión.');
    window.location.href = 'index.html';
}

async function cargarTodasLasSolicitudes() {
    const contenedor = document.getElementById('admin-lista-servicios');
    if (!contenedor) return;

    try {
        const res = await fetch(`${API_URL}/api/admin/servicios`, {
            headers: { Authorization: `Bearer ${sessionStorage.getItem('adminToken')}` }
        });

        if (res.status === 401 || res.status === 403) {
            cerrarSesionAdmin();
            return;
        }

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const servicios = await res.json();

        if (!servicios || servicios.length === 0) {
            contenedor.innerHTML = `<p style="color: var(--text-muted); text-align:center; padding: 30px;">No hay solicitudes registradas en la base de datos.</p>`;
            return;
        }

        contenedor.innerHTML = servicios.map(s => `
            <div class="card-box" style="margin-top: 20px; border-color: rgba(255, 42, 42, 0.4);">
                <div class="service-header-info">
                    <h3><i class="fa-solid fa-user"></i> ${escapeHtml(s.nombre)} (${escapeHtml(s.email)})</h3>
                    <span class="status-badge">${escapeHtml(s.estado || 'Recibido')}</span>
                </div>
                <p style="color: var(--text-main); margin-bottom: 5px;"><strong>Dispositivo/Servicio:</strong> ${escapeHtml(etiquetaServicio(s.servicio))}</p>
                <p class="device-issue"><strong>Problema:</strong> ${escapeHtml(s.mensaje)}</p>
                <p class="service-meta"><i class="fa-solid fa-phone"></i> Teléfono: ${escapeHtml(s.telefono)} | Fecha: ${new Date(s.fecha).toLocaleString()}</p>

                <div style="margin-top: 15px; display: flex; gap: 10px; align-items: center; background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px; flex-wrap: wrap;">
                    <label style="font-size: 0.9rem; color: var(--text-muted);">Cambiar Estado:</label>
                    <select id="select-estado-${escapeHtml(s._id)}" style="padding: 6px; background: var(--bg-dark); color: white; border: 1px solid var(--text-muted); border-radius: 5px;">
                        <option value="Recibido" ${s.estado === 'Recibido' ? 'selected' : ''}>1. Recibido</option>
                        <option value="Diagnóstico" ${s.estado === 'Diagnóstico' ? 'selected' : ''}>2. Diagnóstico</option>
                        <option value="En Proceso" ${s.estado === 'En Proceso' ? 'selected' : ''}>3. En Proceso</option>
                        <option value="Entregado" ${s.estado === 'Entregado' ? 'selected' : ''}>4. Entregado</option>
                    </select>
                    <button type="button" class="btn-primary btn-actualizar" data-id="${escapeHtml(s._id)}" style="padding: 6px 14px; font-size: 0.85rem;">Actualizar Estado</button>
                </div>
            </div>
        `).join('');

        contenedor.querySelectorAll('.btn-actualizar').forEach((btn) => {
            btn.addEventListener('click', () => actualizarEstado(btn.dataset.id));
        });

    } catch (error) {
        console.error('Error al cargar solicitudes en admin:', error);
        contenedor.innerHTML = `<p style="color: var(--text-muted); text-align:center; padding: 30px;">No se pudieron cargar las solicitudes. Revisa la conexión y recarga la página.</p>`;
    }
}

async function actualizarEstado(id) {
    const select = document.getElementById(`select-estado-${id}`);
    if (!select) return;
    const nuevoEstado = select.value;

    try {
        const res = await fetch(`${API_URL}/api/admin/servicios/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${sessionStorage.getItem('adminToken')}`
            },
            body: JSON.stringify({ estado: nuevoEstado })
        });

        if (res.status === 401 || res.status === 403) {
            cerrarSesionAdmin();
            return;
        }

        if (res.ok) {
            alert('¡Estado actualizado con éxito!');
            await cargarTodasLasSolicitudes();
        } else {
            const data = await res.json().catch(() => ({}));
            alert(data.error || 'Error al actualizar el estado.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión con el servidor.');
    }
}
