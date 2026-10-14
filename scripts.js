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
        if (loginModal) loginModal.classList.add('active');
    };

    const closeModal = () => {
        if (loginModal) loginModal.classList.remove('active');
    };

    if (openBtn1) openBtn1.addEventListener('click', openModal);
    if (openBtn2) openBtn2.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    if (loginModal) {
        loginModal.addEventListener('click', (e) => {
            if (e.target === loginModal) closeModal();
        });
    }
});

const modalLoginForm = document.getElementById('modalLoginForm');
if (modalLoginForm) {
    modalLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const emailInput = modalLoginForm.querySelector('input[type="email"]');
        const passwordInput = modalLoginForm.querySelector('input[type="password"]');

        const credentials = {
            email: emailInput ? emailInput.value : '',
            password: passwordInput ? passwordInput.value : ''
        };

        try {
            const res = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials)
            });

            const data = await res.json();

            if (res.ok) {
                mostrarToast(`¡Bienvenido, ${data.usuario.nombre}!`, 'exito');

                // Guardar la sesión localmente
                localStorage.setItem('usuarioTecniPro', JSON.stringify(data.usuario));

                const loginModal = document.getElementById('loginModal');
                if (loginModal) loginModal.classList.remove('active');

                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);

            } else {
                mostrarToast(data.error || 'Correo o contraseña incorrectos', 'error');
            }
        } catch (error) {
            console.error('Error en login:', error);
            mostrarToast('No se pudo conectar con el servidor', 'error');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const tabLoginBtn = document.getElementById('tabLoginBtn');
    const tabRegisterBtn = document.getElementById('tabRegisterBtn');
    const loginForm = document.getElementById('modalLoginForm');
    const registerForm = document.getElementById('modalRegisterForm');

    if (tabLoginBtn && tabRegisterBtn && loginForm && registerForm) {
        tabLoginBtn.addEventListener('click', () => {
            tabLoginBtn.classList.add('active');
            tabRegisterBtn.classList.remove('active');
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
        });

        tabRegisterBtn.addEventListener('click', () => {
            tabRegisterBtn.classList.add('active');
            tabLoginBtn.classList.remove('active');
            registerForm.style.display = 'block';
            loginForm.style.display = 'none';
        });
    }
});

const modalRegisterForm = document.getElementById('modalRegisterForm');

if (modalRegisterForm) {
    modalRegisterForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const usuarioData = {
            nombre: document.getElementById('reg-nombre').value,
            email: document.getElementById('reg-email').value,
            password: document.getElementById('reg-password').value
        };

        try {
            const res = await fetch('http://localhost:3000/api/registro', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(usuarioData)
            });

            const data = await res.json();

            if (res.ok) {
                mostrarToast('¡Cuenta creada con éxito! Ahora puedes iniciar sesión.', 'exito');
                modalRegisterForm.reset();

                // Cambiar automáticamente a la pestaña de login
                const tabLoginBtn = document.getElementById('tabLoginBtn');
                if (tabLoginBtn) tabLoginBtn.click();
            } else {
                mostrarToast(data.error || 'No se pudo crear la cuenta', 'error');
            }
        } catch (error) {
            console.error('Error al registrar usuario:', error);
            mostrarToast('No se pudo conectar con el servidor', 'error');
        }
    });
}

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
                    headers: { 'Content-Type': 'application/json' },
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
                mostrarToast('No se pudo conectar con el servidor', 'error');
            }
        });
    }
});