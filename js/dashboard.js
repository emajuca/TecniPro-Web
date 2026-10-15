document.addEventListener('DOMContentLoaded', () => {
    const usuarioGuardado = localStorage.getItem('usuarioTecniPro');

    if (!usuarioGuardado) {
        alert('Acceso no autorizado. Por favor, inicia sesión.');
        window.location.href = 'index.html';
        return;
    }

    try {
        const usuario = JSON.parse(usuarioGuardado);
        const saludoElemento = document.getElementById('userName');
        if (saludoElemento && usuario.nombre) {
            saludoElemento.textContent = usuario.nombre;
        }
    } catch (e) {
        console.error('Error al leer los datos de la sesión', e);
    }
});

const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('usuarioTecniPro');
            window.location.href = 'index.html';
        });
    }