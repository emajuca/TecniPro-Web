/* =========================================================
   TECNIBOT - Asistente virtual de TecniPro
   ---------------------------------------------------------
   Motor de intenciones basado en reglas:
   1. Normaliza el texto del usuario (minúsculas, sin tildes).
   2. Busca palabras clave y asigna un puntaje a cada intención.
   3. La intención con mayor puntaje genera la respuesta.
   4. Algunas intenciones abren un flujo de varios pasos
      (recomendador de servicios).
   ========================================================= */

(() => {
    'use strict';

    // URL del backend. En local apunta a localhost; al desplegar
    // se puede definir window.TECNIPRO_API antes de cargar este script.
    const API_URL = window.TECNIPRO_API || 'http://localhost:3000';
    const WHATSAPP = 'https://wa.me/573138178896?text=' + encodeURIComponent('Hola, necesito soporte técnico a domicilio.');

    // ---------- Referencias al DOM ----------
    const panel = document.getElementById('chatbotPanel');
    const toggle = document.getElementById('chatbotToggle');
    const closeBtn = document.getElementById('chatbotClose');
    const messages = document.getElementById('chatbotMessages');
    const form = document.getElementById('chatbotForm');
    const input = document.getElementById('chatbotInput');

    if (!panel || !toggle || !closeBtn || !messages || !form || !input) return;

    // ---------- Estado de la conversación ----------
    const state = {
        open: false,
        greeted: false,
        flow: null,      // 'device' | 'problem' | null
        data: {}         // dispositivo, problema y datos para precargar
    };

    // ---------- Catálogo de dispositivos y fallas ----------
    const DEVICES = {
        computadores: {
            short: 'Computador / Laptop',
            label: 'computador o laptop',
            problems: [
                { key: 'no-enciende', label: 'No enciende o no da imagen' },
                { key: 'lento', label: 'Va lento, virus o formateo' },
                { key: 'hardware', label: 'Pantalla, teclado o bisagra' },
                { key: 'sobrecalienta', label: 'Sobrecalienta o hace ruido' },
                { key: 'otro', label: 'Otro problema' }
            ]
        },
        celulares: {
            short: 'Celular / Tablet',
            label: 'celular o tablet',
            problems: [
                { key: 'pantalla', label: 'Pantalla rota o táctil' },
                { key: 'bateria', label: 'La batería no dura' },
                { key: 'puerto', label: 'No carga / puerto de carga' },
                { key: 'software', label: 'Lento, bloqueado o actualización' },
                { key: 'otro', label: 'Otro problema' }
            ]
        },
        consolas: {
            short: 'Consola / PC Gamer',
            label: 'consola o PC gamer',
            problems: [
                { key: 'no-enciende', label: 'No enciende o se apaga' },
                { key: 'sobrecalienta', label: 'Sobrecalienta o hace ruido' },
                { key: 'control', label: 'Control o mando con fallas' },
                { key: 'optimizacion', label: 'Lento o pocos FPS' },
                { key: 'otro', label: 'Otro problema' }
            ]
        }
    };

    // Recomendación para cada combinación dispositivo + falla.
    // 'service' coincide con los values del <select> del formulario.
    const RECOMMENDATIONS = {
        computadores: {
            'no-enciende': { service: 'computadores', title: 'diagnóstico de encendido', detail: 'Revisamos fuente de poder, batería y placa para encontrar la causa antes de cambiar piezas.' },
            'lento': { service: 'computadores', title: 'mantenimiento y optimización', detail: 'Limpiamos el software, revisamos virus y ajustamos el arranque para recuperar velocidad.' },
            'hardware': { service: 'computadores', title: 'revisión de hardware', detail: 'Diagnosticamos pantalla, teclado, bisagras y componentes para cotizar el repuesto correcto.' },
            'sobrecalienta': { service: 'computadores', title: 'mantenimiento térmico', detail: 'Limpiamos ventiladores, cambiamos pasta térmica y verificamos las temperaturas.' },
            'otro': { service: 'computadores', title: 'diagnóstico a domicilio', detail: 'Revisamos el equipo completo y te damos un presupuesto claro antes de intervenir.' }
        },
        celulares: {
            'pantalla': { service: 'celulares', title: 'cambio de pantalla', detail: 'Revisamos el modelo y cotizamos el display compatible antes de intervenir.' },
            'bateria': { service: 'celulares', title: 'cambio de batería', detail: 'Verificamos la salud de la batería y el consumo para confirmar si es el problema.' },
            'puerto': { service: 'celulares', title: 'reparación de puerto de carga', detail: 'Limpiamos o reemplazamos el puerto y probamos la carga con tu cargador.' },
            'software': { service: 'celulares', title: 'diagnóstico de software', detail: 'Revisamos el sistema, actualizaciones y apps que puedan afectar el rendimiento.' },
            'otro': { service: 'celulares', title: 'diagnóstico a domicilio', detail: 'Revisamos el equipo completo y te damos un presupuesto claro antes de intervenir.' }
        },
        consolas: {
            'no-enciende': { service: 'consolas', title: 'diagnóstico de consola', detail: 'Revisamos fuente, puertos y sistema para identificar la falla.' },
            'sobrecalienta': { service: 'consolas', title: 'mantenimiento térmico', detail: 'Limpiamos el sistema de ventilación y cambiamos pasta térmica.' },
            'control': { service: 'consolas', title: 'reparación de control', detail: 'Revisamos botones, sticks y drift; cotizamos el repuesto necesario.' },
            'optimizacion': { service: 'consolas', title: 'optimización de rendimiento', detail: 'Ajustamos la configuración, limpiamos el sistema y revisamos temperaturas para mejorar los FPS.' },
            'otro': { service: 'consolas', title: 'diagnóstico a domicilio', detail: 'Revisamos el equipo completo y te damos un presupuesto claro antes de intervenir.' }
        }
    };

    // ---------- Utilidades ----------

    // Minúsculas, sin tildes y sin signos: "¿Dónde están?" -> "donde estan"
    const normalize = (text) => String(text)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    // Evita inyección de HTML cuando mostramos datos de la base de datos.
    const escapeHtml = (text) => String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    // Formato simple: **negrita**, enlaces [texto](url) y saltos de línea.
    const format = (text) => escapeHtml(text)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|\.\/[^)\s]+|mailto:[^)\s]+)\)/g,
            '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
        .replace(/\n/g, '<br>');

    const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
    const scrollToBottom = () => { messages.scrollTop = messages.scrollHeight; };

    // ---------- Render de mensajes ----------
    let typingEl = null;

    function showTyping() {
        if (typingEl) return;
        typingEl = document.createElement('div');
        typingEl.className = 'chat-msg bot typing';
        typingEl.setAttribute('aria-label', 'TecniBot está escribiendo');
        typingEl.innerHTML = '<span></span><span></span><span></span>';
        messages.appendChild(typingEl);
        scrollToBottom();
    }

    function hideTyping() {
        if (typingEl) {
            typingEl.remove();
            typingEl = null;
        }
    }

    function addMessage(text, sender, options) {
        const bubble = document.createElement('div');
        bubble.className = `chat-msg ${sender}`;

        if (sender === 'bot') {
            bubble.innerHTML = format(text);
        } else {
            bubble.textContent = text; // el texto del usuario nunca se interpreta como HTML
        }

        if (Array.isArray(options) && options.length) {
            const wrap = document.createElement('div');
            wrap.className = 'chat-options';
            options.forEach((option) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'chat-option';
                btn.textContent = option.label;
                btn.addEventListener('click', () => {
                    btn.disabled = true;
                    sendUser(option.label, option.value ?? option.label);
                });
                wrap.appendChild(btn);
            });
            bubble.appendChild(wrap);
        }

        messages.appendChild(bubble);
        scrollToBottom();
    }

    // El bot "piensa" un momento antes de responder (efecto de escritura).
    async function botSay(text, options = null, delay = 550) {
        showTyping();
        await wait(delay);
        hideTyping();
        addMessage(text, 'bot', options);
    }

    function sendUser(text, value = text) {
        addMessage(text, 'user');
        processInput(String(value), text);
    }

    // ---------- Detección de dispositivo y falla ----------
    function detectDevice(text) {
        if (/(consola|playstation|ps4|ps5|xbox|nintendo|switch|pc gamer|gamer)/.test(text)) return 'consolas';
        if (/(celular|telefono|movil|tablet|iphone|ipad|samsung|xiaomi|redmi|android)/.test(text)) return 'celulares';
        if (/(computador|computadora|laptop|portatil|pc|desktop|notebook|macbook|windows)/.test(text)) return 'computadores';
        return null;
    }

    function detectProblem(text, device) {
        const rules = {
            computadores: [
                ['no-enciende', ['no enciende', 'no prende', 'no da imagen', 'pantalla negra', 'no arranca', 'no bootea']],
                ['lento', ['lento', 'lenta', 'virus', 'formateo', 'formatear', 'rendimiento', 'optimizar', 'reinicia']],
                ['hardware', ['pantalla', 'teclado', 'bisagra', 'cargador', 'puerto', 'disco', 'ram']],
                ['sobrecalienta', ['calienta', 'calor', 'ruido', 'ventilador', 'sobrecalienta']]
            ],
            celulares: [
                ['pantalla', ['pantalla', 'display', 'vidrio', 'rota', 'roto', 'tactil']],
                ['bateria', ['bateria', 'no dura', 'se descarga', 'carga rapido']],
                ['puerto', ['puerto', 'conector', 'no carga', 'cargador']],
                ['software', ['lento', 'virus', 'sistema', 'actualizacion', 'bloqueado', 'reinicia']]
            ],
            consolas: [
                ['no-enciende', ['no enciende', 'no prende', 'se apaga', 'no da imagen']],
                ['sobrecalienta', ['calienta', 'calor', 'ruido', 'ventilador', 'sobrecalienta']],
                ['control', ['control', 'mando', 'drift', 'boton', 'joystick']],
                ['optimizacion', ['fps', 'lento', 'optimizar', 'rendimiento']]
            ]
        };

        const list = rules[device] || [];
        for (const [key, keywords] of list) {
            if (keywords.some((keyword) => text.includes(keyword))) return key;
        }
        return null;
    }

    // ---------- Flujo recomendador ----------
    const deviceOptions = () => Object.entries(DEVICES).map(([key, device]) => ({
        label: device.short,
        value: `device:${key}`
    }));

    function problemOptions(device) {
        return DEVICES[device].problems.map((problem) => ({
            label: problem.label,
            value: `problem:${problem.key}`
        }));
    }

    async function startRecommend(text = '') {
        const device = detectDevice(text);

        if (device) {
            state.data.device = device;
            const problem = detectProblem(text, device);
            if (problem) {
                const label = DEVICES[device].problems.find((p) => p.key === problem)?.label || 'Problema';
                return recommend(device, problem, label);
            }
            return askProblem(device);
        }

        state.flow = 'device';
        await botSay('¿Qué dispositivo necesitas revisar?', deviceOptions());
    }

    async function askProblem(device) {
        state.flow = 'problem';
        state.data.device = device;
        await botSay(
            `Entendido: **${DEVICES[device].short}**. ¿Cuál es el problema principal?`,
            problemOptions(device)
        );
    }

    async function recommend(device, problemKey, problemLabel) {
        state.flow = null;
        const deviceInfo = DEVICES[device];
        const rec = RECOMMENDATIONS[device]?.[problemKey] || RECOMMENDATIONS[device].otro;
        const label = problemLabel
            || deviceInfo.problems.find((p) => p.key === problemKey)?.label
            || 'Problema';

        state.data.prefill = {
            service: rec.service,
            message: `Equipo: ${deviceInfo.short}. Falla: ${label}. Servicio sugerido: ${rec.title}. (Recomendado por TecniBot)`
        };

        await botSay(
            `Por lo que me cuentas, te recomiendo un **${rec.title}** para tu ${deviceInfo.label}.\n\n${rec.detail}\n\nEl diagnóstico se agenda **a domicilio en Bogotá** y el valor se confirma antes de cualquier reparación.`,
            [
                { label: 'Llenar el formulario con estos datos', value: 'action:prefill' },
                { label: 'Hablar con un técnico', value: 'action:humano' },
                { label: 'Consultar otro equipo', value: 'action:recommend' }
            ]
        );
    }

    // ---------- Estado de las solicitudes ----------
    async function checkStatus() {
        let user = null;
        try {
            user = JSON.parse(localStorage.getItem('usuarioTecniPro') || 'null');
        } catch (error) {
            user = null;
        }

        if (!user || !user.email) {
            await botSay(
                'Para consultar el estado de tu equipo necesitas **iniciar sesión**. Si aún no tienes cuenta, puedes solicitar el servicio desde el formulario.',
                [
                    { label: 'Iniciar sesión', value: 'action:login' },
                    { label: 'Solicitar servicio', value: 'action:prefill' }
                ]
            );
            return;
        }

        showTyping();
        try {
            const res = await fetch(`${API_URL}/api/servicios/${encodeURIComponent(user.email)}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const servicios = await res.json();
            hideTyping();

            if (!Array.isArray(servicios) || servicios.length === 0) {
                await botSay(
                    `Hola **${user.nombre || 'cliente'}**, no veo solicitudes registradas con **${user.email}**.\n\nPuedes crear una desde el formulario y seguirla desde tu panel.`,
                    [
                        { label: 'Solicitar servicio', value: 'action:prefill' },
                        { label: 'Hablar con un técnico', value: 'action:humano' }
                    ]
                );
                return;
            }

            const servicio = servicios[0];
            const estado = servicio.estado || 'Recibido';
            const fecha = servicio.fecha ? new Date(servicio.fecha).toLocaleDateString('es-CO') : 'sin fecha';
            const extra = servicios.length > 1 ? `Tienes ${servicios.length} solicitudes en total. ` : '';

            await botSay(
                `Hola **${user.nombre || 'cliente'}**. Tu solicitud más reciente es:\n\n**${servicio.servicio || 'Soporte técnico'}**\nEstado: **${estado}**\nFecha: ${fecha}\n\n${extra}Para ver el detalle completo, entra a tu panel.`,
                [
                    { label: 'Abrir mi panel', value: 'action:dashboard' },
                    { label: 'Hablar con un técnico', value: 'action:humano' }
                ]
            );
        } catch (error) {
            hideTyping();
            console.error('TecniBot: error consultando servicios', error);
            await botSay(
                'No pude conectar con el servidor para consultar tus servicios. Revisa que el backend esté activo o escríbenos por WhatsApp.',
                [{ label: 'Hablar con un técnico', value: 'action:humano' }]
            );
        }
    }

    // ---------- Acciones de los botones ----------
    function prefillForm() {
        const formContact = document.getElementById('contactForm');
        const contact = document.getElementById('contacto');
        const data = state.data.prefill;

        if (!formContact) {
            addMessage('No encontré el formulario en esta página. Abre la sección de contacto y lo llenamos.', 'bot');
            return;
        }

        const select = formContact.querySelector('[name="servicio"]');
        const textarea = formContact.querySelector('[name="mensaje"]');

        if (select && data?.service) select.value = data.service;
        if (textarea) {
            textarea.value = data?.message || 'Hola, quiero solicitar un diagnóstico a domicilio.';
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }

        closeChat();
        if (contact) contact.scrollIntoView({ behavior: 'smooth' });
        window.setTimeout(() => textarea?.focus({ preventScroll: true }), 600);

        if (typeof window.mostrarToast === 'function') {
            window.mostrarToast('Formulario precargado. Revisa los datos y envíalo.', 'exito');
        }
    }

    function openLogin() {
        closeChat();
        const btn = document.getElementById('openLoginBtn');
        if (btn) {
            btn.click();
            window.setTimeout(() => document.getElementById('login-email')?.focus(), 150);
        } else {
            document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' });
        }
    }

    async function talkToHuman() {
        await botSay(
            'Puedes hablar con un técnico por **WhatsApp** al **+57 313 8178896** o escribir a **rinconemanuel71@gmail.com**. Te respondemos lo antes posible.',
            [
                { label: 'Abrir WhatsApp', value: 'action:whatsapp' },
                { label: 'Solicitar por formulario', value: 'action:prefill' }
            ]
        );
    }

    async function runAction(action) {
        switch (action) {
            case 'action:recommend': return startRecommend('');
            case 'action:status': return checkStatus();
            case 'action:humano': return talkToHuman();
            case 'action:prefill': return prefillForm();
            case 'action:login': return openLogin();
            case 'action:dashboard': window.location.href = 'dashboard.html'; return;
            case 'action:whatsapp': window.open(WHATSAPP, '_blank', 'noopener,noreferrer'); return;
            case 'action:contacto':
                closeChat();
                document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' });
                return;
            default: return;
        }
    }

    // ---------- Intenciones (FAQ) ----------
    const INTENTS = [
        {
            id: 'problema',
            keywords: ['no enciende', 'no prende', 'pantalla rota', 'no carga', 'no da imagen', 'se apaga', 'sobrecalienta', 'virus', 'formatear', 'va lento', 'muy lento', 'drift', 'no funciona el control'],
            action: 'recommend'
        },
        {
            id: 'recomendar',
            keywords: ['recomienda', 'recomiendame', 'recomendacion', 'que servicio', 'cual servicio', 'no se que', 'elegir', 'asesorame'],
            action: 'recommend'
        },
        { id: 'estado', keywords: ['estado', 'mi equipo', 'mi servicio', 'como va', 'seguimiento', 'panel', 'dashboard'], action: 'status' },
        {
            id: 'precio',
            keywords: ['precio', 'precios', 'cuanto', 'cuesta', 'costo', 'vale', 'tarifa', 'cotizacion', 'cotizar', 'presupuesto'],
            reply: 'El valor depende del equipo y de la falla, por eso primero hacemos un **diagnóstico**. Te damos el presupuesto antes de intervenir: no se hace ningún trabajo sin tu aprobación.\n\n¿Quieres solicitar un diagnóstico a domicilio?',
            options: [
                { label: 'Solicitar diagnóstico', value: 'action:prefill' },
                { label: 'Hablar con un técnico', value: 'action:humano' }
            ]
        },
        {
            id: 'garantia',
            keywords: ['garantia', 'garantias', 'respaldo', 'aseguran'],
            reply: 'Todos los servicios incluyen **garantía** por la reparación y los repuestos. Puedes leer las condiciones aquí: [Garantía del Servicio](./legal%20html/garantia-servicio.html).'
        },
        {
            id: 'tiempo',
            keywords: ['cuanto tarda', 'tiempo', 'demora', 'tarda', 'entrega', 'cuando queda listo'],
            reply: 'El diagnóstico inicial suele tomar **menos de 24 horas**. La reparación depende del repuesto, y puedes seguir el avance desde tu panel.',
            options: [
                { label: 'Ver estado de mi equipo', value: 'action:status' },
                { label: 'Solicitar servicio', value: 'action:prefill' }
            ]
        },
        {
            id: 'cobertura',
            keywords: ['cobertura', 'cubren', 'domicilio', 'donde', 'ubicacion', 'direccion', 'bogota', 'ciudad', 'llegan'],
            reply: 'Atendemos **a domicilio en Bogotá**. Si estás en otra ciudad, escríbenos por WhatsApp y revisamos si podemos coordinar el servicio.',
            options: [
                { label: 'Hablar con un técnico', value: 'action:humano' },
                { label: 'Solicitar servicio', value: 'action:prefill' }
            ]
        },
        {
            id: 'servicios',
            keywords: ['servicio', 'servicios', 'reparan', 'reparar', 'reparacion', 'arreglan', 'arreglar', 'que hacen', 'ofrecen', 'catalogo'],
            reply: 'Trabajamos en tres líneas:\n\n**Computadores y laptops**: mantenimiento, formateo, virus y hardware.\n**Celulares y tablets**: pantallas, baterías y puerto de carga.\n**Consolas y PC gamer**: limpieza térmica, controles y optimización.\n\nTodo **a domicilio en Bogotá**.',
            options: [
                { label: 'Recomiéndame un servicio', value: 'action:recommend' },
                { label: 'Solicitar servicio', value: 'action:prefill' }
            ]
        },
        {
            id: 'agendar',
            keywords: ['agendar', 'cita', 'solicitar', 'solicitud', 'formulario', 'contratar', 'pedir servicio'],
            reply: 'Perfecto. Te llevo al formulario para que dejes tus datos y el detalle del equipo. Un técnico te contacta para coordinar la visita.',
            options: [{ label: 'Ir al formulario', value: 'action:prefill' }]
        },
        {
            id: 'humano',
            keywords: ['humano', 'persona', 'tecnico', 'asesor', 'whatsapp', 'contacto', 'llamar', 'telefono', 'correo', 'hablar'],
            action: 'humano'
        },
        {
            id: 'horario',
            keywords: ['horario', 'hora', 'abren', 'cierran', 'atienden', 'disponible', 'disponibilidad'],
            reply: 'Coordinamos la visita contigo al confirmar la solicitud. Escríbenos por WhatsApp para acordar el horario que te sirva.',
            options: [
                { label: 'Hablar con un técnico', value: 'action:humano' },
                { label: 'Solicitar servicio', value: 'action:prefill' }
            ]
        },
        {
            id: 'pago',
            keywords: ['pago', 'pagar', 'nequi', 'transferencia', 'tarjeta', 'efectivo'],
            reply: 'Los medios de pago se confirman al agendar el servicio. El técnico te indica las opciones disponibles antes de empezar.',
            options: [{ label: 'Hablar con un técnico', value: 'action:humano' }]
        },
        {
            id: 'datos',
            keywords: ['datos', 'privacidad', 'ley', '1581', 'tratamiento', 'mis datos'],
            reply: 'Tus datos se usan solo para gestionar la solicitud, según la Ley 1581 de 2012. Puedes leer la política aquí: [Tratamiento de Datos](./legal%20html/tratamiento-datos.html).'
        },
        {
            id: 'saludo',
            keywords: ['hola', 'buenas', 'buenos dias', 'buenas tardes', 'buenas noches', 'hey', 'que tal', 'saludos'],
            reply: '¡Hola! Soy **TecniBot**, el asistente virtual de TecniPro. Puedo recomendarte un servicio, explicarte cómo funciona el diagnóstico o consultar el estado de tu equipo.',
            options: [
                { label: 'Recomiéndame un servicio', value: 'action:recommend' },
                { label: 'Ver estado de mi equipo', value: 'action:status' },
                { label: 'Hablar con un técnico', value: 'action:humano' }
            ]
        },
        {
            id: 'gracias',
            keywords: ['gracias', 'muchas gracias', 'te agradezco'],
            reply: '¡Con gusto! Si necesitas algo más, aquí estoy. 🤖'
        },
        {
            id: 'despedida',
            keywords: ['adios', 'chao', 'hasta luego', 'nos vemos', 'bye'],
            reply: '¡Hasta pronto! Si necesitas soporte, escríbenos por WhatsApp o desde el formulario. 👋'
        }
    ];

    // Elige la intención con más coincidencias. Las frases de varias
    // palabras valen más que una palabra suelta.
    function detectIntent(text) {
        let best = null;
        let bestScore = 0;

        for (const intent of INTENTS) {
            let score = 0;
            for (const keyword of intent.keywords) {
                if (text.includes(keyword)) score += keyword.includes(' ') ? 3 : 1;
            }
            if (score > bestScore) {
                bestScore = score;
                best = intent;
            }
        }

        return best;
    }

    async function handleIntent(text) {
        const intent = detectIntent(text);

        if (!intent) {
            await botSay(
                'No estoy seguro de haber entendido. Puedo ayudarte con esto:',
                [
                    { label: 'Recomiéndame un servicio', value: 'action:recommend' },
                    { label: 'Precios y diagnóstico', value: 'precio' },
                    { label: 'Ver estado de mi equipo', value: 'action:status' },
                    { label: 'Hablar con un técnico', value: 'action:humano' }
                ]
            );
            return;
        }

        if (intent.action === 'recommend') return startRecommend(text);
        if (intent.action === 'status') return checkStatus();
        if (intent.action === 'humano') return talkToHuman();

        await botSay(intent.reply, intent.options || null);
    }

    // ---------- Flujos con estado ----------
    async function handleFlow(text, raw) {
        if (state.flow === 'device') {
            const device = detectDevice(text);
            if (device) return askProblem(device);
            await botSay('No identifiqué el dispositivo. Elige una de las opciones:', deviceOptions());
            return true;
        }

        if (state.flow === 'problem') {
            const device = state.data.device;
            const problem = detectProblem(text, device);
            const label = problem
                ? DEVICES[device].problems.find((p) => p.key === problem)?.label
                : raw.slice(0, 120);
            await recommend(device, problem || 'otro', label);
            return true;
        }

        return false;
    }

    async function processInput(value, label) {
        const text = normalize(value);

        // Las acciones y opciones tienen prioridad sobre los flujos.
        if (value.startsWith('action:')) return runAction(value);
        if (value.startsWith('device:')) return askProblem(value.split(':')[1]);
        if (value.startsWith('problem:')) {
            const key = value.split(':')[1];
            const device = state.data.device;
            const problemLabel = DEVICES[device]?.problems.find((p) => p.key === key)?.label;
            return recommend(device, key, problemLabel);
        }

        if (state.flow) {
            const handled = await handleFlow(text, label);
            if (handled) return;
        }

        await handleIntent(text);
    }

    // ---------- Abrir / cerrar ----------
    async function greet() {
        if (state.greeted) return;
        state.greeted = true;

        await botSay(
            '¡Hola! 👋 Soy **TecniBot**, el asistente virtual de TecniPro. Puedo recomendarte un servicio según tu equipo, resolver dudas o consultar el estado de tu reparación.',
            [
                { label: 'Recomiéndame un servicio', value: 'action:recommend' },
                { label: 'Precios y diagnóstico', value: 'precio' },
                { label: 'Ver estado de mi equipo', value: 'action:status' },
                { label: 'Hablar con un técnico', value: 'action:humano' }
            ]
        );
    }

    function openChat() {
        state.open = true;
        panel.classList.add('open');
        panel.setAttribute('aria-hidden', 'false');
        toggle.setAttribute('aria-expanded', 'true');

        const isDesktop = window.matchMedia('(min-width: 601px)').matches;
        if (isDesktop) window.setTimeout(() => input.focus(), 260);

        greet();
    }

    function closeChat() {
        state.open = false;
        panel.classList.remove('open');
        panel.setAttribute('aria-hidden', 'true');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
    }

    toggle.addEventListener('click', () => {
        if (state.open) closeChat();
        else openChat();
    });

    closeBtn.addEventListener('click', closeChat);

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const text = input.value.trim();
        if (!text) return;
        input.value = '';
        sendUser(text);
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && state.open) closeChat();
    });
})();
