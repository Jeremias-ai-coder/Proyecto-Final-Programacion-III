// URL base de la API RESTful
const pageBasePath = (function() {
    try {
        const pathname = window.location.pathname;
        const parts = pathname.split('/');
        const knownPages = ['pagina-inicio','client','crear-negocio','agregar-horario','login','dashboard','registro','api'];
        while (parts.length > 0) {
            const last = parts[parts.length - 1];
            if (last === '' || knownPages.includes(last)) {
                parts.pop();
            } else {
                break;
            }
        }
        return parts.join('/');
    } catch (e) {
        return '';
    }
})();
const apiUrl = pageBasePath + '/api';
let cachedBusinesses = [];

// 1. CONTROL DE ACCESO (AUTENTICACIÓN Y ROLES)
// Obtenemos los datos de sesión almacenados en localStorage al iniciar sesión
const userId = localStorage.getItem('userId');
const userRole = localStorage.getItem('userRole');

// Si no hay sesión o el usuario no es Dueño ni Administrador, bloqueamos el acceso
if (!userId || (userRole !== 'owner' && userRole !== 'administrator')) {
    alert('Acceso denegado. Debes iniciar sesión como dueño o administrador.');
    window.location.href = pageBasePath + '/login'; // Redirección al formulario de login
}

// 2. FUNCIÓN DE PETICIONES HTTP
// Simplifica llamadas AJAX usando fetch, soportando envío de datos en JSON
async function request(route, method = 'GET', body = null) {
    const options = { method, headers: {} };
    if (body) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
    }
    const url = `${apiUrl}/${route}`;
    const response = await fetch(url, options);
    return response;
}

// 3. VINCULADOR DE FORMULARIOS AUTOMÁTICO (CRUD)
// Automatiza el envío de formularios por POST y maneja las respuestas JSON de la API
function bindForm(formId, route, successMessage, extraMapper = (body) => body, onSuccess = null) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    form.addEventListener('submit', async (event) => {
        event.preventDefault(); // Evitamos la recarga por defecto de la página
        
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
        }
        
        const formData = new FormData(form);
        const body = {};
        for (const [key, value] of formData.entries()) {
            body[key] = value;
        }
        
        // Mapeamos los datos del formulario al formato esperado por el backend
        const payload = extraMapper(body);
        
        // Validaciones previas en el cliente
        if (payload.hasOwnProperty('owner_id') && (!payload.owner_id || isNaN(payload.owner_id))) {
            alert('Debes iniciar sesión como dueño para crear un negocio.');
            if (submitBtn) submitBtn.disabled = false;
            return;
        }
        
        if (payload.hasOwnProperty('business_id') && !payload.business_id) {
            alert('Por favor selecciona un negocio válido.');
            if (submitBtn) submitBtn.disabled = false;
            return;
        }

        try {
            // Enviamos la petición a la API
            const res = await request(route, 'POST', payload);
            let data = null;
            try { data = await res.json(); } catch (e) { data = null; }
            
            if (res.ok) {
                alert(successMessage + (data && data.id ? (": " + data.id) : ''));
                form.reset(); // Limpiamos los campos
                if (typeof onSuccess === 'function') onSuccess(data); // Ejecutamos callback si existe
            } else {
                alert('Error: ' + (data && data.message ? data.message : res.statusText));
            }
        } catch (error) {
            console.error('Error submitting form', error);
            alert('Error de conexión con el servidor.');
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    });
}

// 4. ENVÍO DE FORMULARIO: REGISTRAR NEGOCIO
bindForm('businessForm', 'businesses', 'Negocio creado', (body) => ({
    name: body.businessName,
    description: body.businessDescription,
    address: body.businessAddress,
    logo_url: body.businessLogoUrl,
    owner_id: (localStorage.getItem('userId') ? parseInt(localStorage.getItem('userId')) : null),
}), async (created) => {
    // Al crear un negocio nuevo, actualizamos inmediatamente todos los desplegables del panel
    const businesses = await loadBusinessesInto(
        document.getElementById('serviceBusinessId'),
        document.getElementById('scheduleBusinessId'),
        document.getElementById('agendaBusinessId')
    );
    // Notificamos a otras secciones del sistema mediante un evento personalizado
    document.dispatchEvent(new CustomEvent('businessesUpdated', { detail: { businesses } }));
});

// 5. ENVÍO DE FORMULARIO: CREAR SERVICIO
bindForm('serviceForm', 'services', 'Servicio creado', (body) => ({
    // Leemos el ID del negocio directamente del DOM (para que funcione incluso si el selector está deshabilitado)
    business_id: document.getElementById('serviceBusinessId').value,
    name: body.serviceName,
    description: body.serviceDescription,
    duration_minutes: body.serviceDuration,
    price: body.servicePrice,
}), (created) => {
    document.dispatchEvent(new CustomEvent('servicesUpdated', { detail: { service: created } }));
});

// 6. ENVÍO DE FORMULARIO: DEFINIR HORARIO DE ATENCIÓN
bindForm('scheduleForm', 'schedule', 'Horario guardado', (body) => ({
    business_id: document.getElementById('scheduleBusinessId').value,
    day_of_week: body.scheduleDay,
    start_time: body.scheduleStart,
    end_time: body.scheduleEnd,
}), (created) => {
    document.dispatchEvent(new CustomEvent('schedulesUpdated', { detail: { schedule: created } }));
});

// 7. CARGA COMERCIAL DE LA AGENDA DIARIA
const loadAgenda = document.getElementById('loadAgenda');
if (loadAgenda) {
    loadAgenda.addEventListener('click', async () => {
        const businessId = document.getElementById('agendaBusinessId').value;
        const date = document.getElementById('agendaDate').value || new Date().toISOString().slice(0, 10);
        
        if (!businessId) {
            alert('Selecciona un negocio para visualizar la agenda.');
            return;
        }

        // Consultamos a la API los turnos y horarios de ese día específico
        const result = await fetch(`${apiUrl}/agenda?business_id=${businessId}&date=${date}`);
        const data = await result.json();
        
        const target = document.getElementById('agendaResult');
        target.innerHTML = '';
        
        // Renderizamos los horarios configurados del negocio
        if (data.schedules.length === 0) {
            target.innerHTML = '<p class="text-muted text-center">No hay horarios definidos para este día.</p>';
        } else {
            target.innerHTML = data.schedules.map(s => `
                <div class="agenda-item">
                    <strong>Día de la semana:</strong> ${s.day_of_week} — Horario: ${s.start_time.substring(0,5)} a ${s.end_time.substring(0,5)} hs
                </div>
            `).join('');
        }
        
        // Renderizamos el listado de turnos que ya se encuentran agendados por clientes
        if (data.appointments.length > 0) {
            target.innerHTML += '<h5 class="fw-bold mt-4 mb-3 text-dark">Turnos agendados</h5>';
            target.innerHTML += data.appointments.map(a => {
                let badgeClass = 'bg-secondary';
                let statusLabel = 'Pendiente';
                if (a.status === 'completed') { badgeClass = 'bg-success'; statusLabel = 'Completado'; }
                else if (a.status === 'cancelled') { badgeClass = 'bg-danger'; statusLabel = 'Cancelado'; }

                return `
                    <div class="agenda-item d-flex justify-content-between align-items-center">
                        <div>
                            <strong>Hora:</strong> ${a.time.substring(0, 5)} hs — 
                            <strong>Servicio:</strong> ${a.service.name} — 
                            <strong>Cliente:</strong> ${a.user.name}
                        </div>
                        <span class="badge ${badgeClass}">${statusLabel}</span>
                    </div>
                `;
            }).join('');
        }
    });
}

// 8. LLENADO DINÁMICO DE SELECTORES SEGÚN ROL
// Consulta a la API y llena los selectores de negocio. Si es dueño, los filtra automáticamente.
async function loadBusinessesInto(...sels) {
    let url = `${apiUrl}/businesses`;
    // Si el usuario conectado es dueño (owner), aplicamos el filtro en la API
    if (userRole === 'owner') {
        url += `?owner_id=${userId}`;
    }
    
    try {
        const res = await fetch(url);
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`HTTP ${res.status}: ${errText}`);
        }
        const businesses = await res.json();
        cachedBusinesses = businesses; // Guardar en caché local

        function fill(sel) {
            if (!sel) return;
            sel.disabled = false; // Habilitar por defecto
            sel.innerHTML = '';

            // Si el dueño no tiene negocios creados
            if (businesses.length === 0) {
                const opt = document.createElement('option');
                opt.value = '';
                opt.text = 'No tienes negocios registrados';
                sel.appendChild(opt);
                return;
            }

            // UX: Si tiene exactamente un negocio, lo pre-seleccionamos pero lo dejamos activo
            if (businesses.length === 1 && userRole === 'owner') {
                const b = businesses[0];
                const opt = document.createElement('option');
                opt.value = b.id;
                opt.text = b.name;
                opt.selected = true;
                sel.appendChild(opt);
                return;
            }

            // Caso contrario (múltiples negocios), mostramos desplegable tradicional
            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.text = '-- Seleccione --';
            sel.appendChild(placeholder);

            for (const b of businesses) {
                const opt = document.createElement('option');
                opt.value = b.id;
                opt.text = b.name;
                sel.appendChild(opt);
            }
        }

        for (const sel of sels) fill(sel);
        return businesses;
    } catch (e) {
        console.error('Error al cargar negocios en el panel:', e);
        alert('Error al cargar negocios en el panel: ' + e.message);
        return [];
    }
}

// 9. INICIALIZACIÓN AL CARGAR LA PÁGINA
async function initDashboard() {

    // A. Mostrar datos de usuario y rol dinámicamente en el banner
    const welcomeUser = document.getElementById('welcomeUser');
    const roleBadge = document.getElementById('roleBadge');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (welcomeUser) {
        const userName = localStorage.getItem('userName') || 'Usuario';
        welcomeUser.innerText = `¡Hola, ${userName}!`;
    }
    
    if (roleBadge) {
        const roleText = userRole === 'owner' ? 'Dueño de Negocio' : 'Administrador del Sistema';
        roleBadge.innerText = roleText;
        roleBadge.className = userRole === 'owner' ? 'badge bg-success mt-1 fs-6 px-3 py-2' : 'badge bg-dark mt-1 fs-6 px-3 py-2';
    }
    
    // B. Vincular el botón de Cerrar Sesión del banner
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await fetch(`${apiUrl}/logout`, { method: 'POST' });
            } catch (e) {
                console.error('Error closing session on server', e);
            }
            localStorage.clear(); // Limpiamos todos los datos guardados en navegador
            alert('Sesión cerrada correctamente.');
            window.location.href = pageBasePath + '/login';
        });
    }

    const serviceBusiness = document.getElementById('serviceBusinessId');
    const scheduleBusiness = document.getElementById('scheduleBusinessId');
    const agendaBusiness = document.getElementById('agendaBusinessId');
    const editBusiness = document.getElementById('editBusinessId');
    
    // C. Cargar los negocios correspondientes en los desplegables
    const businesses = await loadBusinessesInto(serviceBusiness, scheduleBusiness, agendaBusiness, editBusiness);

    // D. Vincular evento de auto-rellenado para el formulario de edición
    const editName = document.getElementById('editBusinessName');
    const editDesc = document.getElementById('editBusinessDescription');
    const editAddr = document.getElementById('editBusinessAddress');
    const editLogo = document.getElementById('editBusinessLogoUrl');

    function autofillEditForm() {
        if (!editBusiness) return;
        const bid = parseInt(editBusiness.value, 10);
        if (!bid) {
            if (editName) editName.value = "";
            if (editDesc) editDesc.value = "";
            if (editAddr) editAddr.value = "";
            if (editLogo) editLogo.value = "";
            return;
        }
        const biz = cachedBusinesses.find(b => b.id === bid);
        if (biz) {
            if (editName) editName.value = biz.name || "";
            if (editDesc) editDesc.value = biz.description || "";
            if (editAddr) editAddr.value = biz.address || "";
            if (editLogo) editLogo.value = biz.logo_url || "";
        }
    }

    if (editBusiness) {
        editBusiness.addEventListener('change', autofillEditForm);
        // Si hay exactamente un negocio (que estará pre-seleccionado), auto-rellenar al inicio
        if (cachedBusinesses.length === 1) {
            autofillEditForm();
        }
    }

    // E. Vincular envío de formulario de edición (PUT)
    const editForm = document.getElementById('editBusinessForm');
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!editBusiness) return;
            const bid = parseInt(editBusiness.value, 10);
            if (!bid) {
                alert('Por favor selecciona un negocio válido.');
                return;
            }

            const payload = {
                id: bid,
                name: editName ? editName.value.trim() : "",
                description: editDesc ? editDesc.value.trim() : "",
                address: editAddr ? editAddr.value.trim() : "",
                logo_url: editLogo ? editLogo.value.trim() : "",
                owner_id: (userId ? parseInt(userId, 10) : null)
            };

            if (!payload.name) {
                alert('El nombre del negocio es obligatorio.');
                return;
            }

            const res = await request('businesses', 'PUT', payload);
            let data = null;
            try { data = await res.json(); } catch(err){}

            if (res.ok) {
                alert('Información del negocio actualizada correctamente.');
                // Actualizar la caché local
                const index = cachedBusinesses.findIndex(b => b.id === bid);
                if (index !== -1 && data) {
                    cachedBusinesses[index] = data;
                }
                
                // Recargar desplegables
                await loadBusinessesInto(serviceBusiness, scheduleBusiness, agendaBusiness, editBusiness);
                
                // Re-ejecutar auto-rellenado para consistencia visual
                autofillEditForm();

                // Notificar a otras vistas
                document.dispatchEvent(new CustomEvent('businessesUpdated', { detail: { businesses: cachedBusinesses } }));
            } else {
                alert('Error al actualizar negocio: ' + (data && data.message ? data.message : res.statusText));
            }
        });
    }
    
    // F. Alerta amigable si es dueño nuevo sin negocios registrados
    if (userRole === 'owner' && (!businesses || businesses.length === 0)) {
        const target = document.getElementById('agendaResult');
        if (target) {
            target.innerHTML = `
                <div class="alert alert-warning text-center shadow-sm">
                    <h5 class="fw-bold">¡Bienvenido!</h5>
                    <p class="mb-0 small text-muted">Aún no tienes ningún negocio registrado. Utiliza el panel de la izquierda para crear tu primer negocio y empezar a configurarlo.</p>
                </div>
            `;
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    initDashboard();
}

// 10. RE-LLENADO ANTE ACTUALIZACIÓN DE EVENTOS
document.addEventListener('businessesUpdated', (e) => {
    const serviceBusiness = document.getElementById('serviceBusinessId');
    const scheduleBusiness = document.getElementById('scheduleBusinessId');
    const agendaBusiness = document.getElementById('agendaBusinessId');
    const editBusiness = document.getElementById('editBusinessId');
    if (!serviceBusiness && !scheduleBusiness && !agendaBusiness && !editBusiness) return;
    const businesses = e.detail && e.detail.businesses ? e.detail.businesses : [];
    cachedBusinesses = businesses; // Sincronizar caché
    
    function fill(sel) {
        if (!sel) return;
        sel.disabled = false; // Habilitar por defecto
        sel.innerHTML = '';
        
        if (businesses.length === 0) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.text = 'No tienes negocios registrados';
            sel.appendChild(opt);
            return;
        }

        if (businesses.length === 1 && userRole === 'owner') {
            const b = businesses[0];
            const opt = document.createElement('option');
            opt.value = b.id;
            opt.text = b.name;
            opt.selected = true;
            sel.appendChild(opt);
            return;
        }

        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.text = '-- Seleccione --';
        sel.appendChild(placeholder);
        
        for (const b of businesses) {
            const opt = document.createElement('option');
            opt.value = b.id;
            opt.text = b.name;
            sel.appendChild(opt);
        }
    }
    fill(serviceBusiness); fill(scheduleBusiness); fill(agendaBusiness); fill(editBusiness);
    
    // Auto-rellenar formulario de edición si es necesario tras el re-llenado
    try {
        const editName = document.getElementById('editBusinessName');
        const editDesc = document.getElementById('editBusinessDescription');
        const editAddr = document.getElementById('editBusinessAddress');
        const editLogo = document.getElementById('editBusinessLogoUrl');
        if (editBusiness && editBusiness.value) {
            const bid = parseInt(editBusiness.value, 10);
            const biz = cachedBusinesses.find(b => b.id === bid);
            if (biz) {
                if (editName) editName.value = biz.name || "";
                if (editDesc) editDesc.value = biz.description || "";
                if (editAddr) editAddr.value = biz.address || "";
                if (editLogo) editLogo.value = biz.logo_url || "";
            }
        }
    } catch(err){}
});
