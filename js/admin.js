document.addEventListener('DOMContentLoaded', async () => {
    let auth = sessionStorage.getItem('adminAuth');

    if (!auth) {
        const passwordIngresada = prompt("Ingrese la contraseña de Administrador:");
        if (!passwordIngresada) {
            window.location.href = "index.html";
            return;
        }

        try {
            // Validar clave contra la API protegida
            const response = await fetch('http://localhost:3000/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: passwordIngresada })
            });

            const data = await response.json();

            if (response.ok && data.success) {
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

async function cargarTodasLasSolicitudes() {
    const contenedor = document.getElementById('admin-lista-servicios');
    try {
        const res = await fetch('http://localhost:3000/api/admin/servicios');
        const servicios = await res.json();

        if (!servicios || servicios.length === 0) {
            contenedor.innerHTML = `<p style="color: var(--text-muted); text-align:center; padding: 30px;">No hay solicitudes registradas en la base de datos.</p>`;
            return;
        }

        contenedor.innerHTML = servicios.map(s => `
            <div class="card-box" style="margin-top: 20px; border-color: rgba(255, 42, 42, 0.4);">
                <div class="service-header-info">
                    <h3><i class="fa-solid fa-user"></i> ${s.nombre} (${s.email})</h3>
                    <span class="status-badge">${s.estado || 'Recibido'}</span>
                </div>
                <p style="color: var(--text-main); margin-bottom: 5px;"><strong>Dispositivo/Servicio:</strong> ${s.servicio}</p>
                <p class="device-issue"><strong>Problema:</strong> ${s.mensaje}</p>
                <p class="service-meta"><i class="fa-solid fa-phone"></i> Teléfono: ${s.telefono} | Fecha: ${new Date(s.fecha).toLocaleString()}</p>

                <div style="margin-top: 15px; display: flex; gap: 10px; align-items: center; background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px; flex-wrap: wrap;">
                    <label style="font-size: 0.9rem; color: var(--text-muted);">Cambiar Estado:</label>
                    <select id="select-estado-${s._id}" style="padding: 6px; background: var(--bg-dark); color: white; border: 1px solid var(--text-muted); border-radius: 5px;">
                        <option value="Recibido" ${s.estado === 'Recibido' ? 'selected' : ''}>1. Recibido</option>
                        <option value="Diagnóstico" ${s.estado === 'Diagnóstico' ? 'selected' : ''}>2. Diagnóstico</option>
                        <option value="En Proceso" ${s.estado === 'En Proceso' ? 'selected' : ''}>3. En Proceso</option>
                        <option value="Entregado" ${s.estado === 'Entregado' ? 'selected' : ''}>4. Entregado</option>
                    </select>
                    <button onclick="actualizarEstado('${s._id}')" class="btn-primary" style="padding: 6px 14px; font-size: 0.85rem;">Actualizar Estado</button>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error al cargar solicitudes en admin:', error);
    }
}

async function actualizarEstado(id) {
    const select = document.getElementById(`select-estado-${id}`);
    const nuevoEstado = select.value;

    try {
        const res = await fetch(`http://localhost:3000/api/servicios/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: nuevoEstado })
        });

        if (res.ok) {
            alert('¡Estado actualizado con éxito!');
            cargarTodasLasSolicitudes();
        } else {
            alert('Error al actualizar el estado.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión con el servidor.');
    }
}