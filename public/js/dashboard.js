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

// 1. CONTROL DE ACCESO
const userId = localStorage.getItem('userId');
const userRole = localStorage.getItem('userRole');

if (!userId || (userRole !== 'owner' && userRole !== 'administrator' && userRole !== 'staff')) {
    alert('Acceso denegado. Debes iniciar sesión como dueño, administrador o personal de negocio.');
    window.location.href = pageBasePath + '/login';
}

// 2. ESTADO GLOBAL DEL PANEL
let businesses = [];
let currentBusinessId = null;
let currentDate = new Date().toISOString().slice(0, 10);

// Coordenadas seleccionadas para los mapas en el Dashboard
let selectedFirstCoords = { latitude: null, longitude: null };
let selectedEditCoords = { latitude: null, longitude: null };
let selectedModalCoords = { latitude: null, longitude: null };
let activeMaps = {};

// Elementos del DOM
const welcomeUser = document.getElementById('welcomeUser');
const roleBadge = document.getElementById('roleBadge');
const logoutBtn = document.getElementById('logoutBtn');

const noBusinessesAlert = document.getElementById('noBusinessesAlert');
const activeDashboard = document.getElementById('activeDashboard');

const activeBusinessName = document.getElementById('activeBusinessName');
const businessTitleText = document.getElementById('businessTitleText');
const activeBusinessAddress = document.getElementById('activeBusinessAddress');

const globalBusinessSelectorContainer = document.getElementById('globalBusinessSelectorContainer');
const globalBusinessSelect = document.getElementById('globalBusinessSelect');

const metricTodayAppts = document.getElementById('metricTodayAppts');
const metricActiveServices = document.getElementById('metricActiveServices');
const metricRating = document.getElementById('metricRating');

const agendaDateInput = document.getElementById('agendaDateInput');
const btnPrevDay = document.getElementById('btnPrevDay');
const btnNextDay = document.getElementById('btnNextDay');
const agendaResult = document.getElementById('agendaResult');

const serviceForm = document.getElementById('serviceForm');
const servicesListTable = document.getElementById('servicesListTable');

const scheduleForm = document.getElementById('scheduleForm');
const schedulesListTable = document.getElementById('schedulesListTable');

const editBusinessForm = document.getElementById('editBusinessForm');
const registerBusinessForm = document.getElementById('registerBusinessForm');
const firstBusinessForm = document.getElementById('firstBusinessForm');

// Mapeo de días de la semana
const dayNames = {
    1: 'Lunes',
    2: 'Martes',
    3: 'Miércoles',
    4: 'Jueves',
    5: 'Viernes',
    6: 'Sábado',
    7: 'Domingo'
};

// 3. CARGA DE NEGOCIOS DE LA API
async function loadBusinessesFromServer() {
    let url = `${apiUrl}/businesses`;
    if (userRole === 'owner' || userRole === 'staff') {
        url += `?owner_id=${userId}`;
    }
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Error al consultar negocios');
        businesses = await res.json();
        return businesses;
    } catch (e) {
        console.error('Error loading businesses:', e);
        return [];
    }
}

// 4. INICIALIZADOR PRINCIPAL
async function initDashboard() {
    // A. Mostrar datos de usuario y rol en el banner
    if (welcomeUser) {
        const userName = localStorage.getItem('userName') || 'Usuario';
        welcomeUser.innerText = `¡Hola, ${userName}!`;
    }
    if (roleBadge) {
        let roleText = 'Usuario';
        let badgeClass = 'badge bg-secondary mt-1 fs-6 px-3 py-2';
        if (userRole === 'owner') {
            roleText = 'Dueño de Negocio';
            badgeClass = 'badge bg-success mt-1 fs-6 px-3 py-2';
        } else if (userRole === 'administrator') {
            roleText = 'Administrador del Sistema';
            badgeClass = 'badge bg-dark mt-1 fs-6 px-3 py-2';
            
            // Agregar un botón "Ir al Panel Global (SuperAdmin)" al lado de Cerrar Sesión
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn && !document.getElementById('btnGoGlobalPanel')) {
                const btnGoGlobal = document.createElement('a');
                btnGoGlobal.id = 'btnGoGlobalPanel';
                btnGoGlobal.href = pageBasePath + '/sistema';
                btnGoGlobal.className = 'btn btn-primary btn-sm fw-semibold px-4 py-2 me-2';
                btnGoGlobal.style.borderRadius = '8px';
                btnGoGlobal.innerText = 'Panel Global (SuperAdmin)';
                logoutBtn.parentNode.insertBefore(btnGoGlobal, logoutBtn);
            }
        } else if (userRole === 'staff') {
            roleText = 'Personal de Negocio (Staff)';
            badgeClass = 'badge bg-info mt-1 fs-6 px-3 py-2';
        }
        roleBadge.innerText = roleText;
        roleBadge.className = badgeClass;
    }

    // Ocultar controles de dueño si es staff
    if (userRole === 'staff') {
        const staffTabBtn = document.getElementById('staff-tab');
        if (staffTabBtn) staffTabBtn.style.display = 'none';
        
        // Deshabilitar campos de configuración del negocio
        if (editBusinessForm) {
            const inputs = editBusinessForm.querySelectorAll('input, textarea, button[type="submit"]');
            inputs.forEach(input => {
                input.disabled = true;
            });
        }
        
        // Ocultar botón de registrar otra sucursal
        const addBranchBtn = document.querySelector('button[data-bs-target="#registerBusinessModal"]');
        if (addBranchBtn) addBranchBtn.style.display = 'none';
        
        // Ocultar "Zona de Peligro"
        const dangerZoneCard = document.querySelector('.card[style*="border-left: 4px solid #d93838"]');
        if (dangerZoneCard) dangerZoneCard.style.display = 'none';
    }

    // B. Inicializar autocompletados con mapa
    setupAutocompleteMap({
        inputId: 'firstBusinessAddress',
        suggestionsId: 'firstAddressSuggestions',
        containerId: 'firstMapContainer',
        mapId: 'firstMap',
        onCoordsChange: (lat, lon) => {
            selectedFirstCoords.latitude = lat;
            selectedFirstCoords.longitude = lon;
        }
    });

    setupAutocompleteMap({
        inputId: 'editBusinessAddress',
        suggestionsId: 'editAddressSuggestions',
        containerId: 'editMapContainer',
        mapId: 'editMap',
        onCoordsChange: (lat, lon) => {
            selectedEditCoords.latitude = lat;
            selectedEditCoords.longitude = lon;
        }
    });

    setupAutocompleteMap({
        inputId: 'modalBusinessAddress',
        suggestionsId: 'modalAddressSuggestions',
        containerId: 'modalMapContainer',
        mapId: 'modalMap',
        onCoordsChange: (lat, lon) => {
            selectedModalCoords.latitude = lat;
            selectedModalCoords.longitude = lon;
        }
    });

    // C. Cargar negocios
    await refreshBusinessesList();

    // D. Vincular Cierre de Sesión
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await fetch(`${apiUrl}/logout`, { method: 'POST' });
            } catch (e) {
                console.error('Error closing session on server:', e);
            }
            localStorage.clear();
            alert('Sesión cerrada correctamente.');
            window.location.href = pageBasePath + '/pagina-inicio';
        });
    }

    // E. Vincular Navegador de Agenda por Fechas
    if (agendaDateInput) {
        agendaDateInput.value = currentDate;
        agendaDateInput.addEventListener('change', (e) => {
            currentDate = e.target.value;
            loadAgenda();
        });
    }
    if (btnPrevDay) {
        btnPrevDay.addEventListener('click', () => changeDate(-1));
    }
    if (btnNextDay) {
        btnNextDay.addEventListener('click', () => changeDate(1));
    }

    // F. Vincular Envío de Formularios
    setupFormSubmits();
}

// 5. NAVEGAR ENTRE FECHAS
function changeDate(daysOffset) {
    const dateObj = new Date(currentDate + 'T00:00:00');
    dateObj.setDate(dateObj.getDate() + daysOffset);
    currentDate = dateObj.toISOString().slice(0, 10);
    if (agendaDateInput) {
        agendaDateInput.value = currentDate;
    }
    loadAgenda();
}

// 6. ACTUALIZAR LISTADO Y MOSTRAR VISTA CORRECTA
async function refreshBusinessesList() {
    await loadBusinessesFromServer();

    if (businesses.length === 0) {
        // No tiene negocios: Mostrar primer registro
        if (noBusinessesAlert) noBusinessesAlert.style.display = 'block';
        if (activeDashboard) activeDashboard.style.display = 'none';
        currentBusinessId = null;
    } else {
        // Tiene negocios: Mostrar dashboard y cargar el activo
        if (noBusinessesAlert) noBusinessesAlert.style.display = 'none';
        if (activeDashboard) activeDashboard.style.display = 'block';

        // Configurar selector global
        populateGlobalSelector();

        // Elegir negocio a mostrar (el primero por defecto si no hay ninguno seleccionado)
        if (!currentBusinessId || !businesses.some(b => b.id == currentBusinessId)) {
            currentBusinessId = businesses[0].id;
        }

        if (globalBusinessSelect) {
            globalBusinessSelect.value = currentBusinessId;
        }

        switchBusiness(currentBusinessId);
    }
}

// 7. POBLAR SELECTOR GLOBAL
function populateGlobalSelector() {
    if (!globalBusinessSelect) return;
    globalBusinessSelect.innerHTML = '';

    if (businesses.length > 1) {
        if (globalBusinessSelectorContainer) globalBusinessSelectorContainer.style.display = 'block';
        for (const b of businesses) {
            const opt = document.createElement('option');
            opt.value = b.id;
            opt.text = b.name;
            globalBusinessSelect.appendChild(opt);
        }
    } else {
        if (globalBusinessSelectorContainer) globalBusinessSelectorContainer.style.display = 'none';
    }
}

// Vincular selector global
if (globalBusinessSelect) {
    globalBusinessSelect.addEventListener('change', (e) => {
        switchBusiness(parseInt(e.target.value, 10));
    });
}

// 8. CAMBIAR DE NEGOCIO ACTIVO
function switchBusiness(businessId) {
    currentBusinessId = businessId;
    const biz = businesses.find(b => b.id == businessId);
    if (!biz) return;

    // Actualizar títulos
    if (businessTitleText) businessTitleText.innerText = biz.name;
    if (activeBusinessAddress) {
        activeBusinessAddress.innerHTML = biz.address ? `<i class="bi bi-geo-alt me-1"></i> ${biz.address}` : '<i class="bi bi-geo-alt me-1"></i> Dirección comercial no especificada';
    }

    // Llenar formulario de edición
    const editBusinessId = document.getElementById('editBusinessId');
    const editName = document.getElementById('editBusinessName');
    const editDesc = document.getElementById('editBusinessDescription');
    const editAddr = document.getElementById('editBusinessAddress');
    const editLogo = document.getElementById('editBusinessLogoUrl');

    if (editBusinessId) editBusinessId.value = biz.id;
    if (editName) editName.value = biz.name || '';
    if (editDesc) editDesc.value = biz.description || '';
    if (editAddr) editAddr.value = biz.address || '';
    if (editLogo) {
        editLogo.value = biz.logo_url || '';
        updateLogoPreview(biz.logo_url, biz.name);
    }

    // Cargar mapa de edición si el negocio tiene coordenadas
    const editMapContainer = document.getElementById('editMapContainer');
    if (biz.latitude && biz.longitude) {
        selectedEditCoords = { latitude: parseFloat(biz.latitude), longitude: parseFloat(biz.longitude) };
        showMapOnContainer(editMapContainer, 'editMap', selectedEditCoords.latitude, selectedEditCoords.longitude, (lat, lon) => {
            selectedEditCoords.latitude = lat;
            selectedEditCoords.longitude = lon;
        });
    } else {
        selectedEditCoords = { latitude: null, longitude: null };
        if (editMapContainer) editMapContainer.classList.add('d-none');
    }

    // Actualizar métricas fijas
    if (metricActiveServices) {
        metricActiveServices.innerText = biz.services ? biz.services.length : 0;
    }
    if (metricRating) {
        metricRating.innerText = biz.reviews_avg_rating ? parseFloat(biz.reviews_avg_rating).toFixed(1) + ' / 5' : 'N/A';
    }

    // Renderizar tablas locales
    renderServicesTable(biz.services || []);
    renderSchedulesTable(biz.work_schedules || []);
    loadStaff();

    // Cargar agenda del día
    loadAgenda();
}

// Helper para actualizar la previsualización del logo
function updateLogoPreview(url, name) {
    const logoPreviewImg = document.getElementById('logoPreviewImg');
    const logoPreviewPlaceholder = document.getElementById('logoPreviewPlaceholder');
    if (!logoPreviewImg || !logoPreviewPlaceholder) return;
    const initials = (name || '').split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase();
    if (url && url.trim() !== '') {
        logoPreviewImg.src = url;
        logoPreviewImg.alt = name || 'Logo';
        logoPreviewImg.style.display = 'block';
        logoPreviewPlaceholder.style.display = 'none';
    } else {
        logoPreviewImg.style.display = 'none';
        logoPreviewPlaceholder.innerText = initials || 'TY';
        logoPreviewPlaceholder.style.display = 'flex';
    }
}

// Helper para configurar autocompletado y mapa interactivo
function setupAutocompleteMap(config) {
    const input = document.getElementById(config.inputId);
    const suggestions = document.getElementById(config.suggestionsId);
    const container = document.getElementById(config.containerId);
    const mapId = config.mapId;

    if (!input || !suggestions) return;

    let debounceTimer;
    input.addEventListener('input', function() {
        const query = input.value.trim();
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            if (query.length < 3) {
                suggestions.innerHTML = '';
                suggestions.classList.add('d-none');
                return;
            }
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`);
                if (!res.ok) return;
                const data = await res.json();
                suggestions.innerHTML = '';
                if (data && data.length > 0) {
                    suggestions.classList.remove('d-none');
                    data.forEach(item => {
                        const btn = document.createElement('button');
                        btn.type = 'button';
                        btn.className = 'list-group-item list-group-item-action py-2 small';
                        btn.style.cursor = 'pointer';
                        btn.style.textAlign = 'left';
                        btn.textContent = item.display_name;
                        btn.addEventListener('click', () => {
                            input.value = item.display_name;
                            suggestions.innerHTML = '';
                            suggestions.classList.add('d-none');
                            
                            const lat = parseFloat(item.lat);
                            const lon = parseFloat(item.lon);
                            
                            config.onCoordsChange(lat, lon);
                            showMapOnContainer(container, mapId, lat, lon, config.onCoordsChange);
                        });
                        suggestions.appendChild(btn);
                    });
                } else {
                    suggestions.classList.add('d-none');
                }
            } catch (e) {
                console.warn('Autocomplete fetch failed', e);
            }
        }, 400);
    });

    // Cerrar sugerencias si hace clic fuera
    document.addEventListener('click', function(e) {
        if (e.target !== input && e.target !== suggestions) {
            suggestions.innerHTML = '';
            suggestions.classList.add('d-none');
        }
    });
}

function showMapOnContainer(container, mapId, lat, lon, onCoordsChange) {
    if (!container || typeof L === 'undefined') return;
    container.classList.remove('d-none');

    let map = activeMaps[mapId];
    if (map) {
        map.setView([lat, lon], 15);
        if (map._marker) {
            map._marker.setLatLng([lat, lon]);
        } else {
            const marker = L.marker([lat, lon], { draggable: true }).addTo(map);
            map._marker = marker;
            marker.on('dragend', function(e) {
                const newLatLng = e.target.getLatLng();
                onCoordsChange(newLatLng.lat, newLatLng.lng);
            });
        }
    } else {
        map = L.map(mapId).setView([lat, lon], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        const marker = L.marker([lat, lon], { draggable: true }).addTo(map);
        map._marker = marker;
        marker.on('dragend', function(e) {
            const newLatLng = e.target.getLatLng();
            onCoordsChange(newLatLng.lat, newLatLng.lng);
        });

        activeMaps[mapId] = map;
    }

    setTimeout(() => { map.invalidateSize(); }, 200);
}

// 9. RENDERIZAR TABLA DE SERVICIOS
function renderServicesTable(services) {
    if (!servicesListTable) return;
    servicesListTable.innerHTML = '';

    if (services.length === 0) {
        servicesListTable.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted py-4">No hay servicios registrados para este negocio.</td>
            </tr>
        `;
        return;
    }

    for (const s of services) {
        const tr = document.createElement('tr');
        
        let statusBadge = '';
        if (s.status === 'approved') {
            statusBadge = '<span class="badge bg-success">Aprobado</span>';
        } else if (s.status === 'rejected') {
            statusBadge = '<span class="badge bg-danger">Rechazado</span>';
        } else {
            statusBadge = '<span class="badge bg-warning text-dark border border-warning-subtle">Pendiente</span>';
        }

        tr.innerHTML = `
            <td>
                <div class="fw-bold text-dark">${s.name}</div>
                <small class="text-muted">${s.description || 'Sin descripción'}</small>
            </td>
            <td>${s.duration_minutes} min</td>
            <td class="fw-bold text-primary">$${parseFloat(s.price).toFixed(2)}</td>
            <td class="text-center">${statusBadge}</td>
            <td class="text-center">
                <button class="btn btn-outline-danger btn-sm btn-action-sm btn-delete-service" data-id="${s.id}">
                    Eliminar
                </button>
            </td>
        `;
        servicesListTable.appendChild(tr);
    }

    // Vincular botones de eliminar servicio
    servicesListTable.querySelectorAll('.btn-delete-service').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const serviceId = e.target.dataset.id;
            if (confirm('¿Estás seguro de que deseas eliminar este servicio permanentemente?')) {
                try {
                    const res = await fetch(`${apiUrl}/services?id=${serviceId}`, { method: 'DELETE' });
                    const result = await res.json();
                    if (res.ok) {
                        alert('Servicio eliminado correctamente.');
                        await refreshBusinessesList();
                    } else {
                        alert('Error: ' + result.message);
                    }
                } catch (error) {
                    alert('Error de conexión con el servidor.');
                }
            }
        });
    });
}

// 9.5 GESTIÓN DE PERSONAL (STAFF)
async function loadStaff() {
    if (!currentBusinessId) return;
    const staffListTable = document.getElementById('staffListTable');
    if (!staffListTable) return;
    
    // Si el rol es staff, ocultamos la pestaña y salimos
    if (userRole === 'staff') {
        const staffTab = document.getElementById('staff-tab');
        if (staffTab) staffTab.style.display = 'none';
        return;
    }

    try {
        const res = await fetch(`${apiUrl}/staff?business_id=${currentBusinessId}`);
        if (!res.ok) throw new Error('Error al cargar personal');
        const staff = await res.json();
        renderStaffTable(staff);
    } catch (e) {
        console.error('Error loading staff:', e);
        staffListTable.innerHTML = `<tr><td colspan="4" class="text-center text-danger py-4">Error al cargar personal del servidor.</td></tr>`;
    }
}

function renderStaffTable(staff) {
    const staffListTable = document.getElementById('staffListTable');
    if (!staffListTable) return;
    staffListTable.innerHTML = '';

    if (staff.length === 0) {
        staffListTable.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted py-4">No hay personal registrado en este negocio.</td>
            </tr>
        `;
        return;
    }

    for (const s of staff) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${s.id}</td>
            <td class="fw-bold text-dark">${s.name}</td>
            <td>${s.email}</td>
            <td class="text-center">
                <button class="btn btn-outline-danger btn-sm btn-action-sm btn-delete-staff" data-id="${s.id}">
                    Revocar
                </button>
            </td>
        `;
        staffListTable.appendChild(tr);
    }

    // Vincular botones de eliminar staff
    staffListTable.querySelectorAll('.btn-delete-staff').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const staffUserId = e.target.dataset.id;
            if (confirm('¿Estás seguro de que deseas revocar el acceso a este miembro del personal?')) {
                try {
                    const res = await fetch(`${apiUrl}/staff?business_id=${currentBusinessId}&user_id=${staffUserId}`, { method: 'DELETE' });
                    const result = await res.json();
                    if (res.ok) {
                        alert('Acceso revocado correctamente.');
                        await loadStaff();
                    } else {
                        alert('Error: ' + result.message);
                    }
                } catch (error) {
                    alert('Error de conexión con el servidor.');
                }
            }
        });
    });
}

// 10. RENDERIZAR TABLA DE HORARIOS
function renderSchedulesTable(schedules) {
    if (!schedulesListTable) return;
    schedulesListTable.innerHTML = '';

    if (schedules.length === 0) {
        schedulesListTable.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted py-4">No hay horarios definidos para este negocio.</td>
            </tr>
        `;
        return;
    }

    // Ordenar por día de la semana
    const sorted = [...schedules].sort((a,b) => a.day_of_week - b.day_of_week);

    for (const s of sorted) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="fw-bold text-dark">${dayNames[s.day_of_week] || 'Desconocido'}</td>
            <td>${s.start_time.substring(0,5)} hs</td>
            <td>${s.end_time.substring(0,5)} hs</td>
            <td class="text-center">
                <button class="btn btn-outline-danger btn-sm btn-action-sm btn-delete-schedule" data-id="${s.id}">
                    Eliminar
                </button>
            </td>
        `;
        schedulesListTable.appendChild(tr);
    }

    // Vincular botones de eliminar horario
    schedulesListTable.querySelectorAll('.btn-delete-schedule').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const scheduleId = e.target.dataset.id;
            if (confirm('¿Estás seguro de que deseas eliminar este horario de atención?')) {
                try {
                    const res = await fetch(`${apiUrl}/schedule?id=${scheduleId}`, { method: 'DELETE' });
                    const result = await res.json();
                    if (res.ok) {
                        alert('Horario de atención eliminado correctamente.');
                        await refreshBusinessesList();
                    } else {
                        alert('Error: ' + result.message);
                    }
                } catch (error) {
                    alert('Error de conexión con el servidor.');
                }
            }
        });
    });
}

// 11. CARGAR AGENDA Y ACTUALIZAR TIMELINE
async function loadAgenda() {
    if (!currentBusinessId || !agendaResult) return;

    try {
        const res = await fetch(`${apiUrl}/agenda?business_id=${currentBusinessId}&date=${currentDate}`);
        if (!res.ok) throw new Error('Error al cargar la agenda');
        const data = await res.json();

        // Actualizar métrica rápida de hoy (solo si la fecha consultada es la de hoy)
        const todayStr = new Date().toISOString().slice(0, 10);
        if (currentDate === todayStr && metricTodayAppts) {
            metricTodayAppts.innerText = data.appointments.length;
        }

        renderTimeline(data.appointments || []);
    } catch (e) {
        console.error('Error loading agenda:', e);
        agendaResult.innerHTML = '<p class="text-danger text-center py-4">Error al cargar turnos del servidor.</p>';
    }
}

// 12. RENDERIZAR LÍNEA DE TIEMPO (TIMELINE)
function renderTimeline(appointments) {
    agendaResult.innerHTML = '';

    if (appointments.length === 0) {
        agendaResult.innerHTML = `
            <div class="text-center py-5">
                <div class="fs-1 text-muted mb-2"><i class="bi bi-calendar-x"></i></div>
                <p class="text-muted small">No hay turnos agendados para esta fecha.</p>
            </div>
        `;
        return;
    }

    // Ordenar turnos por hora
    const sorted = [...appointments].sort((a,b) => a.time.localeCompare(b.time));

    const timelineContainer = document.createElement('div');
    timelineContainer.className = 'timeline-container';

    for (const a of sorted) {
        const item = document.createElement('div');
        let statusClass = '';
        let badgeClass = 'bg-secondary';
        let statusLabel = 'Pendiente';

        if (a.status === 'completed') {
            statusClass = 'completed';
            badgeClass = 'bg-success';
            statusLabel = 'Completado';
        } else if (a.status === 'cancelled') {
            statusClass = 'cancelled';
            badgeClass = 'bg-danger';
            statusLabel = 'Cancelado';
        }

        item.className = `timeline-item ${statusClass}`;

        let actionButtons = '';
        if (a.status === 'pending') {
            actionButtons = `
                <div class="d-flex gap-2 mt-3 pt-2 border-top">
                    <button class="btn btn-primary btn-sm btn-action-sm btn-complete-appointment" data-id="${a.id}">✓ Completar</button>
                    <button class="btn btn-outline-danger btn-sm btn-action-sm btn-cancel-appointment" data-id="${a.id}">✕ Cancelar</button>
                </div>
            `;
        }

        const duration = a.service ? a.service.duration_minutes : 30;
        const price = a.service ? parseFloat(a.service.price).toFixed(2) : '0.00';

        item.innerHTML = `
            <div class="timeline-time">${a.time.substring(0, 5)} hs</div>
            <div class="timeline-card">
                <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
                    <div>
                        <h6 class="fw-bold mb-1 text-dark">${a.service ? a.service.name : 'Servicio general'}</h6>
                        <small class="text-muted d-block">Duración: ${duration} minutos | Valor: $${price}</small>
                        <small class="text-muted d-block mt-1"><i class="bi bi-person me-1"></i> Cliente: <strong>${a.user ? a.user.name : 'Desconocido'}</strong> (${a.user ? a.user.email : '-'})</small>
                    </div>
                    <span class="badge ${badgeClass} text-uppercase px-3 py-1 rounded-pill" style="font-size:0.75rem;">${statusLabel}</span>
                </div>
                ${actionButtons}
            </div>
        `;
        timelineContainer.appendChild(item);
    }

    agendaResult.appendChild(timelineContainer);

    // Vincular botones de Completar y Cancelar Turno
    agendaResult.querySelectorAll('.btn-complete-appointment').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const apptId = e.target.dataset.id;
            try {
                const res = await fetch(`${apiUrl}/appointments`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: apptId, status: 'completed' })
                });
                if (res.ok) {
                    await loadAgenda();
                } else {
                    const result = await res.json();
                    alert('Error: ' + result.message);
                }
            } catch (error) {
                alert('Error de conexión al completar el turno.');
            }
        });
    });

    agendaResult.querySelectorAll('.btn-cancel-appointment').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const apptId = e.target.dataset.id;
            if (confirm('¿Estás seguro de que deseas cancelar esta reserva?')) {
                try {
                    const res = await fetch(`${apiUrl}/appointments?id=${apptId}`, { method: 'DELETE' });
                    if (res.ok) {
                        await loadAgenda();
                    } else {
                        const result = await res.json();
                        alert('Error: ' + result.message);
                    }
                } catch (error) {
                    alert('Error de conexión al cancelar el turno.');
                }
            }
        });
    });
}

// 13. CONFIGURAR EL ENVÍO DE FORMULARIOS
function setupFormSubmits() {
    // Formulario: Invitar Personal (Staff)
    const inviteStaffForm = document.getElementById('inviteStaffForm');
    if (inviteStaffForm) {
        inviteStaffForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = inviteStaffForm.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.disabled = true;

            const formData = new FormData(inviteStaffForm);
            const payload = {
                business_id: currentBusinessId,
                email: formData.get('staffEmail')
            };

            try {
                const res = await fetch(`${apiUrl}/staff`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const result = await res.json();
                if (res.ok) {
                    alert('Personal agregado con éxito.');
                    inviteStaffForm.reset();
                    await loadStaff();
                } else {
                    alert('Error: ' + result.message);
                }
            } catch (error) {
                alert('Error de conexión.');
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }

    // A. Formulario: Guardar Servicio
    if (serviceForm) {
        serviceForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = serviceForm.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.disabled = true;

            const formData = new FormData(serviceForm);
            const payload = {
                business_id: currentBusinessId,
                name: formData.get('serviceName'),
                description: formData.get('serviceDescription'),
                duration_minutes: parseInt(formData.get('serviceDuration'), 10),
                price: parseFloat(formData.get('servicePrice'))
            };

            try {
                const res = await fetch(`${apiUrl}/services`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const result = await res.json();
                if (res.ok) {
                    alert('Servicio registrado con éxito.');
                    serviceForm.reset();
                    await refreshBusinessesList();
                } else {
                    alert('Error: ' + result.message);
                }
            } catch (error) {
                alert('Error de conexión.');
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }

    // B. Formulario: Guardar Horario
    if (scheduleForm) {
        scheduleForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = scheduleForm.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.disabled = true;

            const formData = new FormData(scheduleForm);
            const payload = {
                business_id: currentBusinessId,
                day_of_week: parseInt(formData.get('scheduleDay'), 10),
                start_time: formData.get('scheduleStart'),
                end_time: formData.get('scheduleEnd')
            };

            try {
                const res = await fetch(`${apiUrl}/schedule`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const result = await res.json();
                if (res.ok) {
                    alert('Horario de atención configurado con éxito.');
                    await refreshBusinessesList();
                } else {
                    alert('Error: ' + result.message);
                }
            } catch (error) {
                alert('Error de conexión.');
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }

    // C. Formulario: Actualizar Negocio (Settings)
    if (editBusinessForm) {
        editBusinessForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = editBusinessForm.querySelector('button[type="submit"]');
            const originalText = submitBtn ? submitBtn.textContent : 'Guardar cambios';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Validando dirección...';
            }

            const addressVal = document.getElementById('editBusinessAddress').value.trim();
            
            // Validar dirección si fue ingresada
            let coords = { latitude: selectedEditCoords.latitude, longitude: selectedEditCoords.longitude };
            if (addressVal !== '' && (coords.latitude === null || coords.longitude === null)) {
                coords = await geocodeAddress(addressVal);
                if (coords.latitude === null || coords.longitude === null) {
                    alert('La dirección ingresada no existe o no se pudo validar. Por favor, asegúrate de incluir calle, número y ciudad válidos (ej: Av. Pellegrini 1500, Rosario).');
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalText;
                    }
                    return;
                }
                selectedEditCoords.latitude = coords.latitude;
                selectedEditCoords.longitude = coords.longitude;
            }

            const payload = {
                id: currentBusinessId,
                name: document.getElementById('editBusinessName').value.trim(),
                description: document.getElementById('editBusinessDescription').value.trim(),
                address: addressVal,
                logo_url: document.getElementById('editBusinessLogoUrl').value.trim(),
                owner_id: parseInt(userId, 10),
                latitude: selectedEditCoords.latitude,
                longitude: selectedEditCoords.longitude
            };

            try {
                const res = await fetch(`${apiUrl}/businesses`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const result = await res.json();
                if (res.ok) {
                    alert('Negocio actualizado correctamente.');
                    await refreshBusinessesList();
                } else {
                    alert('Error: ' + result.message);
                }
            } catch (error) {
                alert('Error de conexión.');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            }
        });
    }

    // D. Formulario: Registrar nuevo negocio (Settings)
    if (registerBusinessForm) {
        registerBusinessForm.addEventListener('submit', (e) => handleRegisterBusiness(e, registerBusinessForm));
    }

    // E. Formulario: Registrar primer negocio (Alert)
    if (firstBusinessForm) {
        firstBusinessForm.addEventListener('submit', (e) => handleRegisterBusiness(e, firstBusinessForm));
    }

    // F. Previsualización dinámica del logo en edición
    const editLogoInput = document.getElementById('editBusinessLogoUrl');
    if (editLogoInput) {
        editLogoInput.addEventListener('input', (e) => {
            const name = document.getElementById('editBusinessName').value.trim();
            updateLogoPreview(e.target.value, name);
        });

        const logoPreviewImg = document.getElementById('logoPreviewImg');
        if (logoPreviewImg) {
            logoPreviewImg.addEventListener('error', () => {
                logoPreviewImg.style.display = 'none';
                const logoPreviewPlaceholder = document.getElementById('logoPreviewPlaceholder');
                if (logoPreviewPlaceholder) logoPreviewPlaceholder.style.display = 'flex';
            });
        }
    }

    // G. Zona de Peligro: Eliminar Negocio
    const btnDeleteBusinessDashboard = document.getElementById('btnDeleteBusinessDashboard');
    if (btnDeleteBusinessDashboard) {
        btnDeleteBusinessDashboard.addEventListener('click', async () => {
            if (userRole === 'staff') {
                alert('Acceso denegado. Solo el dueño del negocio puede eliminarlo.');
                return;
            }
            const biz = businesses.find(b => b.id == currentBusinessId);
            if (!biz) return;

            const warningMsg = `¡CUIDADO! ¿Estás seguro de que deseas eliminar permanentemente el negocio "${biz.name}"?\n\nEsta acción eliminará todos los turnos agendados, servicios y horarios del negocio, y es irreversible.`;
            
            if (!confirm(warningMsg)) return;

            btnDeleteBusinessDashboard.disabled = true;

            try {
                const res = await fetch(`${apiUrl}/businesses?id=${currentBusinessId}`, {
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
                    btnDeleteBusinessDashboard.disabled = false;
                }
            } catch (error) {
                console.error('Error al intentar eliminar el negocio:', error);
                alert('Error de conexión. Por favor inténtalo de nuevo.');
                btnDeleteBusinessDashboard.disabled = false;
            }
        });
    }
}

// Helper de geocodificación mediante Nominatim
async function geocodeAddress(address) {
    if (!address) return { latitude: null, longitude: null };
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`);
        if (res.ok) {
            const data = await res.json();
            if (data && data.length > 0) {
                return {
                    latitude: parseFloat(data[0].lat),
                    longitude: parseFloat(data[0].lon)
                };
            }
        }
    } catch (e) {
        console.warn('Nominatim geocoding failed', e);
    }
    return { latitude: null, longitude: null };
}

// 14. PROCESAR CREACIÓN DE NEGOCIO
async function handleRegisterBusiness(e, formElement) {
    e.preventDefault();
    const submitBtn = formElement.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.textContent : 'Registrar Negocio';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Validando dirección...';
    }

    const formData = new FormData(formElement);
    const addressVal = formData.get('businessAddress') ? formData.get('businessAddress').trim() : '';
    
    let selectedCoords = formElement.id === 'firstBusinessForm' ? selectedFirstCoords : selectedModalCoords;

    // Validar dirección si fue ingresada
    let coords = { latitude: selectedCoords.latitude, longitude: selectedCoords.longitude };
    if (addressVal !== '' && (coords.latitude === null || coords.longitude === null)) {
        coords = await geocodeAddress(addressVal);
        if (coords.latitude === null || coords.longitude === null) {
            alert('La dirección ingresada no existe o no se pudo validar. Por favor, asegúrate de incluir calle, número y ciudad válidos (ej: Av. Pellegrini 1500, Rosario).');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
            return;
        }
        selectedCoords.latitude = coords.latitude;
        selectedCoords.longitude = coords.longitude;
    }

    const payload = {
        name: formData.get('businessName'),
        description: formData.get('businessDescription'),
        address: addressVal,
        logo_url: formData.get('businessLogoUrl'),
        latitude: selectedCoords.latitude,
        longitude: selectedCoords.longitude
    };

    try {
        const res = await fetch(`${apiUrl}/businesses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (res.ok) {
            alert('Negocio registrado con éxito.');
            formElement.reset();

            // Limpiar coordenadas y ocultar contenedores de mapas
            if (formElement.id === 'firstBusinessForm') {
                selectedFirstCoords = { latitude: null, longitude: null };
                const c = document.getElementById('firstMapContainer');
                if (c) c.classList.add('d-none');
            } else {
                selectedModalCoords = { latitude: null, longitude: null };
                const c = document.getElementById('modalMapContainer');
                if (c) c.classList.add('d-none');
            }

            // Cerrar el modal si existe
            const modalEl = document.getElementById('registerBusinessModal');
            if (modalEl) {
                const bsModal = bootstrap.Modal.getInstance(modalEl);
                if (bsModal) {
                    bsModal.hide();
                }
            }

            // Si es el primer negocio, actualizar también el rol del usuario en la sesión local
            const newRole = result.owner && result.owner.role ? result.owner.role : 'owner';
            localStorage.setItem('userRole', newRole);

            // Recargar lista y seleccionar el nuevo
            currentBusinessId = result.id;
            await refreshBusinessesList();

            // Navegar a la pestaña de agenda automáticamente
            const agendaTabBtn = document.getElementById('agenda-tab');
            if (agendaTabBtn) {
                const tab = new bootstrap.Tab(agendaTabBtn);
                tab.show();
            }
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        alert('Error de conexión.');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }
}

// Inicializar al cargar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    initDashboard();
}
