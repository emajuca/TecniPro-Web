function mostrarToast(mensaje, tipo = 'exito') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${tipo === 'error' ? 'toast-error' : ''}`;

    const icono = tipo === 'exito' ? '✅' : '❌';
    toast.innerHTML = `<span class="toast-icon">${icono}</span> <span>${mensaje}</span>`;

    container.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
document.addEventListener('DOMContentLoaded', () => {
    const loginModal = document.getElementById('loginModal');
    const openBtn1 = document.getElementById('openLoginBtn');
    const openBtn2 = document.getElementById('openLoginBtn2');
    const closeBtn = document.getElementById('closeLoginModal');

    const openModal = (e) => {
        e.preventDefault();
        if (loginModal) {
            loginModal.classList.add('active');
        }
    };

    const closeModal = () => {
        if (loginModal) {
            loginModal.classList.remove('active');
        }
    };
    if (openBtn1) openBtn1.addEventListener('click', openModal);
    if (openBtn2) openBtn2.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (loginModal) {
        loginModal.addEventListener('click', (e) => {
            if (e.target === loginModal) {
                closeModal();
            }
        });
    }
});

document.getElementById('modalLoginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    window.location.href = 'dashboard.html';
});

document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contactForm');

    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = {
                nombre: contactForm.querySelector('[name="nombre"]').value,
                email: contactForm.querySelector('[name="email"]').value,
                telefono: contactForm.querySelector('[name="telefono"]').value,
                servicio: contactForm.querySelector('[name="servicio"]').value,
                mensaje: contactForm.querySelector('[name="mensaje"]').value
            };

            try {
                const response = await fetch('http://localhost:3000/api/contacto', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const resultado = await response.json();

                if (response.ok) {
                    mostrarToast('¡Solicitud enviada con éxito! Un técnico te contactará pronto.', 'exito');
                    contactForm.reset();
                } else {
                    mostrarToast(resultado.error || 'No se pudo registrar la solicitud.', 'error');
                }
            } catch (error) {
                console.error('Error al conectar con el servidor:', error);
                alert(' No se pudo conectar con el servidor. Verifica que node server.js esté encendido.');
            }
        });
    }
});