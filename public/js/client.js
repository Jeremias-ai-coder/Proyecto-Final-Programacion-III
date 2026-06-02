console.info('client.js cargando...');

// 1. DETERMINAR RUTA DE LA API DINÁMICAMENTE
// Resuelve si la app se sirve desde la raíz o desde un subdirectorio de XAMPP (ej: /Proyecto Turnos Ya/api)
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
console.info('client.js apiUrl=', apiUrl);

// 2. FUNCIÓN: CONSULTAR NEGOCIOS A LA API
async function fetchBusinesses() {
    try {
        const res = await fetch(`${apiUrl}/businesses`);
        if (!res.ok) {
            const errText = await res.text();
            console.error('Failed to fetch businesses', res.status, errText);
            return [];
        }
        const data = await res.json();
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('Network error fetching businesses', error);
        return [];
    }
}

// 3. FUNCIÓN: CONSULTAR SERVICIOS A LA API (FILTRABLE POR NEGOCIO)
async function fetchServices(businessId = null, search = '') {
    let url = `${apiUrl}/services?search=${encodeURIComponent(search)}`;
    if (businessId) url += `&business_id=${businessId}`;
    const res = await fetch(url);
    return res.json();
}

// Auxiliar para rellenar elementos select de HTML de forma genérica
function populateSelect(selectEl, items, labelFn) {
    selectEl.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.text = '-- Seleccione --';
    selectEl.appendChild(placeholder);
    for (const it of items) {
        const opt = document.createElement('option');
        opt.value = it.id;
        opt.text = labelFn(it);
        selectEl.appendChild(opt);
    }
}

// 4. FUNCIÓN: RENDERIZAR TARJETAS DE NEGOCIOS (ESTILO MERCADO LIBRE)
function renderBusinessCards(items) {
    const grid = document.getElementById('businessGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    if (!items.length) {
        grid.innerHTML = '<div class="col-12"><div class="alert alert-info">No se encontraron empresas activas.</div></div>';
        return;
    }
    
    const userId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole');
    
    for (const business of items) {
        const card = document.createElement('div');
        card.className = 'col-sm-6 col-md-4 col-lg-3';
        const initials = (business.name || '').split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase();
        
        // Elegir si pintar el logo o las iniciales
        const logoContent = business.logo_url 
            ? `<img src="${business.logo_url}" class="w-100 h-100 object-fit-cover rounded-circle shadow-sm p-1" alt="${business.name}" onerror="this.outerHTML='<div class=&quot;avatar&quot;>${initials}</div>'">`
            : `<div class="avatar">${initials || 'TY'}</div>`;

        // Elegir si pintar la dirección
        const addressContent = business.address 
            ? `<p class="mb-2 small text-muted text-truncate" title="${business.address}"><span class="me-1">📍</span>${business.address}</p>`
            : `<p class="mb-2 small text-muted text-truncate text-secondary italic">📍 Dirección no especificada</p>`;
        
        const isOwnerOrAdmin = (userId && (business.owner_id == userId || userRole === 'administrator'));
        let dropdownHtml = '';
        if (isOwnerOrAdmin) {
            dropdownHtml = `
                <div class="dropdown position-absolute top-0 end-0 m-3" style="z-index: 10;">
                    <button class="btn btn-link text-secondary p-0 border-0" type="button" data-bs-toggle="dropdown" aria-expanded="false" style="width: 32px; height: 32px; border-radius: 50%; background: rgba(255, 255, 255, 0.9); box-shadow: 0 2px 8px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; text-decoration: none;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-three-dots-vertical" viewBox="0 0 16 16" style="color: #475569;">
                            <path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
                        </svg>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end shadow border-0 py-1" style="border-radius: 8px; font-size: 0.88rem; min-width: 140px; margin-top: 4px;">
                        <li>
                            <button type="button" class="dropdown-item text-danger fw-semibold d-flex align-items-center gap-2 btn-delete-business" data-business-id="${business.id}" data-business-name="${business.name}">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-trash3-fill" viewBox="0 0 16 16">
                                    <path d="M11 1.5v1h3.5a.5.5 0 0 1 0 1h-.538l-.853 10.66A2 2 0 0 1 11.115 16h-6.23a2 2 0 0 1-1.994-1.84L2.038 3.5H1.5a.5.5 0 0 1 0-1H5v-1A1.5 1.5 0 0 1 6.5 0h3A1.5 1.5 0 0 1 11 1.5Zm-5 0v1h4v-1a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5ZM4.5 5.029l.5 8.5a.5.5 0 1 0 .998-.06l-.5-8.5a.5.5 0 1 0-.998.06Zm6.53-.528a.5.5 0 0 0-.528.47l-.5 8.5a.5.5 0 0 0 .998.058l.5-8.5a.5.5 0 0 0-.47-.528ZM8 4.5a.5.5 0 0 0-.5.5v8.5a.5.5 0 0 0 1 0V5a.5.5 0 0 0-.5-.5Z"/>
                                </svg>
                                Eliminar
                            </button>
                        </li>
                    </ul>
                </div>
            `;
        }
        
        card.innerHTML = `
            <div class="ml-card h-100 d-flex flex-column shadow-sm">
                ${dropdownHtml}
                <div class="ml-image">
                    <div style="width: 72px; height: 72px; display: flex; align-items: center; justify-content: center;">
                        ${logoContent}
                    </div>
                </div>
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title text-truncate">${business.name}</h5>
                    <p class="card-text text-truncate mb-2">${business.description || 'Sin descripción'}</p>
                    ${addressContent}
                    <p class="mb-3 small text-muted">Dueño: ${business.owner ? business.owner.name : 'N/D'}</p>
                    <div class="actions d-flex justify-content-between align-items-center mt-auto">
                        <button class="btn btn-light btn-sm btn-view-business" data-business-id="${business.id}">Ver tienda</button>
                        <button class="btn btn-outline-primary btn-sm btn-select-business" data-business-id="${business.id}">Agendar turno</button>
                    </div>
                </div>
            </div>
        `;
        grid.appendChild(card);
    }
}

// Filtro cliente para buscar negocios
function filterBusinesses(items, query) {
    if (!query) return items;
    return items.filter(b => {
        const text = `${b.name} ${b.description || ''}`.toLowerCase();
        return text.includes(query.toLowerCase());
    });
}

// 5. INICIALIZADOR PRINCIPAL SEGURO DE CARGA (init)
async function init() {
    console.info('client.js init() ejecutándose...');
    const userDisplay = document.getElementById('userDisplay');
    const businessSearch = document.getElementById('businessSearch');
    const businessGrid = document.getElementById('businessGrid');
    const reserveSection = document.getElementById('reserveSection');
    const selectedBusinessName = document.getElementById('selectedBusinessName');
    const selectedBusinessId = document.getElementById('selectedBusinessId');
    const selectService = document.getElementById('selectService');
    const form = document.getElementById('solicitarTurno');
    
    // Sesión
    const userId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole');

    // Nuevos elementos agregados
    const bookingDate = document.getElementById('bookingDate');
    const bookingTime = document.getElementById('bookingTime');
    const timeSlotsContainer = document.getElementById('timeSlotsContainer');
    const dynamicNavButtons = document.getElementById('dynamicNavButtons');

    const myAppointmentsSection = document.getElementById('myAppointmentsSection');
    const closeAppointmentsBtn = document.getElementById('closeAppointmentsBtn');
    const appointmentsList = document.getElementById('appointmentsList');

    // Restringir el date picker para no seleccionar fechas pasadas
    if (bookingDate) {
        const localNow = new Date();
        const y = localNow.getFullYear();
        const m = String(localNow.getMonth() + 1).padStart(2, '0');
        const d = String(localNow.getDate()).padStart(2, '0');
        bookingDate.min = `${y}-${m}-${d}`;
    }

    let businesses = await fetchBusinesses();

    // Notificación flotante rápida si recién creó un negocio
    const insertedCreatedBusiness = insertPendingCreatedBusiness(businesses);
    if (insertedCreatedBusiness) {
        try { showCreationToast(insertedCreatedBusiness); } catch (e) { console.warn('No se pudo mostrar toast', e); }
    }

    renderBusinessCards(businesses);

    // B. Mostrar nombre del usuario autenticado en la barra
    if (userId) {
        const res = await fetch(`${apiUrl}/users?id=${userId}`);
        if (res.ok) {
            const u = await res.json();
            userDisplay.value = `${u.name} (${u.email})`;
        } else {
            userDisplay.value = 'Usuario desconocido';
        }
    } else {
        userDisplay.value = 'Inicia sesión para continuar';
    }

    // C. INYECCIÓN DINÁMICA DE MENÚ SUPERIOR DE ACCIONES POR ROL
    if (dynamicNavButtons) {
        dynamicNavButtons.innerHTML = '';
        if (!userId) {
            // Visitante Anónimo
            const loginBtn = document.createElement('a');
            loginBtn.className = 'btn btn-light btn-sm fw-semibold text-primary px-3';
            loginBtn.href = pageBasePath + '/login';
            loginBtn.innerText = 'Iniciar Sesión';
            
            const registerBizBtn = document.createElement('a');
            registerBizBtn.className = 'btn btn-outline-light btn-sm fw-semibold px-3';
            registerBizBtn.href = pageBasePath + '/crear-negocio';
            registerBizBtn.innerText = 'Ofrecer mis servicios';
            
            dynamicNavButtons.appendChild(loginBtn);
            dynamicNavButtons.appendChild(registerBizBtn);
        } else {
            // Usuario con sesión iniciada
            if (userRole === 'owner') {
                const manageBizBtn = document.createElement('a');
                manageBizBtn.className = 'btn btn-light btn-sm fw-bold text-primary px-3 shadow-sm';
                manageBizBtn.href = pageBasePath + '/dashboard';
                manageBizBtn.innerText = 'Gestionar mis negocios';
                dynamicNavButtons.appendChild(manageBizBtn);
            } else if (userRole === 'administrator') {
                const adminBtn = document.createElement('a');
                adminBtn.className = 'btn btn-light btn-sm fw-bold text-danger px-3 shadow-sm';
                adminBtn.href = pageBasePath + '/dashboard';
                adminBtn.innerText = 'Panel de Control';
                dynamicNavButtons.appendChild(adminBtn);
            } else {
                const registerBizBtn = document.createElement('a');
                registerBizBtn.className = 'btn btn-outline-light btn-sm fw-semibold px-3';
                registerBizBtn.href = pageBasePath + '/crear-negocio';
                registerBizBtn.innerText = 'Registrar mi negocio';
                dynamicNavButtons.appendChild(registerBizBtn);
            }
            
            // Botón "Mis Turnos" de autogestión para cancelaciones
            const myApptsBtn = document.createElement('button');
            myApptsBtn.type = 'button';
            myApptsBtn.className = 'btn btn-outline-light btn-sm fw-semibold px-3 ms-2';
            myApptsBtn.innerText = 'Mis Turnos';
            myApptsBtn.addEventListener('click', () => {
                showMyAppointments();
            });
            dynamicNavButtons.appendChild(myApptsBtn);
            
            // Botón de Cierre de Sesión
            const logoutBtn = document.createElement('button');
            logoutBtn.type = 'button';
            logoutBtn.className = 'btn btn-outline-danger btn-sm fw-semibold text-white border-white px-3 ms-2';
            logoutBtn.innerText = 'Cerrar Sesión';
            logoutBtn.addEventListener('click', async () => {
                try {
                    await fetch(`${apiUrl}/logout`, { method: 'POST' });
                } catch (e) {
                    console.error('Error closing session on server', e);
                }
                localStorage.clear();
                alert('Sesión cerrada con éxito.');
                window.location.reload();
            });
            dynamicNavButtons.appendChild(logoutBtn);
        }
    }

    const refreshBusinesses = async () => {
        businesses = await fetchBusinesses();
        renderBusinessCards(filterBusinesses(businesses, businessSearch.value));
    };

    businessSearch.addEventListener('input', () => {
        const filtered = filterBusinesses(businesses, businessSearch.value);
        renderBusinessCards(filtered);
    });

    // Escuchar click en el botón de reservar de una tarjeta de negocio
    businessGrid.addEventListener('click', async (event) => {
        const btn = event.target.closest('.btn-select-business');
        if (!btn) return;
        const businessId = parseInt(btn.dataset.businessId, 10);
        const business = businesses.find(b => b.id === businessId);
        if (!business) return;
        if (!userId) {
            alert('Debes iniciar sesión para agendar un turno.');
            window.location.href = pageBasePath + '/login';
            return;
        }
        await prepareBooking(business);
        reserveSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // Escuchar click en el botón de eliminar negocio de una tarjeta
    businessGrid.addEventListener('click', async (event) => {
        const btn = event.target.closest('.btn-delete-business');
        if (!btn) return;

        event.stopPropagation();
        event.preventDefault();

        const businessId = btn.dataset.businessId;
        const businessName = btn.dataset.businessName || 'este negocio';

        const warningMsg = `¡CUIDADO! ¿Estás seguro de que deseas eliminar permanentemente el negocio "${businessName}"?\n\nEsta acción eliminará todos los turnos agendados, servicios y horarios del negocio, y es irreversible.`;
        
        if (!confirm(warningMsg)) {
            return;
        }

        btn.disabled = true;

        try {
            const res = await fetch(`${apiUrl}/businesses?id=${businessId}`, {
                method: 'DELETE'
            });
            const data = await res.json();

            if (res.ok) {
                alert('Negocio eliminado correctamente.');
                if (data.role) {
                    localStorage.setItem('userRole', data.role);
                }
                window.location.reload();
            } else {
                alert('No se pudo eliminar el negocio: ' + (data.message || 'Error desconocido'));
                btn.disabled = false;
            }
        } catch (error) {
            console.error('Error al intentar eliminar el negocio:', error);
            alert('Error de conexión. Por favor inténtalo de nuevo.');
            btn.disabled = false;
        }
    });

    // 6. CÁLCULO E INYECCIÓN DE INTERVALOS HORARIOS DISPONIBLES (SLOTS)
    // Lee la fecha y servicio, consulta al servidor y dibuja las franjas horarias como botones.
    async function refreshAvailableSlots() {
        const businessId = selectedBusinessId.value;
        const serviceId = selectService.value;
        const date = bookingDate.value;

        // Limpiar estados previos
        bookingTime.value = '';
        timeSlotsContainer.innerHTML = '';
        timeSlotsContainer.style.display = 'none';

        if (!businessId || !serviceId || !date) {
            return;
        }

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayLocal = `${year}-${month}-${day}`;

        if (date < todayLocal) {
            timeSlotsContainer.style.display = 'block';
            timeSlotsContainer.innerHTML = '<div class="alert alert-warning py-2 text-center small fw-semibold">No se pueden agendar turnos en el pasado.</div>';
            return;
        }

        timeSlotsContainer.style.display = 'block';
        timeSlotsContainer.innerHTML = '<div class="text-center py-3 text-muted"><div class="spinner-border spinner-border-sm me-2 text-primary" role="status"></div>Calculando horarios disponibles...</div>';

        try {
            // Consultamos la agenda existente de ese día a la API
            const res = await fetch(`${apiUrl}/agenda?business_id=${businessId}&date=${date}`);
            if (!res.ok) {
                timeSlotsContainer.innerHTML = '<div class="alert alert-danger py-2 text-center">Error al cargar la agenda del día.</div>';
                return;
            }

            const data = await res.json();

            // Si el negocio no tiene horarios declarados de atención ese día
            if (!data.schedules || !data.schedules.length) {
                timeSlotsContainer.innerHTML = '<div class="alert alert-warning py-2 text-center small fw-semibold">El negocio no abre el día seleccionado.</div>';
                return;
            }

            const service = selectService.services ? selectService.services.find(s => s.id === parseInt(serviceId, 10)) : null;
            const duration = service ? service.duration_minutes : 30;

            // Funciones helpers para operaciones temporales en minutos
            function timeToMinutes(timeStr) {
                const [h, m] = timeStr.split(':');
                return parseInt(h, 10) * 60 + parseInt(m, 10);
            }

            function minutesToTime(minutes) {
                const h = Math.floor(minutes / 60).toString().padStart(2, '0');
                const m = (minutes % 60).toString().padStart(2, '0');
                return `${h}:${m}`;
            }

            const slots = [];
            const addedSlots = new Set();
            const slotStep = 30; // Intervalo entre inicio de turnos (30 minutos)

            // Para cada jornada laboral de ese día de la semana
            for (const sched of data.schedules) {
                const startMin = timeToMinutes(sched.start_time);
                const endMin = timeToMinutes(sched.end_time);

                // Generamos franjas horarias
                for (let timeMin = startMin; timeMin + duration <= endMin; timeMin += slotStep) {
                    // Si es hoy, evitar franjas que ya pasaron
                    const currentMinutes = now.getHours() * 60 + now.getMinutes();
                    if (date === todayLocal && timeMin <= currentMinutes) {
                        continue;
                    }

                    const slotStartStr = minutesToTime(timeMin);

                    // Evitar duplicar horarios si hay configuraciones de horarios repetidas o solapadas
                    if (addedSlots.has(slotStartStr)) {
                        continue;
                    }

                    // VALIDACIÓN DE COLISIÓN O SOLAPAMIENTO: Comprobamos si cruza con alguna reserva previa activa
                    let isOccupied = false;
                    for (const appt of data.appointments || []) {
                        if (appt.status === 'cancelled') continue;

                        const apptStartMin = timeToMinutes(appt.time);
                        const apptDuration = appt.service ? appt.service.duration_minutes : 30;
                        const apptEndMin = apptStartMin + apptDuration;

                        // Condición de colisión temporal
                        if (timeMin < apptEndMin && (timeMin + duration) > apptStartMin) {
                            isOccupied = true;
                            break;
                        }
                    }

                    slots.push({
                        time: slotStartStr,
                        isOccupied
                    });
                    addedSlots.add(slotStartStr);
                }
            }

            timeSlotsContainer.innerHTML = '';

            if (slots.length === 0) {
                timeSlotsContainer.innerHTML = '<div class="alert alert-warning py-2 text-center">No hay horarios que cubran la duración del servicio hoy.</div>';
                return;
            }

            // Dibujar selector visual
            const label = document.createElement('label');
            label.className = 'form-label fw-semibold w-100 mb-2';
            label.innerText = 'Selecciona un horario disponible:';
            timeSlotsContainer.appendChild(label);

            const grid = document.createElement('div');
            grid.className = 'd-flex flex-wrap gap-2 justify-content-center my-2';

            slots.forEach(slot => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.dataset.time = slot.time;

                if (slot.isOccupied) {
                    btn.className = 'btn btn-light text-muted opacity-50 px-3 py-2 border-0';
                    btn.disabled = true; // Deshabilitado para que no haga clic
                    btn.style.textDecoration = 'line-through';
                    btn.title = 'Horario ocupado';
                } else {
                    btn.className = 'btn btn-outline-primary btn-sm px-3 py-2 btn-slot-picker';
                }
                btn.innerText = slot.time;
                grid.appendChild(btn);
            });

            timeSlotsContainer.appendChild(grid);

            // Escuchar la selección de una píldora de horario
            grid.addEventListener('click', (e) => {
                const clickedBtn = e.target.closest('.btn-slot-picker');
                if (!clickedBtn) return;

                grid.querySelectorAll('.btn-slot-picker').forEach(b => {
                    b.classList.remove('btn-primary', 'active');
                    b.classList.add('btn-outline-primary');
                });

                clickedBtn.classList.remove('btn-outline-primary');
                clickedBtn.classList.add('btn-primary', 'active');

                // Cargamos el horario al campo hidden del formulario para el submit
                bookingTime.value = clickedBtn.dataset.time;
            });

        } catch (error) {
            console.error('Error cargando disponibilidad de horarios:', error);
            timeSlotsContainer.innerHTML = '<div class="alert alert-danger py-2 text-center">Error al conectar con el servidor de agendas.</div>';
        }
    }

    bookingDate.addEventListener('change', refreshAvailableSlots);
    selectService.addEventListener('change', refreshAvailableSlots);

    // Preparar el formulario de reserva con los datos del negocio clicado
    async function prepareBooking(business) {
        reserveSection.style.display = 'block';
        selectedBusinessName.value = business.name;
        selectedBusinessId.value = business.id;
        selectedBusinessName.scrollIntoView({ behavior: 'smooth', block: 'start' });

        const services = await fetchServices(business.id);
        selectService.services = services; // Almacena para consultar duración al vuelo
        populateSelect(selectService, services, s => `${s.name} ($${s.price})`);
        if (!services.length) {
            selectService.innerHTML = '<option value="">No hay servicios disponibles</option>';
        }

        // Reset
        bookingDate.value = '';
        bookingTime.value = '';
        timeSlotsContainer.innerHTML = '';
        timeSlotsContainer.style.display = 'none';
    }

    // Registrar envío de reservas
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const body = Object.fromEntries(fd.entries());
        const uid = localStorage.getItem('userId');
        if (!uid) {
            alert('Debes iniciar sesión primero.');
            return;
        }
        body.user_id = uid;

        if (!body.business_id) {
            alert('Selecciona una empresa antes de reservar.');
            return;
        }

        if (!body.time) {
            alert('Por favor selecciona un horario disponible.');
            return;
        }

        const res = await fetch(`${apiUrl}/appointments`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        });
        const data = await res.json();
        if (res.ok) {
            alert('Turno reservado exitosamente: ' + (data.id || JSON.stringify(data)));
            form.reset();
            reserveSection.style.display = 'none';
            // Refrescar tarjetas de negocios para reflejar colisiones de inmediato
            refreshBusinesses();
        } else {
            alert('Error al reservar: ' + (data.message || JSON.stringify(data)));
        }
    });

    // 7. CARGAR Y RENDERIZAR HISTORIAL DE CITAS DE CLIENTE
    async function refreshMyAppointmentsList() {
        if (!userId) return;
        
        appointmentsList.innerHTML = '<div class="text-center py-4 text-muted w-100"><div class="spinner-border spinner-border-sm me-2 text-primary" role="status"></div>Cargando tus turnos...</div>';

        try {
            const res = await fetch(`${apiUrl}/appointments?user_id=${userId}`);
            if (!res.ok) {
                appointmentsList.innerHTML = '<div class="col-12"><div class="alert alert-danger text-center">Error al cargar tus turnos.</div></div>';
                return;
            }

            const appts = await res.json();
            appointmentsList.innerHTML = '';

            if (appts.length === 0) {
                appointmentsList.innerHTML = '<div class="col-12"><div class="alert alert-info text-center py-4">Aún no tienes ningún turno reservado.</div></div>';
                return;
            }

            appts.forEach(appt => {
                const card = document.createElement('div');
                card.className = 'col-sm-6 col-md-4';
                
                const bizName = appt.business ? appt.business.name : 'Negocio';
                const serviceName = appt.service ? appt.service.name : 'Servicio';
                const price = appt.service ? appt.service.price : '0.00';
                
                // Formatear Fecha
                const rawDate = appt.date ? appt.date.split('T')[0] : '';
                const dateParts = rawDate.split('-');
                const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : rawDate;
                const formattedTime = appt.time ? appt.time.substring(0, 5) : '';

                // Badge de Estado
                let badgeClass = 'bg-secondary';
                let statusLabel = 'Pendiente';
                if (appt.status === 'completed') { badgeClass = 'bg-success'; statusLabel = 'Completado'; }
                else if (appt.status === 'cancelled') { badgeClass = 'bg-danger'; statusLabel = 'Cancelado'; }

                // REGLA DE NEGOCIO: Determinar si es cancelable (falta más de 24 horas para el turno)
                let showCancelButton = false;
                if (appt.status === 'pending') {
                    const apptTime = new Date(`${rawDate}T${appt.time.substring(0,5)}`).getTime();
                    const now = Date.now();
                    const diffHours = (apptTime - now) / (1000 * 60 * 60);
                    // Solo habilitamos botón en UI si faltan 24h o más
                    if (diffHours >= 24) {
                        showCancelButton = true;
                    }
                }

                card.innerHTML = `
                    <div class="card shadow-sm h-100 border-start border-4 ${appt.status === 'pending' ? 'border-primary' : (appt.status === 'completed' ? 'border-success' : 'border-danger')}">
                        <div class="card-body p-3 d-flex flex-column">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <h6 class="fw-bold text-truncate mb-0 text-dark" style="max-width: 70%;">${bizName}</h6>
                                <span class="badge ${badgeClass}">${statusLabel}</span>
                            </div>
                            <p class="mb-1 small text-muted"><strong>Servicio:</strong> ${serviceName} ($${price})</p>
                            <p class="mb-2 small text-muted"><strong>Fecha:</strong> ${formattedDate} — <strong>Hora:</strong> ${formattedTime} hs</p>
                            ${showCancelButton ? `
                                <div class="mt-auto pt-2 border-top">
                                    <button class="btn btn-outline-danger btn-sm w-100 btn-cancel-appt" data-appt-id="${appt.id}">Cancelar Turno</button>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
                
                appointmentsList.appendChild(card);
            });

        } catch (error) {
            console.error('Error cargando turnos del cliente:', error);
            appointmentsList.innerHTML = '<div class="col-12"><div class="alert alert-danger text-center">Error de conexión al cargar turnos.</div></div>';
        }
    }

    // Toggle de visualización para ver historial de turnos
    function showMyAppointments() {
        businessGrid.style.display = 'none';
        reserveSection.style.display = 'none';
        myAppointmentsSection.style.display = 'block';
        myAppointmentsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        refreshMyAppointmentsList();
    }

    if (closeAppointmentsBtn) {
        closeAppointmentsBtn.addEventListener('click', () => {
            myAppointmentsSection.style.display = 'none';
            businessGrid.style.display = 'flex';
            businessGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    // 8. CONTROLADOR DE CANCELACIONES (API DELETE)
    if (appointmentsList) {
        appointmentsList.addEventListener('click', async (e) => {
            const btn = e.target.closest('.btn-cancel-appt');
            if (!btn) return;

            const apptId = btn.dataset.apptId;
            if (!confirm('¿Estás seguro de que deseas cancelar este turno? Esta acción liberará el horario de atención.')) {
                return;
            }

            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> Cancelando...';

            try {
                // Hacemos el llamado de borrado lógico al backend
                const res = await fetch(`${apiUrl}/appointments?id=${apptId}`, {
                    method: 'DELETE'
                });
                
                const data = await res.json();
                
                if (res.ok) {
                    alert('Turno cancelado exitosamente.');
                    refreshMyAppointmentsList(); // Refrescar lista de citas del cliente
                } else {
                    alert('No se pudo cancelar el turno: ' + (data.message || 'Error desconocido'));
                    btn.disabled = false;
                    btn.innerText = 'Cancelar Turno';
                }
            } catch (err) {
                console.error('Error de red al cancelar turno:', err);
                alert('Error de red. No se pudo cancelar el turno.');
                btn.disabled = false;
                btn.innerText = 'Cancelar Turno';
            }
        });
    }

    // 8.5. CONTROLADOR DE DETALLES DEL NEGOCIO (MODAL)
    const businessDetailsModal = document.getElementById('businessDetailsModal');
    const businessDetailsContent = document.getElementById('businessDetailsContent');

    if (businessGrid) {
        businessGrid.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-view-business');
            if (!btn) return;

            const bid = parseInt(btn.dataset.businessId, 10);
            const business = businesses.find(b => b.id === bid);
            if (!business) return;

            // Renderizar contenido dinámico en el modal
            const initials = (business.name || '').split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase();
            
            const logoHtml = business.logo_url 
                ? `<img src="${business.logo_url}" class="w-100 h-100 object-fit-cover rounded-circle shadow-sm p-1" style="max-width: 110px; max-height: 110px; aspect-ratio: 1;" alt="${business.name}" onerror="this.outerHTML='<div class=&quot;avatar fs-2&quot; style=&quot;width: 100px; height: 100px; border-radius: 12px; background: linear-gradient(135deg, #e6f5fc, #ffffff); color: #009ee3; display: flex; align-items: center; justify-content: center; font-weight: 800; border: 1px solid #cce9f8;&quot;>${initials}</div>'">`
                : `<div class="avatar fs-2 mx-auto" style="width: 100px; height: 100px; border-radius: 12px; background: linear-gradient(135deg, #e6f5fc, #ffffff); color: #009ee3; display: flex; align-items: center; justify-content: center; font-weight: 800; border: 1px solid #cce9f8;">${initials || 'TY'}</div>`;

            const addressHtml = business.address 
                ? `<p class="mb-3 fs-6 text-muted"><span class="me-1">📍</span><strong>Dirección:</strong> ${business.address}</p>`
                : `<p class="mb-3 fs-6 text-muted italic"><span class="me-1">📍</span><strong>Dirección:</strong> No especificada</p>`;

            // Mapear horarios
            const dayNames = {
                1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves',
                5: 'Viernes', 6: 'Sábado', 7: 'Domingo'
            };
            let schedulesHtml = "";
            if (business.work_schedules && business.work_schedules.length > 0) {
                const sorted = [...business.work_schedules].sort((a,b) => a.day_of_week - b.day_of_week);
                schedulesHtml = sorted.map(s => `
                    <div class="d-flex justify-content-between py-2 border-bottom border-light">
                        <span class="fw-semibold text-secondary">${dayNames[s.day_of_week]}</span>
                        <span class="text-dark fw-bold">${s.start_time.substring(0,5)} a ${s.end_time.substring(0,5)} hs</span>
                    </div>
                `).join('');
            } else {
                schedulesHtml = "<p class='text-muted small italic text-center py-2'>Este negocio no tiene horarios de atención configurados aún.</p>";
            }

            if (businessDetailsContent) {
                businessDetailsContent.innerHTML = `
                    <div class="text-center mb-4">
                        <div class="mb-3 d-flex justify-content-center">
                            ${logoHtml}
                        </div>
                        <h3 class="fw-bold text-dark mb-1">${business.name}</h3>
                        <p class="text-muted mb-3">${business.description || 'Sin descripción disponible.'}</p>
                        <div class="d-flex justify-content-center">
                            ${addressHtml}
                        </div>
                    </div>
                    
                    <div class="row g-4 mt-2">
                        <div class="col-md-6">
                            <div class="bg-light p-3 rounded-3 h-100 border border-light-subtle">
                                <h6 class="fw-bold text-dark border-bottom pb-2 mb-3">🕒 Horarios de Atención</h6>
                                <div class="px-1">
                                    ${schedulesHtml}
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="bg-light p-3 rounded-3 h-100 border border-light-subtle d-flex flex-column">
                                <h6 class="fw-bold text-dark border-bottom pb-2 mb-3">⭐ Reseñas de Clientes</h6>
                                <div class="my-auto text-center py-3">
                                    <div class="text-muted fs-4 mb-2" style="letter-spacing: 2px; opacity: 0.35;">
                                        ☆☆☆☆☆
                                    </div>
                                    <span class="badge bg-white text-primary border border-primary-subtle px-3 py-2 rounded-pill fw-semibold">Muy Pronto</span>
                                    <p class="text-muted small mt-3 mb-0 px-2">Estamos diseñando un sistema de valoraciones e historial de experiencias para este local.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mt-4 pt-3 border-top d-flex justify-content-end gap-2">
                        <button type="button" class="btn btn-light px-4" data-bs-dismiss="modal" style="border-radius:8px;">Cerrar</button>
                        <button type="button" class="btn btn-primary px-4 btn-select-business-modal" data-business-id="${business.id}" style="border-radius:8px;">Agendar Turno ahora</button>
                    </div>
                `;

                // Al hacer clic en "Agendar Turno ahora" desde el modal, abrimos la sección de reservas
                const modalBtn = businessDetailsContent.querySelector('.btn-select-business-modal');
                if (modalBtn) {
                    modalBtn.addEventListener('click', async () => {
                        // Cerrar modal
                        const bsModal = bootstrap.Modal.getInstance(businessDetailsModal);
                        if (bsModal) bsModal.hide();

                        if (!userId) {
                            alert('Debes iniciar sesión para agendar un turno.');
                            return;
                        }

                        await prepareBooking(business);
                        reserveSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    });
                }
            }

            // Abrir Modal
            if (businessDetailsModal) {
                const bsModal = new bootstrap.Modal(businessDetailsModal);
                bsModal.show();
            }
        });
    }
}

// 9. CONDICIÓN SEGURA DE INICIALIZACIÓN SÍNCRONA
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

function insertPendingCreatedBusiness(businesses) {
    try {
        const created = localStorage.getItem('pendingCreatedBusiness');
        if (!created) return null;
        const cb = JSON.parse(created);
        if (!cb || !cb.id) return null;
        if (!businesses.some(b => b.id === cb.id)) {
            businesses.unshift(cb);
        }
        localStorage.removeItem('pendingCreatedBusiness');
        return cb;
    } catch (e) {
        console.warn('Error procesando pendingCreatedBusiness', e);
        return null;
    }
}

function showCreationToast(business) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'shadow-sm rounded-3 p-3';
    toast.style.background = '#e6ffef';
    toast.style.border = '1px solid #c3f0d4';
    toast.style.minWidth = '260px';
    toast.style.boxSizing = 'border-box';
    toast.innerHTML = `
        <div style="font-weight:600; color:#0b5937;">Negocio creado</div>
        <div style="font-size:0.9rem; color:#084c3b;">${business.name}</div>
    `;
    container.appendChild(toast);
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-8px)';
    requestAnimationFrame(() => {
        toast.style.transition = 'opacity 220ms, transform 220ms';
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-8px)';
        setTimeout(() => { try { container.removeChild(toast); } catch (e) {} }, 240);
    }, 4200);
}
