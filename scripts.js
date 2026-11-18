const API_URL = window.TECNIPRO_API || 'http://localhost:3000';

function limpiarErroresContacto() {
    const form = document.getElementById('contactForm');
    const status = document.getElementById('form-status');

    if (status) {
        status.hidden = true;
        status.textContent = '';
        status.className = 'form-status';
    }

    if (!form) return;

    form.querySelectorAll('[aria-invalid="true"]').forEach((campo) => {
        campo.removeAttribute('aria-invalid');
    });
    form.querySelectorAll('.field-error').forEach((error) => {
        error.textContent = '';
    });
}

function mostrarEstadoContacto(mensaje, tipo = 'error') {
    const status = document.getElementById('form-status');
    if (!status) return;

    status.textContent = mensaje;
    status.className = `form-status ${tipo === 'error' ? 'error' : ''}`.trim();
    status.hidden = false;
}

function mostrarErroresContacto(errores = {}) {
    const form = document.getElementById('contactForm');
    limpiarErroresContacto();
    if (!form) return;

    Object.entries(errores).forEach(([campo, mensaje]) => {
        const input = form.querySelector(`[name="${campo}"]`);
        const error = document.getElementById(`error-${campo}`);
        if (input) input.setAttribute('aria-invalid', 'true');
        if (error) error.textContent = mensaje;
    });

    if (Object.keys(errores).length > 0) {
        mostrarEstadoContacto('Revisa los campos marcados para enviar la solicitud.', 'error');
        const primero = form.querySelector('[aria-invalid="true"]');
        if (primero) primero.focus();
    }
}

function mostrarToast(mensaje, tipo = 'exito') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${tipo === 'error' ? 'toast-error' : ''}`;
    toast.setAttribute('role', tipo === 'error' ? 'alert' : 'status');

    const icono = document.createElement('span');
    icono.className = 'toast-icon';
    icono.textContent = tipo === 'exito' ? '✅' : '❌';

    const texto = document.createElement('span');
    texto.textContent = mensaje;

    toast.append(icono, ' ', texto);

    container.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

document.addEventListener('DOMContentLoaded', () => {
    const loginModal = document.getElementById('loginModal');
    const openButtons = [
        document.getElementById('openLoginBtn'),
        document.getElementById('openLoginBtn2')
    ].filter(Boolean);
    const closeBtn = document.getElementById('closeLoginModal');
    let lastFocused = null;

    // El modal cerrado no debe ser enfocable, incluso durante el fundido de salida.
    if (loginModal && !loginModal.classList.contains('active')) {
        loginModal.setAttribute('inert', '');
    }

    const getActiveInput = () => {
        if (!loginModal) return null;
        const visibleForm = [...loginModal.querySelectorAll('.auth-form')]
            .find((form) => form.style.display !== 'none');
        return visibleForm ? visibleForm.querySelector('input') : null;
    };

    const openModal = (e) => {
        e.preventDefault();
        if (!loginModal) return;

        lastFocused = document.activeElement;
        loginModal.removeAttribute('inert');
        loginModal.classList.add('active');
        loginModal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
        requestAnimationFrame(() => getActiveInput()?.focus());
    };

    const closeModal = () => {
        if (!loginModal || !loginModal.classList.contains('active')) return;

        loginModal.classList.remove('active');
        loginModal.setAttribute('aria-hidden', 'true');
        loginModal.setAttribute('inert', '');
        document.body.classList.remove('modal-open');

        if (lastFocused && typeof lastFocused.focus === 'function') {
            lastFocused.focus();
        }
        lastFocused = null;
    };

    openButtons.forEach((btn) => btn.addEventListener('click', openModal));
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    if (loginModal) {
        loginModal.addEventListener('click', (e) => {
            if (e.target === loginModal) closeModal();
        });

        loginModal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                closeModal();
                return;
            }

            if (e.key !== 'Tab') return;

            const focusables = [...loginModal.querySelectorAll(
                'button:not([disabled]), input:not([disabled]), a[href], select:not([disabled]), textarea:not([disabled])'
            )].filter((el) => el.offsetParent !== null);

            if (focusables.length === 0) return;

            const first = focusables[0];
            const last = focusables[focusables.length - 1];

            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        });
    }

    // Al hacer clic en "Cotizar", preselecciona el servicio en el formulario.
    document.querySelectorAll('[data-servicio]').forEach((enlace) => {
        enlace.addEventListener('click', () => {
            const select = document.querySelector('#contactForm [name="servicio"]');
            if (select) select.value = enlace.dataset.servicio;
        });
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.getElementById('menuToggle');
    const headerMenu = document.getElementById('headerMenu');
    const profileBtn = document.getElementById('profileBtn');
    const profileMenu = document.getElementById('profileMenu');
    const profileName = document.getElementById('profileName');
    const profileInitial = document.getElementById('profileInitial');
    const logoutBtn = document.getElementById('logoutBtn');
    const loginBtnNav = document.getElementById('openLoginBtn');
    const loginBtnCard = document.getElementById('openLoginBtn2');
    const accountCardLoggedOut = document.getElementById('accountCardLoggedOut');
    const accountCardLoggedIn = document.getElementById('accountCardLoggedIn');
    const accountCardName = document.getElementById('accountCardName');

    const leerUsuario = () => {
        try {
            return JSON.parse(localStorage.getItem('usuarioTecniPro') || 'null');
        } catch {
            return null;
        }
    };

    const tokenVigente = (token) => {
        if (!token) return false;
        try {
            const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
            const payload = JSON.parse(atob(base64 + '='.repeat((4 - base64.length % 4) % 4)));
            return typeof payload.exp !== 'number' || payload.exp * 1000 > Date.now();
        } catch {
            return false;
        }
    };

    const cerrarPerfil = () => {
        if (!profileMenu || !profileBtn) return;
        profileMenu.hidden = true;
        profileBtn.setAttribute('aria-expanded', 'false');
    };

    const abrirMenuMovil = (abrir) => {
        if (!headerMenu || !menuToggle) return;
        headerMenu.classList.toggle('open', abrir);
        menuToggle.setAttribute('aria-expanded', String(abrir));
        menuToggle.setAttribute('aria-label', abrir ? 'Cerrar menú' : 'Abrir menú');
        const icono = menuToggle.querySelector('i');
        if (icono) {
            icono.classList.toggle('fa-bars', !abrir);
            icono.classList.toggle('fa-xmark', abrir);
        }
        if (!abrir) cerrarPerfil();
    };

    const aplicarSesion = () => {
        const token = sessionStorage.getItem('clienteToken');
        if (!tokenVigente(token)) {
            sessionStorage.removeItem('clienteToken');
            localStorage.removeItem('usuarioTecniPro');
        }

        const usuario = tokenVigente(token) ? leerUsuario() : null;
        const activa = Boolean(usuario && usuario.nombre);

        document.body.classList.toggle('cliente-logueado', activa);

        if (loginBtnNav) loginBtnNav.hidden = activa;
        if (loginBtnCard) loginBtnCard.hidden = activa;
        if (accountCardLoggedOut) accountCardLoggedOut.hidden = activa;
        if (accountCardLoggedIn) accountCardLoggedIn.hidden = !activa;
        if (profileBtn) profileBtn.hidden = !activa;

        if (activa) {
            const nombre = String(usuario.nombre).trim();
            if (profileName) profileName.textContent = nombre;
            if (profileInitial) profileInitial.textContent = nombre.charAt(0).toUpperCase();
            if (accountCardName) accountCardName.textContent = nombre;
        } else {
            cerrarPerfil();
            abrirMenuMovil(false);
        }
    };

    aplicarSesion();

    if (profileBtn && profileMenu) {
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const abrir = profileMenu.hidden;
            profileMenu.hidden = !abrir;
            profileBtn.setAttribute('aria-expanded', String(abrir));
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('usuarioTecniPro');
            sessionStorage.removeItem('clienteToken');
            aplicarSesion();
            mostrarToast('Sesión cerrada correctamente.', 'exito');
        });
    }

    [loginBtnNav, loginBtnCard].forEach((boton) => {
        if (boton) boton.addEventListener('click', () => abrirMenuMovil(false));
    });

    document.addEventListener('click', (e) => {
        if (profileMenu && profileBtn && !profileMenu.hidden
            && !profileMenu.contains(e.target) && !profileBtn.contains(e.target)) {
            cerrarPerfil();
        }
    });

    if (menuToggle && headerMenu) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            abrirMenuMovil(!headerMenu.classList.contains('open'));
        });

        headerMenu.querySelectorAll('a').forEach((enlace) => {
            enlace.addEventListener('click', () => abrirMenuMovil(false));
        });

        document.addEventListener('click', (e) => {
            if (headerMenu.classList.contains('open')
                && !headerMenu.contains(e.target) && !menuToggle.contains(e.target)) {
                abrirMenuMovil(false);
            }
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth > 900) abrirMenuMovil(false);
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (profileMenu && !profileMenu.hidden) {
            cerrarPerfil();
            profileBtn.focus();
        }
        if (headerMenu && headerMenu.classList.contains('open')) {
            abrirMenuMovil(false);
            menuToggle.focus();
        }
    });
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
            const res = await fetch(`${API_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials)
            });

            const data = await res.json();

            if (res.ok && data.usuario && data.token) {
                mostrarToast(`¡Bienvenido, ${data.usuario.nombre}!`, 'exito');

                // Guardar la sesión localmente
                localStorage.setItem('usuarioTecniPro', JSON.stringify(data.usuario));
                sessionStorage.setItem('clienteToken', data.token);

                const loginModal = document.getElementById('loginModal');
                if (loginModal) {
                    loginModal.classList.remove('active');
                    loginModal.setAttribute('aria-hidden', 'true');
                    loginModal.setAttribute('inert', '');
                }
                document.body.classList.remove('modal-open');

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
        const activarPestana = (activa, inactiva, formularioActivo, formularioInactivo) => {
            activa.classList.add('active');
            inactiva.classList.remove('active');
            activa.setAttribute('aria-selected', 'true');
            inactiva.setAttribute('aria-selected', 'false');
            formularioActivo.style.display = 'block';
            formularioInactivo.style.display = 'none';
            requestAnimationFrame(() => formularioActivo.querySelector('input')?.focus());
        };

        tabLoginBtn.addEventListener('click', () => {
            activarPestana(tabLoginBtn, tabRegisterBtn, loginForm, registerForm);
        });

        tabRegisterBtn.addEventListener('click', () => {
            activarPestana(tabRegisterBtn, tabLoginBtn, registerForm, loginForm);
        });

        [tabLoginBtn, tabRegisterBtn].forEach((tab) => {
            tab.addEventListener('keydown', (e) => {
                if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
                e.preventDefault();
                const otra = tab === tabLoginBtn ? tabRegisterBtn : tabLoginBtn;
                otra.focus();
                otra.click();
            });
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
            const res = await fetch(`${API_URL}/api/registro`, {
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
        const submitBtn = contactForm.querySelector('button[type="submit"]');

        contactForm.querySelectorAll('[name]').forEach((campo) => {
            const limpiarCampo = () => {
                campo.removeAttribute('aria-invalid');
                const error = document.getElementById(`error-${campo.name}`);
                if (error) error.textContent = '';

                const status = document.getElementById('form-status');
                if (status && !contactForm.querySelector('[aria-invalid="true"]')) {
                    status.hidden = true;
                }
            };

            campo.addEventListener('input', limpiarCampo);
            campo.addEventListener('change', limpiarCampo);
        });

        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            limpiarErroresContacto();

            const formData = {
                nombre: contactForm.querySelector('[name="nombre"]').value,
                email: contactForm.querySelector('[name="email"]').value,
                telefono: contactForm.querySelector('[name="telefono"]').value,
                servicio: contactForm.querySelector('[name="servicio"]').value,
                mensaje: contactForm.querySelector('[name="mensaje"]').value
            };

            if (submitBtn) submitBtn.disabled = true;

            try {
                const response = await fetch(`${API_URL}/api/contacto`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });

                const resultado = await response.json().catch(() => ({}));

                if (response.ok) {
                    mostrarToast('¡Solicitud enviada con éxito! Un técnico te contactará pronto.', 'exito');
                    contactForm.reset();
                    limpiarErroresContacto();
                } else if (resultado.errores) {
                    mostrarErroresContacto(resultado.errores);
                } else {
                    mostrarEstadoContacto(resultado.error || 'No se pudo registrar la solicitud.', 'error');
                }
            } catch (error) {
                console.error('Error al conectar con el servidor:', error);
                mostrarEstadoContacto('No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.', 'error');
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }
});