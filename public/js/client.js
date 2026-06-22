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

// Variables de estado de paginación (globales para que renderBusinessCards pueda accederlas)
let businessCurrentPage = 1;
const businessesPerPage = 9;


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

// Helper para calcular la distancia en kilómetros (Fórmula de Haversine)
function calculateDistance(lat1, lon1, lat2, lon2) {
    if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return null;
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// 4. FUNCIÓN: RENDERIZAR TARJETAS DE NEGOCIOS (ESTILO MERCADO LIBRE)
function renderBusinessCards(items) {
    const grid = document.getElementById('businessGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    const paginationContainer = document.getElementById('businessPagination');
    if (paginationContainer) {
        paginationContainer.innerHTML = '';
        paginationContainer.style.display = 'none';
    }
    
    if (!items.length) {
        grid.innerHTML = '<div class="col-12"><div class="alert alert-info text-center py-4">No se encontraron negocios dentro del rango seleccionado.</div></div>';
        return;
    }
    
    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / businessesPerPage);

    if (businessCurrentPage > totalPages) {
        businessCurrentPage = totalPages;
    }
    if (businessCurrentPage < 1) {
        businessCurrentPage = 1;
    }

    const startIndex = (businessCurrentPage - 1) * businessesPerPage;
    const endIndex = Math.min(startIndex + businessesPerPage, totalItems);
    const pageItems = items.slice(startIndex, endIndex);

    const userId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole');
    
    const userLat = parseFloat(localStorage.getItem('userLat')) || null;
    const userLng = parseFloat(localStorage.getItem('userLng')) || null;
    
    for (const business of pageItems) {
        const card = document.createElement('div');
        card.className = 'col-sm-6 col-md-6 col-lg-4';
        const initials = (business.name || '').split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase();
        
        // Elegir si pintar el logo o las iniciales
        const logoContent = business.logo_url 
            ? `<img src="${business.logo_url}" class="w-100 h-100 object-fit-cover rounded-circle shadow-sm p-1" alt="${business.name}" onerror="this.outerHTML='<div class=&quot;avatar&quot;>${initials}</div>'">`
            : `<div class="avatar">${initials || 'TY'}</div>`;

        // Calcular distancia si hay coordenadas
        let distanceText = '';
        if (userLat !== null && userLng !== null && business.latitude !== null && business.longitude !== null) {
            const dist = calculateDistance(userLat, userLng, parseFloat(business.latitude), parseFloat(business.longitude));
            if (dist !== null) {
                distanceText = ` <span class="text-primary fw-semibold ms-1">• A ${dist.toFixed(1)} km</span>`;
            }
        }

        // Elegir si pintar la dirección
        const addressContent = business.address 
            ? `<p class="mb-2 small text-muted text-truncate" title="${business.address}"><i class="bi bi-geo-alt me-1"></i>${business.address}${distanceText}</p>`
            : `<p class="mb-2 small text-muted text-truncate text-secondary italic"><i class="bi bi-geo-alt me-1"></i>Dirección no especificada${distanceText}</p>`;
        
        const ratingAvg = business.reviews_avg_rating ? parseFloat(business.reviews_avg_rating).toFixed(1) : null;
        const ratingCount = business.reviews_count || 0;
        const ratingHtml = ratingAvg 
            ? `<span class="badge bg-light text-warning border border-warning-subtle py-1 px-2 rounded-pill small fw-bold mb-2" style="width: fit-content;"><i class="bi bi-star-fill text-warning me-1"></i> ${ratingAvg} (${ratingCount})</span>`
            : `<span class="badge bg-light text-muted border border-light-subtle py-1 px-2 rounded-pill small mb-2" style="width: fit-content;">Sin calificaciones</span>`;
        
        card.innerHTML = `
            <div class="ml-card h-100 d-flex flex-column shadow-sm">
                <div class="ml-image">
                    <div style="width: 72px; height: 72px; display: flex; align-items: center; justify-content: center;">
                        ${logoContent}
                    </div>
                </div>
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title text-truncate">${business.name}</h5>
                    <div class="d-flex align-items-center mb-2">${ratingHtml}</div>
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

    // Renderizar botones de paginación si hay más de 1 página
    if (totalPages > 1 && paginationContainer) {
        paginationContainer.style.display = 'flex';
        
        // Botón Anterior
        const prevBtn = document.createElement('button');
        prevBtn.type = 'button';
        prevBtn.className = 'pagination-btn';
        prevBtn.innerHTML = '<i class="bi bi-chevron-left"></i>';
        prevBtn.disabled = (businessCurrentPage === 1);
        prevBtn.addEventListener('click', () => {
            businessCurrentPage--;
            renderBusinessCards(items);
            grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        paginationContainer.appendChild(prevBtn);

        // Números de página
        for (let p = 1; p <= totalPages; p++) {
            const pBtn = document.createElement('button');
            pBtn.type = 'button';
            pBtn.className = `pagination-btn ${p === businessCurrentPage ? 'active' : ''}`;
            pBtn.innerText = p;
            pBtn.addEventListener('click', () => {
                businessCurrentPage = p;
                renderBusinessCards(items);
                grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
            paginationContainer.appendChild(pBtn);
        }

        // Botón Siguiente
        const nextBtn = document.createElement('button');
        nextBtn.type = 'button';
        nextBtn.className = 'pagination-btn';
        nextBtn.innerHTML = '<i class="bi bi-chevron-right"></i>';
        nextBtn.disabled = (businessCurrentPage === totalPages);
        nextBtn.addEventListener('click', () => {
            businessCurrentPage++;
            renderBusinessCards(items);
            grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        paginationContainer.appendChild(nextBtn);
    }
}

// Filtro cliente para buscar negocios
function filterBusinesses(items, query) {
    const userLat = parseFloat(localStorage.getItem('userLat')) || null;
    const userLng = parseFloat(localStorage.getItem('userLng')) || null;
    // Solo aplicar el filtro de cercanía si el usuario lo activó explícitamente
    const proximityActive = localStorage.getItem('proximityActive') === '1';
    const storedMaxDistance = localStorage.getItem('maxDistance');
    const maxDistance = storedMaxDistance !== null ? parseInt(storedMaxDistance, 10) : null;

    let filtered = items;

    // 1. Filtrar por cercanía solo si el toggle está activo y tenemos ubicación y distancia configurada
    if (proximityActive && userLat !== null && userLng !== null && maxDistance !== null && maxDistance <= 200) {
        filtered = filtered.filter(b => {
            if (b.latitude === null || b.longitude === null) {
                return false; // Ocultamos negocios sin geolocalización cuando el filtro de cercanía está activo
            }
            const dist = calculateDistance(userLat, userLng, parseFloat(b.latitude), parseFloat(b.longitude));
            return dist !== null && dist <= maxDistance;
        });
    }


    // 2. Filtrar por término de búsqueda
    if (query) {
        filtered = filtered.filter(b => {
            const text = `${b.name} ${b.description || ''} ${b.address || ''}`.toLowerCase();
            return text.includes(query.toLowerCase());
        });
    }

    // 3. Ordenar por cercanía (los más cercanos primero) si tenemos ubicación del usuario
    if (userLat !== null && userLng !== null) {
        filtered = [...filtered].sort((a, b) => {
            if (a.latitude === null || a.longitude === null) return 1;
            if (b.latitude === null || b.longitude === null) return -1;
            const distA = calculateDistance(userLat, userLng, parseFloat(a.latitude), parseFloat(a.longitude));
            const distB = calculateDistance(userLat, userLng, parseFloat(b.latitude), parseFloat(b.longitude));
            if (distA === null) return 1;
            if (distB === null) return -1;
            return distA - distB;
        });
    }

    return filtered;
}

// 5. INICIALIZADOR PRINCIPAL SEGURO DE CARGA (init)
async function init() {
    console.info('client.js init() ejecutándose...');
    const navbarActions = document.getElementById('navbarActions');
    const businessSearch = document.getElementById('businessSearch');
    const businessGrid = document.getElementById('businessGrid');
    const businessListSection = document.getElementById('businessListSection');
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
    
    // Elementos del perfil de usuario
    const userProfileSection = document.getElementById('userProfileSection');
    const profileName = document.getElementById('profileName');
    const profileRole = document.getElementById('profileRole');
    const profileLargeAvatar = document.getElementById('profileLargeAvatar');
    const closeProfileBtn = document.getElementById('closeProfileBtn');

    const viewUserName = document.getElementById('viewUserName');
    const viewUserEmail = document.getElementById('viewUserEmail');
    const viewUserPhone = document.getElementById('viewUserPhone');
    
    const editUserName = document.getElementById('editUserName');
    const editUserEmail = document.getElementById('editUserEmail');
    const editUserPhone = document.getElementById('editUserPhone');

    const profileReadMode = document.getElementById('profileReadMode');
    const profileEditMode = document.getElementById('profileEditMode');
    const btnEditProfile = document.getElementById('btnEditProfile');
    const btnCancelEditProfile = document.getElementById('btnCancelEditProfile');
    const editProfileForm = document.getElementById('editProfileForm');
    const editProfileMessage = document.getElementById('editProfileMessage');

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

    let currentCalendarMonth = new Date();


    let businesses = await fetchBusinesses();

    // Notificación flotante rápida si recién creó un negocio
    const insertedCreatedBusiness = insertPendingCreatedBusiness(businesses);
    if (insertedCreatedBusiness) {
        try { showCreationToast(insertedCreatedBusiness); } catch (e) { console.warn('No se pudo mostrar toast', e); }
    }

    // Aplicar filtros iniciales en base a la ubicación/búsqueda
    const initialQuery = businessSearch ? businessSearch.value : '';
    renderBusinessCards(filterBusinesses(businesses, initialQuery));

    // Función para cerrar sesión
    async function handleLogout() {
        try {
            await fetch(`${apiUrl}/logout`, { method: 'POST' });
        } catch (e) {
            console.error('Error closing session on server', e);
        }
        localStorage.clear();
        alert('Sesión cerrada con éxito.');
        window.location.reload();
    }

    // Función coordinada para cambiar de sección activa
    function showSection(sectionId) {
        if (businessListSection) businessListSection.style.display = 'none';
        reserveSection.style.display = 'none';
        myAppointmentsSection.style.display = 'none';
        if (userProfileSection) userProfileSection.style.display = 'none';
        
        if (sectionId === 'grid') {
            if (businessListSection) {
                businessListSection.style.display = ''; // Restaurar display de Bootstrap (.row = flex)
                businessListSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        } else if (sectionId === 'appointments') {
            myAppointmentsSection.style.display = 'block';
            myAppointmentsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            refreshMyAppointmentsList();
        } else if (sectionId === 'profile') {
            if (userProfileSection) {
                userProfileSection.style.display = 'block';
                userProfileSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        } else if (sectionId === 'reserveSection') {
            reserveSection.style.display = 'block';
            reserveSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // B. Cargar datos del usuario para el panel de perfil
    if (userId) {
        try {
            const res = await fetch(`${apiUrl}/users?id=${userId}`);
            if (res.ok) {
                const u = await res.json();
                const initials = (u.name || '').split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase();
                
                // Precargar panel de perfil
                if (viewUserName) viewUserName.innerText = u.name;
                if (viewUserEmail) viewUserEmail.innerText = u.email;
                if (viewUserPhone) viewUserPhone.innerText = u.phone || 'No especificado';

                if (editUserName) editUserName.value = u.name;
                if (editUserEmail) editUserEmail.value = u.email;
                if (editUserPhone) editUserPhone.value = u.phone || '';

                if (profileName) profileName.innerText = u.name;
                if (profileLargeAvatar) profileLargeAvatar.innerText = initials || 'U';
                const prefNotifications = document.getElementById('prefNotifications');
                if (prefNotifications) {
                    prefNotifications.checked = (u.email_notifications == 1);
                }
                const prefWhatsapp = document.getElementById('prefWhatsapp');
                if (prefWhatsapp) {
                    prefWhatsapp.checked = (u.whatsapp_notifications == 1);
                }
                
                let roleLabel = 'Cliente';
                const resolvedRole = userRole || u.role;
                if (resolvedRole === 'owner') roleLabel = 'Dueño de Negocio';
                else if (resolvedRole === 'administrator') roleLabel = 'Administrador';
                else if (resolvedRole === 'staff') roleLabel = 'Personal de Negocio';
                if (profileRole) profileRole.innerText = roleLabel;
            } else {
                if (res.status === 401 || res.status === 403) {
                    localStorage.clear();
                    window.location.reload();
                    return;
                }
            }
        } catch (error) {
            console.error('Error fetching user info for profile panel in client.js:', error);
        }
    }

    const refreshBusinesses = async () => {
        businessCurrentPage = 1;
        businesses = await fetchBusinesses();
        renderBusinessCards(filterBusinesses(businesses, businessSearch.value));
    };

    businessSearch.addEventListener('input', () => {
        businessCurrentPage = 1;
        const filtered = filterBusinesses(businesses, businessSearch.value);
        renderBusinessCards(filtered);
    });

    const btnSearch = document.getElementById('btnSearch');
    if (btnSearch) {
        btnSearch.addEventListener('click', () => {
            businessCurrentPage = 1;
            const filtered = filterBusinesses(businesses, businessSearch.value);
            renderBusinessCards(filtered);
            businessSearch.focus();
        });
    }

    // === LÓGICA DE FILTRADO POR UBICACIÓN Y CERCANÍA ===
    const btnUseGeolocation = document.getElementById('btnUseGeolocation');
    const btnToggleManualLocation = document.getElementById('btnToggleManualLocation');
    const btnSearchManualAddress = document.getElementById('btnSearchManualAddress');
    const btnClearLocationFilter = document.getElementById('btnClearLocationFilter');
    const distanceRange = document.getElementById('distanceRange');
    const distanceRangeVal = document.getElementById('distanceRangeVal');
    const userLocationText = document.getElementById('userLocationText');
    const manualAddressInput = document.getElementById('manualAddressInput');
    const manualLocationError = document.getElementById('manualLocationError');
    const toggleFarBusinesses = document.getElementById('toggleFarBusinesses');
    const toggleFarBusinessesContainer = document.getElementById('toggleFarBusinessesContainer');

    // Nuevo toggle principal de cercanía
    const toggleProximityFilter = document.getElementById('toggleProximityFilter');
    const proximityFilterHint = document.getElementById('proximityFilterHint');
    const distanceSliderWrapper = document.getElementById('distanceSliderWrapper');

    // Inicializar controles desde localStorage
    const savedLat = localStorage.getItem('userLat');
    const savedLng = localStorage.getItem('userLng');
    const savedAddress = localStorage.getItem('userAddress');

    // Si no hay ubicación guardada, aseguramos que maxDistance y proximityActive estén limpios
    if (!savedLat || !savedLng) {
        localStorage.removeItem('maxDistance');
        localStorage.removeItem('proximityActive');
    }

    // Leer si el filtro de cercanía estaba activo
    const proximityWasActive = localStorage.getItem('proximityActive') === '1';
    const savedDistance = localStorage.getItem('maxDistance') || '25';

    function updateDistanceLabel(val) {
        const v = parseInt(val, 10);
        if (v > 200) {
            if (distanceRangeVal) distanceRangeVal.innerText = 'Todo';
        } else {
            if (distanceRangeVal) distanceRangeVal.innerText = `${v} km`;
        }
    }

    function updateProximityFilterUI() {
        const hasLocation = !!(localStorage.getItem('userLat') && localStorage.getItem('userLng'));
        const isActive = toggleProximityFilter && toggleProximityFilter.checked;

        // Habilitar/deshabilitar toggle según si hay ubicación
        if (toggleProximityFilter) {
            toggleProximityFilter.disabled = !hasLocation;
        }

        // Actualizar hint
        if (proximityFilterHint) {
            if (!hasLocation) {
                proximityFilterHint.textContent = 'Activa tu ubicación primero para usar este filtro.';
                proximityFilterHint.style.display = 'block';
            } else if (isActive) {
                proximityFilterHint.textContent = 'Mostrando solo negocios dentro del rango seleccionado.';
                proximityFilterHint.style.display = 'block';
            } else {
                proximityFilterHint.textContent = 'Activá el filtro para ver solo negocios cercanos.';
                proximityFilterHint.style.display = 'block';
            }
        }

        // Mostrar/ocultar slider
        if (distanceSliderWrapper) {
            distanceSliderWrapper.style.display = (hasLocation && isActive) ? 'block' : 'none';
        }

        // Guardar estado
        if (toggleProximityFilter) {
            localStorage.setItem('proximityActive', toggleProximityFilter.checked ? '1' : '0');
        }
    }

    // Inicializar toggle con el estado guardado
    if (toggleProximityFilter) {
        const hasLocation = !!(savedLat && savedLng);
        toggleProximityFilter.checked = hasLocation && proximityWasActive;
        toggleProximityFilter.disabled = !hasLocation;

        toggleProximityFilter.addEventListener('change', () => {
            if (!toggleProximityFilter.checked) {
                // Al desactivar, limpiar distancia del filtro
                localStorage.removeItem('maxDistance');
            } else {
                // Al activar con el valor actual del slider
                const val = distanceRange ? distanceRange.value : '25';
                localStorage.setItem('maxDistance', val);
            }
            updateProximityFilterUI();
            triggerFiltering();
        });
    }

    // Inicializar slider
    if (distanceRange) {
        distanceRange.value = savedDistance;
        updateDistanceLabel(savedDistance);

        distanceRange.addEventListener('input', (e) => {
            const val = e.target.value;
            localStorage.setItem('maxDistance', val);
            updateDistanceLabel(val);
            triggerFiltering();
        });
    }

    updateProximityFilterUI();

    if (savedLat && savedLng && userLocationText) {
        userLocationText.innerHTML = `📍 <strong>${savedAddress || 'Ubicación guardada'}</strong>`;
        if (btnClearLocationFilter) btnClearLocationFilter.style.display = 'block';
    }

    function triggerFiltering() {
        businessCurrentPage = 1;
        const query = businessSearch ? businessSearch.value : '';
        const filtered = filterBusinesses(businesses, query);
        renderBusinessCards(filtered);
    }

    // Legado: sincronizar toggleFarBusinesses (ya no visible pero por compatibilidad)
    function updateToggleContainerVisibility() {
        // El nuevo toggle de proximidad maneja esto
        updateProximityFilterUI();
    }

    // Geolocalización
    if (btnUseGeolocation) {
        btnUseGeolocation.addEventListener('click', () => {
            if (!navigator.geolocation) {
                alert('La geolocalización no está soportada por tu navegador o requiere una conexión segura (HTTPS).');
                return;
            }

            const originalContent = btnUseGeolocation.innerHTML;
            btnUseGeolocation.disabled = true;
            btnUseGeolocation.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Buscando...';
            
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    localStorage.setItem('userLat', lat);
                    localStorage.setItem('userLng', lng);

                    let addressName = `Coordenadas: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                    // Tratar de obtener dirección amigable mediante reverse geocoding
                    try {
                        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
                        if (res.ok) {
                            const data = await res.json();
                            if (data && data.display_name) {
                                const addr = data.address;
                                const city = addr.city || addr.town || addr.village || addr.suburb || '';
                                const state = addr.state || '';
                                addressName = city && state ? `${city}, ${state}` : data.display_name.split(',').slice(0,3).join(',');
                            }
                        }
                    } catch (e) {
                        console.warn('Nominatim reverse geocoding failed', e);
                    }

                    localStorage.setItem('userAddress', addressName);
                    if (userLocationText) {
                        userLocationText.innerHTML = `📍 <strong>${addressName}</strong>`;
                    }
                    if (btnClearLocationFilter) btnClearLocationFilter.style.display = 'block';
                    
                    btnUseGeolocation.disabled = false;
                    btnUseGeolocation.innerHTML = originalContent;

                    updateProximityFilterUI();
                    triggerFiltering();
                },
                (error) => {
                    console.error('Geolocation error', error);
                    let errorMsg = 'No se pudo obtener tu ubicación actual. Por favor, ingrésala manualmente.';
                    if (error.code === error.PERMISSION_DENIED) {
                        errorMsg = 'Permiso de ubicación denegado. Habilita los permisos de ubicación en tu navegador para Turnos Ya.';
                    } else if (error.code === error.POSITION_UNAVAILABLE) {
                        errorMsg = 'La información de ubicación no está disponible actualmente en tu dispositivo.';
                    } else if (error.code === error.TIMEOUT) {
                        errorMsg = 'Se agotó el tiempo de espera al intentar obtener tu ubicación.';
                    }
                    alert(errorMsg);
                    btnUseGeolocation.disabled = false;
                    btnUseGeolocation.innerHTML = originalContent;
                },
                { timeout: 10000 }
            );
        });
    }

    // Búsqueda manual de dirección
    if (btnSearchManualAddress) {
        btnSearchManualAddress.addEventListener('click', async () => {
            const address = manualAddressInput.value.trim();
            if (!address) return;

            const originalContent = btnSearchManualAddress.innerHTML;
            btnSearchManualAddress.disabled = true;
            btnSearchManualAddress.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
            if (manualLocationError) manualLocationError.style.display = 'none';

            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.length > 0) {
                        const lat = parseFloat(data[0].lat);
                        const lng = parseFloat(data[0].lon);
                        const displayName = data[0].display_name.split(',').slice(0, 3).join(',');

                        localStorage.setItem('userLat', lat);
                        localStorage.setItem('userLng', lng);
                        localStorage.setItem('userAddress', displayName);

                        if (userLocationText) {
                            userLocationText.innerHTML = `📍 <strong>${displayName}</strong>`;
                        }
                        if (btnClearLocationFilter) btnClearLocationFilter.style.display = 'block';
                        if (manualAddressInput) manualAddressInput.value = '';
                        
                        // Ocultar collapse
                        const bsCollapse = bootstrap.Collapse.getInstance(document.getElementById('manualLocationCollapse'));
                        if (bsCollapse) bsCollapse.hide();

                        updateProximityFilterUI();
                        triggerFiltering();
                    } else {
                        throw new Error('Dirección no encontrada');
                    }
                } else {
                    throw new Error('Error de conexión con el servidor geocodificador');
                }
            } catch (err) {
                console.error(err);
                if (manualLocationError) {
                    manualLocationError.innerText = err.message || 'No se pudo geocodificar la dirección ingresada.';
                    manualLocationError.style.display = 'block';
                }
            } finally {
                btnSearchManualAddress.disabled = false;
                btnSearchManualAddress.innerHTML = originalContent;
            }
        });
    }

    // Quitar filtro de ubicación
    if (btnClearLocationFilter) {
        btnClearLocationFilter.addEventListener('click', () => {
            localStorage.removeItem('userLat');
            localStorage.removeItem('userLng');
            localStorage.removeItem('userAddress');
            localStorage.removeItem('maxDistance');
            localStorage.removeItem('proximityActive');

            // Desactivar el toggle de cercanía
            if (toggleProximityFilter) {
                toggleProximityFilter.checked = false;
            }

            if (userLocationText) {
                userLocationText.innerHTML = 'No se ha detectado tu ubicación actual.';
            }
            btnClearLocationFilter.style.display = 'none';
            updateProximityFilterUI();
            triggerFiltering();
        });
    }

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


    // 6. WIZARD Y CÁLCULO E INYECCIÓN DE INTERVALOS HORARIOS DISPONIBLES (SLOTS)
    
    // Función para cambiar de paso en el Wizard
    function goToStep(stepNumber) {
        document.getElementById('panelStep1').style.display = 'none';
        document.getElementById('panelStep2').style.display = 'none';
        document.getElementById('panelStep3').style.display = 'none';
        document.getElementById('panelStep4').style.display = 'none';
        
        document.getElementById('stepIndicator1').classList.remove('active');
        document.getElementById('stepIndicator2').classList.remove('active');
        document.getElementById('stepIndicator3').classList.remove('active');
        
        if (stepNumber === 1) {
            document.getElementById('panelStep1').style.display = 'block';
            document.getElementById('stepIndicator1').classList.add('active');
        } else if (stepNumber === 2) {
            document.getElementById('panelStep2').style.display = 'block';
            document.getElementById('stepIndicator2').classList.add('active');
            refreshAvailableSlots();
        } else if (stepNumber === 3) {
            document.getElementById('panelStep3').style.display = 'block';
            document.getElementById('stepIndicator3').classList.add('active');
            populateSummary();
        } else if (stepNumber === 4) {
            document.getElementById('panelStep4').style.display = 'block';
            document.getElementById('stepIndicator3').classList.add('active');
            populateSuccessSummary();
        }
    }

    // Renderiza la lista de servicios en formato de tarjetas clicables
    async function renderServicesWizard(businessId, services) {
        const list = document.getElementById('servicesWizardList');
        if (!list) return;
        list.innerHTML = '';
        
        if (services.length === 0) {
            list.innerHTML = '<div class="col-12 text-center text-muted py-4 small">No hay servicios registrados para este negocio.</div>';
            return;
        }
        
        for (const s of services) {
            const col = document.createElement('div');
            col.className = 'col-md-6';
            col.innerHTML = `
                <div class="service-card-wizard" data-service-id="${s.id}">
                    <div class="checkmark-badge">✓</div>
                    <div>
                        <div class="fw-bold text-dark mb-1">${s.name}</div>
                        <div class="text-muted small mb-2 text-truncate-2" style="font-size: 0.8rem; line-height: 1.3;">${s.description || 'Sin descripción'}</div>
                    </div>
                    <div class="d-flex justify-content-between align-items-center mt-2 pt-2 border-top">
                        <span class="small text-muted" style="font-size: 0.78rem;"><i class="bi bi-clock me-1"></i> ${s.duration_minutes} min</span>
                        <span class="fw-bold text-primary" style="font-size: 0.9rem;">$${parseFloat(s.price).toFixed(2)}</span>
                    </div>
                </div>
            `;
            list.appendChild(col);
        }
        
        // Asignar click en las tarjetas
        list.querySelectorAll('.service-card-wizard').forEach(card => {
            card.addEventListener('click', () => {
                list.querySelectorAll('.service-card-wizard').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                
                // Setear servicio en el input oculto
                document.getElementById('selectService').value = card.dataset.serviceId;
                
                // Avanzar al paso 2
                goToStep(2);
            });
        });
    }

    // Llena el bloque de confirmación del Paso 3
    function populateSummary() {
        const serviceId = document.getElementById('selectService').value;
        const date = bookingDate.value;
        const time = bookingTime.value;
        
        const services = selectService.services || [];
        const service = services.find(s => s.id === parseInt(serviceId, 10));
        
        if (service) {
            document.getElementById('summaryServiceName').innerText = service.name;
            document.getElementById('summaryServiceDesc').innerText = service.description || 'Sin descripción';
            document.getElementById('summaryPrice').innerText = `$${parseFloat(service.price).toFixed(2)}`;
        }
        
        const dateParts = date.split('-');
        const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : date;
        
        document.getElementById('summaryDateTime').innerText = `${formattedDate} a las ${time.substring(0,5)} hs`;
    }

    // Calcula e inyecta los slots disponibles agrupados por Mañana y Tarde
    async function refreshAvailableSlots() {
        const businessId = selectedBusinessId.value;
        const serviceId = document.getElementById('selectService').value;
        const date = bookingDate.value;

        bookingTime.value = '';
        
        const slotsGroupMorning = document.getElementById('slotsGroupMorning');
        const slotsGroupAfternoon = document.getElementById('slotsGroupAfternoon');
        const slotsEmptyMessage = document.getElementById('slotsEmptyMessage');
        const timeSlotsContainer = document.getElementById('timeSlotsContainer');
        
        const morningGrid = slotsGroupMorning.querySelector('.slots-grid');
        const afternoonGrid = slotsGroupAfternoon.querySelector('.slots-grid');
        
        morningGrid.innerHTML = '';
        afternoonGrid.innerHTML = '';
        
        slotsGroupMorning.style.display = 'none';
        slotsGroupAfternoon.style.display = 'none';
        slotsEmptyMessage.style.display = 'none';
        timeSlotsContainer.style.display = 'block';

        if (!businessId || !serviceId || !date) {
            timeSlotsContainer.style.display = 'none';
            return;
        }

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayLocal = `${year}-${month}-${day}`;

        if (date < todayLocal) {
            slotsEmptyMessage.innerText = '⚠️ No se pueden agendar turnos en el pasado.';
            slotsEmptyMessage.style.display = 'block';
            return;
        }

        slotsEmptyMessage.innerHTML = '<div class="text-center py-2 text-muted"><div class="spinner-border spinner-border-sm me-2 text-primary" role="status"></div>Calculando horarios...</div>';
        slotsEmptyMessage.style.display = 'block';

        try {
            const res = await fetch(`${apiUrl}/agenda?business_id=${businessId}&date=${date}`);
            if (!res.ok) {
                slotsEmptyMessage.innerText = '❌ Error al cargar la agenda del negocio.';
                return;
            }

            const data = await res.json();
            slotsEmptyMessage.style.display = 'none';

            if (!data.schedules || !data.schedules.length) {
                slotsEmptyMessage.innerText = '🗓️ El negocio no abre el día seleccionado.';
                slotsEmptyMessage.style.display = 'block';
                return;
            }

            const services = selectService.services || [];
            const service = services.find(s => s.id === parseInt(serviceId, 10));
            const duration = service ? service.duration_minutes : 30;

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
            const slotStep = 30;

            for (const sched of data.schedules) {
                const startMin = timeToMinutes(sched.start_time);
                const endMin = timeToMinutes(sched.end_time);

                for (let timeMin = startMin; timeMin + duration <= endMin; timeMin += slotStep) {
                    const currentMinutes = now.getHours() * 60 + now.getMinutes();
                    if (date === todayLocal && timeMin <= currentMinutes) {
                        continue;
                    }

                    const slotStartStr = minutesToTime(timeMin);
                    if (addedSlots.has(slotStartStr)) continue;

                    let isOccupied = false;
                    for (const appt of data.appointments || []) {
                        if (appt.status === 'cancelled') continue;
                        const apptStartMin = timeToMinutes(appt.time);
                        const apptDuration = appt.service ? appt.service.duration_minutes : 30;
                        const apptEndMin = apptStartMin + apptDuration;

                        if (timeMin < apptEndMin && (timeMin + duration) > apptStartMin) {
                            isOccupied = true;
                            break;
                        }
                    }

                    slots.push({
                        time: slotStartStr,
                        minutes: timeMin,
                        isOccupied
                    });
                    addedSlots.add(slotStartStr);
                }
            }

            if (slots.length === 0) {
                slotsEmptyMessage.innerText = '⚠️ No hay turnos que cubran la duración del servicio hoy.';
                slotsEmptyMessage.style.display = 'block';
                return;
            }

            let morningCount = 0;
            let afternoonCount = 0;

            slots.forEach(slot => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.dataset.time = slot.time;
                btn.innerText = slot.time + ' hs';
                
                if (slot.isOccupied) {
                    btn.className = 'btn btn-slot-pill';
                    btn.disabled = true;
                    btn.title = 'Ocupado';
                } else {
                    btn.className = 'btn btn-slot-pill btn-slot-picker';
                }

                if (slot.minutes < 780) { // Antes de las 13:00 hs
                    morningGrid.appendChild(btn);
                    morningCount++;
                } else {
                    afternoonGrid.appendChild(btn);
                    afternoonCount++;
                }
            });

            if (morningCount > 0) slotsGroupMorning.style.display = 'block';
            if (afternoonCount > 0) slotsGroupAfternoon.style.display = 'block';
            
            if (morningCount === 0 && afternoonCount === 0) {
                slotsEmptyMessage.innerText = '⚠️ No hay turnos disponibles para esta fecha.';
                slotsEmptyMessage.style.display = 'block';
            }

            const handleSlotSelect = (e) => {
                const clickedBtn = e.target.closest('.btn-slot-picker');
                if (!clickedBtn) return;

                timeSlotsContainer.querySelectorAll('.btn-slot-picker').forEach(b => {
                    b.classList.remove('active');
                });

                clickedBtn.classList.add('active');
                bookingTime.value = clickedBtn.dataset.time;
                
                goToStep(3);
            };

            morningGrid.addEventListener('click', handleSlotSelect);
            afternoonGrid.addEventListener('click', handleSlotSelect);

        } catch (error) {
            console.error('Error loading available slots:', error);
            slotsEmptyMessage.innerText = '❌ Error de conexión al servidor.';
            slotsEmptyMessage.style.display = 'block';
        }
    }

    bookingDate.addEventListener('change', refreshAvailableSlots);

    // Preparar el formulario de reserva con los datos del negocio clicado
    async function prepareBooking(business) {
        showSection('reserveSection');
        
        // Actualizar datos del negocio en la columna izquierda
        document.getElementById('bookingBusinessName').innerText = business.name;
        document.getElementById('bookingBusinessAddress').innerHTML = business.address ? `<i class="bi bi-geo-alt me-1"></i> ${business.address}` : '<i class="bi bi-geo-alt me-1"></i> Dirección comercial no especificada';
        
        // Logo / Iniciales
        const initials = (business.name || '').split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase();
        const logoContainer = document.getElementById('bookingBusinessLogoContainer');
        if (business.logo_url) {
            logoContainer.innerHTML = `<img src="${business.logo_url}" class="w-100 h-100 object-fit-cover rounded-circle" alt="${business.name}" onerror="this.outerHTML='<span class=&quot;fs-4 fw-bold text-primary&quot;>${initials}</span>'">`;
        } else {
            logoContainer.innerHTML = `<span class="fs-4 fw-bold text-primary">${initials || 'TY'}</span>`;
        }
        
        // Rating
        const ratingAvg = business.reviews_avg_rating ? parseFloat(business.reviews_avg_rating).toFixed(1) : null;
        const ratingCount = business.reviews_count || 0;
        document.getElementById('bookingBusinessRating').innerHTML = ratingAvg ? `<i class="bi bi-star-fill text-warning me-1"></i> ${ratingAvg} (${ratingCount})` : 'Sin calificaciones';
        
        selectedBusinessId.value = business.id;
        
        // Cargar servicios en Paso 1
        const servicesWizardList = document.getElementById('servicesWizardList');
        servicesWizardList.innerHTML = '<div class="text-center py-4 w-100"><div class="spinner-border spinner-border-sm text-primary" role="status"></div></div>';
        
        const services = await fetchServices(business.id);
        selectService.services = services; // Guardar
        await renderServicesWizard(business.id, services);
        
        // Reset
        document.getElementById('selectService').value = '';
        bookingDate.value = '';
        bookingTime.value = '';
        document.getElementById('timeSlotsContainer').style.display = 'none';
        
        // Inicializar Calendario
        currentCalendarMonth = new Date();
        renderInteractiveCalendar(business);

        goToStep(1);
    }

    // Vincular botones de navegación del Wizard
    const btnCancelBooking = document.getElementById('btnCancelBooking');
    if (btnCancelBooking) {
        btnCancelBooking.addEventListener('click', () => {
            showSection('grid');
        });
    }
    
    const btnBackToStep1 = document.getElementById('btnBackToStep1');
    if (btnBackToStep1) {
        btnBackToStep1.addEventListener('click', () => {
            goToStep(1);
        });
    }
    
    const btnBackToStep2 = document.getElementById('btnBackToStep2');
    if (btnBackToStep2) {
        btnBackToStep2.addEventListener('click', () => {
            goToStep(2);
        });
    }

    let lastBookedAppointment = null;

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

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Confirmando...';

        try {
            const res = await fetch(`${apiUrl}/appointments`, {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (res.ok) {
                lastBookedAppointment = {
                    business_id: body.business_id,
                    service_id: body.service_id,
                    date: body.date,
                    time: body.time
                };
                form.reset();
                goToStep(4);
            } else {
                alert('Error al reservar: ' + (data.message || JSON.stringify(data)));
            }
        } catch (error) {
            alert('Error de conexión con el servidor.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });

    // Finalizar proceso de reserva e ir al inicio
    const btnFinishBooking = document.getElementById('btnFinishBooking');
    if (btnFinishBooking) {
        btnFinishBooking.addEventListener('click', () => {
            showSection('grid');
            refreshBusinesses();
        });
    }

    // Función para renderizar el calendario interactivo
    function renderInteractiveCalendar(business) {
        const calendarContainer = document.getElementById('inlineCalendarContainer');
        if (!calendarContainer) return;

        calendarContainer.innerHTML = '';

        const year = currentCalendarMonth.getFullYear();
        const month = currentCalendarMonth.getMonth();

        const header = document.createElement('div');
        header.className = 'calendar-header';
        
        const monthNames = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];

        const today = new Date();
        const isCurrentMonth = (year === today.getFullYear() && month === today.getMonth());

        header.innerHTML = `
            <button type="button" class="btn btn-sm btn-outline-secondary btn-prev-month" ${isCurrentMonth ? 'disabled' : ''}>
                <i class="bi bi-chevron-left"></i>
            </button>
            <h6 class="fw-bold mb-0 text-dark">${monthNames[month]} ${year}</h6>
            <button type="button" class="btn btn-sm btn-outline-secondary btn-next-month">
                <i class="bi bi-chevron-right"></i>
            </button>
        `;

        calendarContainer.appendChild(header);

        const dayNamesRow = document.createElement('div');
        dayNamesRow.className = 'calendar-days-grid mb-1';
        const dayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        for (const label of dayLabels) {
            const el = document.createElement('div');
            el.className = 'calendar-day-name';
            el.innerText = label;
            dayNamesRow.appendChild(el);
        }
        calendarContainer.appendChild(dayNamesRow);

        const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
        const totalDays = new Date(year, month + 1, 0).getDate();

        const openDaysOfWeek = new Set();
        const schedules = business.work_schedules || business.workSchedules || [];
        for (const sched of schedules) {
            openDaysOfWeek.add(parseInt(sched.day_of_week, 10));
        }

        const daysGrid = document.createElement('div');
        daysGrid.className = 'calendar-days-grid';

        for (let i = 0; i < firstDayIndex; i++) {
            const emptyCell = document.createElement('div');
            daysGrid.appendChild(emptyCell);
        }

        for (let d = 1; d <= totalDays; d++) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'calendar-day-btn';
            btn.innerText = d;

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            btn.dataset.date = dateStr;

            const dateObj = new Date(year, month, d);
            const dayOfWeek = dateObj.getDay() === 0 ? 7 : dateObj.getDay();
            const todayLocalStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

            if (dateStr < todayLocalStr) {
                btn.disabled = true;
            } else {
                if (openDaysOfWeek.has(dayOfWeek)) {
                    btn.classList.add('enabled-day-of-week');
                } else {
                    btn.classList.add('disabled-day-of-week');
                    btn.disabled = true;
                    btn.title = 'Cerrado';
                }
            }

            if (dateStr === todayLocalStr) {
                btn.classList.add('today-day');
            }

            if (bookingDate.value === dateStr) {
                btn.classList.add('active-day');
            }

            btn.addEventListener('click', () => {
                daysGrid.querySelectorAll('.calendar-day-btn').forEach(b => b.classList.remove('active-day'));
                btn.classList.add('active-day');
                bookingDate.value = dateStr;
                refreshAvailableSlots();
            });

            daysGrid.appendChild(btn);
        }

        calendarContainer.appendChild(daysGrid);

        header.querySelector('.btn-prev-month').addEventListener('click', () => {
            currentCalendarMonth.setMonth(currentCalendarMonth.getMonth() - 1);
            renderInteractiveCalendar(business);
        });

        header.querySelector('.btn-next-month').addEventListener('click', () => {
            currentCalendarMonth.setMonth(currentCalendarMonth.getMonth() + 1);
            renderInteractiveCalendar(business);
        });
    }

    // Rellenar el Paso 4 (pantalla de éxito y calendario)
    function populateSuccessSummary() {
        if (!lastBookedAppointment) return;

        const biz = businesses.find(b => b.id === parseInt(lastBookedAppointment.business_id, 10));
        const services = selectService.services || [];
        const srv = services.find(s => s.id === parseInt(lastBookedAppointment.service_id, 10));

        const bizName = biz ? biz.name : 'Negocio';
        const srvName = srv ? srv.name : 'Servicio';
        
        document.getElementById('successBusinessName').innerText = bizName;
        document.getElementById('successServiceName').innerText = srvName;

        const dateParts = lastBookedAppointment.date.split('-');
        const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : lastBookedAppointment.date;
        const formattedTime = lastBookedAppointment.time.substring(0, 5);

        document.getElementById('successDateTime').innerText = `${formattedDate} a las ${formattedTime} hs`;

        // Generar enlace de Google Calendar
        const startDateTimeStr = `${lastBookedAppointment.date.replace(/-/g, '')}T${formattedTime.replace(/:/g, '')}00`;
        const duration = srv ? parseInt(srv.duration_minutes, 10) : 30;
        
        // Calcular hora de fin
        const [h, m] = formattedTime.split(':').map(Number);
        const endMinutes = h * 60 + m + duration;
        const endH = Math.floor(endMinutes / 60);
        const endM = endMinutes % 60;
        const endDateStr = lastBookedAppointment.date.replace(/-/g, '');
        const endDateTimeStr = `${endDateStr}T${String(endH).padStart(2, '0')}${String(endM).padStart(2, '0')}00`;

        const details = encodeURIComponent(`Servicio: ${srvName}\nPrecio: $${srv ? srv.price : '0.00'}`);
        const location = encodeURIComponent(biz && biz.address ? biz.address : '');
        const title = encodeURIComponent(`Turno en ${bizName}`);

        const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDateTimeStr}/${endDateTimeStr}&details=${details}&location=${location}`;
        document.getElementById('btnGoogleCalendar').href = gCalUrl;

        // Configurar botón descargar .ics
        const btnIcs = document.getElementById('btnDownloadIcs');
        btnIcs.onclick = () => {
            const icsContent = [
                'BEGIN:VCALENDAR',
                'VERSION:2.0',
                'PRODID:-//TurnosYa//NONSGML v1.0//ES',
                'BEGIN:VEVENT',
                `SUMMARY:Turno en ${bizName}`,
                `DESCRIPTION:Servicio: ${srvName}`,
                `LOCATION:${biz && biz.address ? biz.address : ''}`,
                `DTSTART:${startDateTimeStr}`,
                `DTEND:${endDateTimeStr}`,
                'END:VEVENT',
                'END:VCALENDAR'
            ].join('\r\n');

            const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `turno-${bizName.toLowerCase().replace(/\s+/g, '-')}.ics`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        };
    }

    // 7. CARGAR Y RENDERIZAR HISTORIAL DE CITAS DE CLIENTE
    async function refreshMyAppointmentsList() {
        if (!userId) return;
        
        function getLocalDateString(dateStr) {
            if (!dateStr) return '';
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                return dateStr;
            }
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) {
                return dateStr.split('T')[0];
            }
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        
        
        const appointmentsList = document.getElementById('appointmentsList');
        const appointmentsHistoryList = document.getElementById('appointmentsHistoryList');
        
        if (appointmentsList) {
            appointmentsList.innerHTML = '<div class="text-center py-4 text-muted w-100"><div class="spinner-border spinner-border-sm me-2 text-primary" role="status"></div>Cargando tus turnos...</div>';
        }
        if (appointmentsHistoryList) {
            appointmentsHistoryList.innerHTML = '<div class="text-center py-4 text-muted w-100"><div class="spinner-border spinner-border-sm me-2 text-primary" role="status"></div>Cargando historial...</div>';
        }

        try {
            const res = await fetch(`${apiUrl}/appointments?user_id=${userId}`);
            if (!res.ok) {
                if (appointmentsList) appointmentsList.innerHTML = '<div class="col-12"><div class="alert alert-danger text-center">Error al cargar tus turnos.</div></div>';
                if (appointmentsHistoryList) appointmentsHistoryList.innerHTML = '<div class="col-12"><div class="alert alert-danger text-center">Error al cargar tu historial.</div></div>';
                return;
            }

            const appts = await res.json();
            if (appointmentsList) appointmentsList.innerHTML = '';
            if (appointmentsHistoryList) appointmentsHistoryList.innerHTML = '';

            const upcomingAppts = appts.filter(appt => appt.status === 'pending');
            const historyAppts = appts.filter(appt => appt.status === 'completed' || appt.status === 'cancelled');

            // 7.1 Renderizar Turnos Próximos
            if (upcomingAppts.length === 0) {
                if (appointmentsList) {
                    appointmentsList.innerHTML = '<div class="col-12"><div class="alert alert-info text-center py-4">No tienes turnos próximos agendados.</div></div>';
                }
            } else {
                upcomingAppts.forEach(appt => {
                    const card = document.createElement('div');
                    card.className = 'col-sm-6 col-md-4';
                    
                    const bizName = appt.business ? appt.business.name : 'Negocio';
                    const serviceName = appt.service ? appt.service.name : 'Servicio';
                    const price = appt.service ? appt.service.price : '0.00';
                    
                    const rawDate = getLocalDateString(appt.date);
                    const dateParts = rawDate.split('-');
                    const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : rawDate;
                    const formattedTime = appt.time ? appt.time.substring(0, 5) : '';

                    let statusLabel = 'Pendiente';

                    // Cancelable rule
                    let showCancelButton = false;
                    const apptTime = new Date(`${rawDate}T${appt.time.substring(0,5)}`).getTime();
                    const now = Date.now();
                    const diffHours = (apptTime - now) / (1000 * 60 * 60);
                    if (diffHours >= 24) {
                        showCancelButton = true;
                    }

                    const cancelBadge = showCancelButton 
                        ? `<span class="badge-cancel-active">✓ Cancelable</span>`
                        : `<span class="badge-cancel-locked" title="Los turnos solo pueden cancelarse con 24 horas de anticipación.">🔒 Fijo</span>`;

                    const initials = (bizName || '').split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase();
                    const bizLogo = appt.business && appt.business.logo_url 
                        ? `<img src="${appt.business.logo_url}" class="rounded-circle shadow-sm" style="width: 40px; height: 40px; object-fit: cover; border: 1px solid #e2e8f0;" alt="${bizName}" onerror="this.outerHTML='<div class=&quot;user-avatar-circle-nav bg-light-primary&quot; style=&quot;width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #009ee3; background-color: #f0f7ff; border: 1px solid #e2e8f0;&quot;>${initials}</div>'">`
                        : `<div class="user-avatar-circle-nav" style="width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #009ee3; background-color: #f0f7ff; border: 1px solid #e2e8f0;">${initials || 'TY'}</div>`;

                    // Generar enlace de Google Calendar
                    const startDateTimeStr = `${rawDate.replace(/-/g, '')}T${formattedTime.replace(/:/g, '')}00`;
                    const duration = appt.service ? parseInt(appt.service.duration_minutes, 10) : 30;
                    
                    const [h, m] = formattedTime.split(':').map(Number);
                    const endMinutes = h * 60 + m + duration;
                    const endH = Math.floor(endMinutes / 60);
                    const endM = endMinutes % 60;
                    const endDateStr = rawDate.replace(/-/g, '');
                    const endDateTimeStr = `${endDateStr}T${String(endH).padStart(2, '0')}${String(endM).padStart(2, '0')}00`;

                    const details = encodeURIComponent(`Servicio: ${serviceName}\nPrecio: $${price}`);
                    const locationVal = encodeURIComponent(appt.business && appt.business.address ? appt.business.address : '');
                    const titleVal = encodeURIComponent(`Turno en ${bizName}`);

                    const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${titleVal}&dates=${startDateTimeStr}/${endDateTimeStr}&details=${details}&location=${locationVal}`;

                    card.innerHTML = `
                        <div class="ticket-card h-100">
                            <div class="ticket-body">
                                <div class="d-flex align-items-center gap-3 mb-3">
                                    ${bizLogo}
                                    <div class="overflow-hidden">
                                        <h6 class="fw-bold text-truncate mb-0 text-dark" style="font-size: 1rem; max-width: 140px;">${bizName}</h6>
                                        <span class="badge bg-primary mt-1" style="font-size: 0.72rem; padding: 3px 8px;">${statusLabel}</span>
                                    </div>
                                </div>
                                <div class="mb-2">
                                    <div class="text-secondary fw-semibold" style="font-size: 0.85rem;">Servicio</div>
                                    <div class="text-dark fw-bold text-truncate" style="font-size: 0.95rem;" title="${serviceName}">${serviceName}</div>
                                    <div class="text-primary fw-bold mb-2" style="font-size: 0.9rem;">$${parseFloat(price).toFixed(2)}</div>
                                    
                                    <!-- Botones de Calendario -->
                                    <div class="d-flex gap-1 mb-2">
                                        <a href="${gCalUrl}" target="_blank" class="btn btn-outline-primary btn-xs py-1 px-2 fw-semibold" style="font-size: 0.72rem; border-radius: 6px;" title="Añadir a Google Calendar">
                                            <i class="bi bi-google"></i> Google Cal
                                        </a>
                                        <button type="button" class="btn btn-outline-secondary btn-xs py-1 px-2 fw-semibold btn-download-ics-appt" data-biz-name="${bizName}" data-srv-name="${serviceName}" data-date="${rawDate}" data-time="${formattedTime}" data-duration="${duration}" data-address="${appt.business && appt.business.address ? appt.business.address : ''}" style="font-size: 0.72rem; border-radius: 6px;" title="Descargar archivo .ics">
                                            <i class="bi bi-calendar-event"></i> .ics
                                        </button>
                                    </div>
                                </div>
                                <div class="mt-auto bg-light p-2 rounded border border-light-subtle d-flex justify-content-between align-items-center">
                                    <div>
                                        <div class="text-muted" style="font-size: 0.72rem; font-weight: 500;">Fecha y Hora</div>
                                        <div class="fw-bold text-dark" style="font-size: 0.82rem;">${formattedDate} a las ${formattedTime} hs</div>
                                    </div>
                                    ${cancelBadge}
                                </div>
                            </div>
                            ${showCancelButton ? `
                                <div class="ticket-divider"></div>
                                <div class="ticket-footer">
                                    <button class="btn btn-light-danger btn-sm w-100 btn-cancel-appt d-flex align-items-center justify-content-center gap-2" data-appt-id="${appt.id}">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-x-circle-fill" viewBox="0 0 16 16">
                                            <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/>
                                        </svg>
                                        Cancelar Turno
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    `;
                    if (appointmentsList) appointmentsList.appendChild(card);
                });

                // Vincular click de descarga de ICS en la lista
                appointmentsList.querySelectorAll('.btn-download-ics-appt').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const biz = btn.dataset.bizName;
                        const srv = btn.dataset.srvName;
                        const dStr = btn.dataset.date;
                        const tStr = btn.dataset.time;
                        const dur = parseInt(btn.dataset.duration, 10) || 30;
                        const addr = btn.dataset.address;

                        const startIcsStr = `${dStr.replace(/-/g, '')}T${tStr.replace(/:/g, '')}00`;
                        const [th, tm] = tStr.split(':').map(Number);
                        const tEndMinutes = th * 60 + tm + dur;
                        const teH = Math.floor(tEndMinutes / 60);
                        const teM = tEndMinutes % 60;
                        const endIcsStr = `${dStr.replace(/-/g, '')}T${String(teH).padStart(2, '0')}${String(teM).padStart(2, '0')}00`;

                        const icsContent = [
                            'BEGIN:VCALENDAR',
                            'VERSION:2.0',
                            'PRODID:-//TurnosYa//NONSGML v1.0//ES',
                            'BEGIN:VEVENT',
                            `SUMMARY:Turno en ${biz}`,
                            `DESCRIPTION:Servicio: ${srv}`,
                            `LOCATION:${addr}`,
                            `DTSTART:${startIcsStr}`,
                            `DTEND:${endIcsStr}`,
                            'END:VEVENT',
                            'END:VCALENDAR'
                        ].join('\r\n');

                        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `turno-${biz.toLowerCase().replace(/\s+/g, '-')}.ics`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                    });
                });
            }

            // 7.2 Renderizar Historial de Turnos
            if (historyAppts.length === 0) {
                if (appointmentsHistoryList) {
                    appointmentsHistoryList.innerHTML = '<div class="col-12"><div class="alert alert-info text-center py-4">No tienes turnos finalizados en tu historial.</div></div>';
                }
            } else {
                historyAppts.forEach(appt => {
                    const card = document.createElement('div');
                    card.className = 'col-sm-6 col-md-4';
                    
                    const bizName = appt.business ? appt.business.name : 'Negocio';
                    const serviceName = appt.service ? appt.service.name : 'Servicio';
                    const price = appt.service ? appt.service.price : '0.00';
                    
                    const rawDate = getLocalDateString(appt.date);
                    const dateParts = rawDate.split('-');
                    const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : rawDate;
                    const formattedTime = appt.time ? appt.time.substring(0, 5) : '';

                    let badgeClass = appt.status === 'completed' ? 'bg-success' : 'bg-danger';
                    let statusLabel = appt.status === 'completed' ? 'Completado' : 'Cancelado';

                    const initials = (bizName || '').split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase();
                    const bizLogo = appt.business && appt.business.logo_url 
                        ? `<img src="${appt.business.logo_url}" class="rounded-circle shadow-sm" style="width: 40px; height: 40px; object-fit: cover; border: 1px solid #e2e8f0;" alt="${bizName}" onerror="this.outerHTML='<div class=&quot;user-avatar-circle-nav bg-light-primary&quot; style=&quot;width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #009ee3; background-color: #f0f7ff; border: 1px solid #e2e8f0;&quot;>${initials}</div>'">`
                        : `<div class="user-avatar-circle-nav" style="width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #009ee3; background-color: #f0f7ff; border: 1px solid #e2e8f0;">${initials || 'TY'}</div>`;

                    let actionHtml = '';
                    if (appt.status === 'completed') {
                        if (appt.review) {
                            // Ya calificado
                            const stars = '★'.repeat(appt.review.rating) + '☆'.repeat(5 - appt.review.rating);
                            actionHtml = `
                                <div class="ticket-divider"></div>
                                <div class="ticket-footer">
                                    <div class="d-flex align-items-center justify-content-between mb-2">
                                        <span class="small text-muted fw-bold">Tu calificación:</span>
                                        <span class="review-star fw-bold fs-6">${stars}</span>
                                    </div>
                                    ${appt.review.comment ? `<p class="mb-0 small text-muted italic p-2 rounded" style="background:#f8fafc; border-left: 3px solid #ffb800; font-size:0.78rem; line-height: 1.3;">"${appt.review.comment}"</p>` : ''}
                                </div>
                            `;
                        } else {
                            // Sin calificar
                            actionHtml = `
                                <div class="ticket-divider"></div>
                                <div class="ticket-footer">
                                    <button class="btn btn-light-primary btn-sm w-100 btn-open-rate-modal d-flex align-items-center justify-content-center gap-2" data-appt-id="${appt.id}">
                                        Calificar Servicio
                                    </button>
                                </div>
                            `;
                        }
                    }

                    card.innerHTML = `
                        <div class="ticket-card h-100" style="border-left: 4px solid ${appt.status === 'completed' ? '#00a650' : '#d93838'};">
                            <div class="ticket-body">
                                <div class="d-flex align-items-center gap-3 mb-3">
                                    ${bizLogo}
                                    <div class="overflow-hidden">
                                        <h6 class="fw-bold text-truncate mb-0 text-dark" style="font-size: 1rem; max-width: 140px;">${bizName}</h6>
                                        <span class="badge ${badgeClass} mt-1" style="font-size: 0.72rem; padding: 3px 8px;">${statusLabel}</span>
                                    </div>
                                </div>
                                <div class="mb-2">
                                    <div class="text-secondary fw-semibold" style="font-size: 0.85rem;">Servicio</div>
                                    <div class="text-dark fw-bold text-truncate" style="font-size: 0.95rem;" title="${serviceName}">${serviceName}</div>
                                    <div class="text-muted fw-bold" style="font-size: 0.9rem;">$${parseFloat(price).toFixed(2)}</div>
                                </div>
                                <div class="mt-auto bg-light p-2 rounded border border-light-subtle">
                                    <div class="text-muted" style="font-size: 0.72rem; font-weight: 500;">Fecha y Hora</div>
                                    <div class="fw-bold text-secondary" style="font-size: 0.82rem;">${formattedDate} a las ${formattedTime} hs</div>
                                </div>
                            </div>
                            ${actionHtml}
                        </div>
                    `;
                    if (appointmentsHistoryList) appointmentsHistoryList.appendChild(card);
                });
            }

        } catch (error) {
            console.error('Error cargando turnos del cliente:', error);
            if (appointmentsList) appointmentsList.innerHTML = '<div class="col-12"><div class="alert alert-danger text-center">Error de conexión al cargar turnos.</div></div>';
        }
    }

    // Toggle de visualización para ver historial de turnos
    function showMyAppointments() {
        showSection('appointments');
    }

    if (closeAppointmentsBtn) {
        closeAppointmentsBtn.addEventListener('click', () => showSection('grid'));
    }

    // Listeners para el panel de perfil
    if (closeProfileBtn) {
        closeProfileBtn.addEventListener('click', () => showSection('grid'));
    }

    const btnProfileGoToAppointments = document.getElementById('btnProfileGoToAppointments');
    if (btnProfileGoToAppointments) {
        btnProfileGoToAppointments.addEventListener('click', () => showSection('appointments'));
    }

    const btnProfileLogout = document.getElementById('btnProfileLogout');
    if (btnProfileLogout) {
        btnProfileLogout.addEventListener('click', handleLogout);
    }

    const prefNotifications = document.getElementById('prefNotifications');
    if (prefNotifications) {
        prefNotifications.addEventListener('change', async () => {
            try {
                const res = await fetch(`${apiUrl}/users`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email_notifications: prefNotifications.checked ? 1 : 0 })
                });
                if (res.ok) {
                    alert('Preferencias de correo actualizadas.');
                } else {
                    alert('No se pudieron guardar las preferencias.');
                    prefNotifications.checked = !prefNotifications.checked;
                }
            } catch (err) {
                console.error('Error al guardar preferencias:', err);
                alert('Error de conexión.');
                prefNotifications.checked = !prefNotifications.checked;
            }
        });
    }

    const btnSavePhone = document.getElementById('btnSavePhone');
    if (btnSavePhone) {
        btnSavePhone.addEventListener('click', async () => {
            const configUserPhone = document.getElementById('configUserPhone');
            const phoneVal = configUserPhone ? configUserPhone.value.trim() : '';
            btnSavePhone.disabled = true;
            try {
                const res = await fetch(`${apiUrl}/users`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone: phoneVal })
                });
                if (res.ok) {
                    alert('Número de teléfono guardado correctamente.');
                } else {
                    const data = await res.json();
                    alert('No se pudo guardar el teléfono: ' + (data.message || 'Error desconocido'));
                }
            } catch (err) {
                console.error('Error al guardar teléfono:', err);
                alert('Error de conexión.');
            } finally {
                btnSavePhone.disabled = false;
            }
        });
    }

    const prefWhatsapp = document.getElementById('prefWhatsapp');
    if (prefWhatsapp) {
        prefWhatsapp.addEventListener('change', async () => {
            try {
                const res = await fetch(`${apiUrl}/users`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ whatsapp_notifications: prefWhatsapp.checked ? 1 : 0 })
                });
                if (res.ok) {
                    alert('Preferencias de WhatsApp actualizadas.');
                } else {
                    alert('No se pudieron guardar las preferencias.');
                    prefWhatsapp.checked = !prefWhatsapp.checked;
                }
            } catch (err) {
                console.error('Error al guardar preferencias de WhatsApp:', err);
                alert('Error de conexión.');
                prefWhatsapp.checked = !prefWhatsapp.checked;
            }
        });
    }

    // Toggle para el modo de edición de perfil
    if (btnEditProfile) {
        btnEditProfile.addEventListener('click', () => {
            if (profileReadMode && profileEditMode) {
                profileReadMode.style.display = 'none';
                profileEditMode.style.display = 'block';
            }
        });
    }

    if (btnCancelEditProfile) {
        btnCancelEditProfile.addEventListener('click', () => {
            if (profileReadMode && profileEditMode) {
                profileEditMode.style.display = 'none';
                profileReadMode.style.display = 'block';
                if (editProfileForm) editProfileForm.reset();
                if (editProfileMessage) editProfileMessage.classList.add('d-none');
                
                const changePasswordCollapse = document.getElementById('changePasswordCollapse');
                if (changePasswordCollapse && changePasswordCollapse.classList.contains('show')) {
                    const bsCollapse = bootstrap.Collapse.getInstance(changePasswordCollapse);
                    if (bsCollapse) bsCollapse.hide();
                    else {
                        changePasswordCollapse.classList.remove('show');
                    }
                }
            }
        });
    }

    if (editProfileForm) {
        editProfileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = editUserName ? editUserName.value.trim() : '';
            const phone = editUserPhone ? editUserPhone.value.trim() : '';
            const old_password = document.getElementById('editPasswordOld') ? document.getElementById('editPasswordOld').value : '';
            const new_password = document.getElementById('editPasswordNew') ? document.getElementById('editPasswordNew').value : '';
            const confirm_password = document.getElementById('editPasswordConfirm') ? document.getElementById('editPasswordConfirm').value : '';

            if (editProfileMessage) editProfileMessage.classList.add('d-none');

            const requestData = { name, phone };

            if (old_password || new_password || confirm_password) {
                if (!old_password || !new_password || !confirm_password) {
                    if (editProfileMessage) {
                        editProfileMessage.textContent = 'Para cambiar tu contraseña debes completar todos los campos de contraseña.';
                        editProfileMessage.className = 'alert alert-danger py-2 text-center small';
                        editProfileMessage.classList.remove('d-none');
                    }
                    return;
                }

                if (new_password !== confirm_password) {
                    if (editProfileMessage) {
                        editProfileMessage.textContent = 'La nueva contraseña y su confirmación no coinciden.';
                        editProfileMessage.className = 'alert alert-danger py-2 text-center small';
                        editProfileMessage.classList.remove('d-none');
                    }
                    return;
                }

                if (new_password.length < 6) {
                    if (editProfileMessage) {
                        editProfileMessage.textContent = 'La nueva contraseña debe tener al menos 6 caracteres.';
                        editProfileMessage.className = 'alert alert-danger py-2 text-center small';
                        editProfileMessage.classList.remove('d-none');
                    }
                    return;
                }

                requestData.old_password = old_password;
                requestData.new_password = new_password;
            }

            const btnSaveProfile = document.getElementById('btnSaveProfile');
            if (btnSaveProfile) {
                btnSaveProfile.disabled = true;
                btnSaveProfile.textContent = 'Guardando...';
            }

            try {
                const res = await fetch(`${apiUrl}/users`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestData)
                });

                const result = await res.json();

                if (res.ok) {
                    if (editProfileMessage) {
                        editProfileMessage.textContent = '¡Perfil actualizado con éxito!';
                        editProfileMessage.className = 'alert alert-success py-2 text-center small';
                        editProfileMessage.classList.remove('d-none');
                    }

                    if (name) {
                        localStorage.setItem('userName', name);
                    }

                    setTimeout(async () => {
                        try {
                            const resUser = await fetch(`${apiUrl}/users?id=${userId}`);
                            if (resUser.ok) {
                                const u = await resUser.json();
                                if (viewUserName) viewUserName.innerText = u.name;
                                if (viewUserEmail) viewUserEmail.innerText = u.email;
                                if (viewUserPhone) viewUserPhone.innerText = u.phone || 'No especificado';
                                if (profileName) profileName.innerText = u.name;
                                const initials = (u.name || '').split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase();
                                if (profileLargeAvatar) profileLargeAvatar.innerText = initials || 'U';
                            }
                        } catch (e) {
                            console.error('Error al recargar datos de usuario:', e);
                        }

                        if (profileReadMode && profileEditMode) {
                            profileEditMode.style.display = 'none';
                            profileReadMode.style.display = 'block';
                            editProfileForm.reset();
                            
                            const changePasswordCollapse = document.getElementById('changePasswordCollapse');
                            if (changePasswordCollapse && changePasswordCollapse.classList.contains('show')) {
                                const bsCollapse = bootstrap.Collapse.getInstance(changePasswordCollapse);
                                if (bsCollapse) bsCollapse.hide();
                                else changePasswordCollapse.classList.remove('show');
                            }
                        }
                    }, 1200);

                } else {
                    if (editProfileMessage) {
                        editProfileMessage.textContent = result.message || 'No se pudo guardar la información.';
                        editProfileMessage.className = 'alert alert-danger py-2 text-center small';
                        editProfileMessage.classList.remove('d-none');
                    }
                }
            } catch (err) {
                console.error('Error al actualizar perfil:', err);
                if (editProfileMessage) {
                    editProfileMessage.textContent = 'Error de conexión. Intente nuevamente.';
                    editProfileMessage.className = 'alert alert-danger py-2 text-center small';
                    editProfileMessage.classList.remove('d-none');
                }
            } finally {
                if (btnSaveProfile) {
                    btnSaveProfile.disabled = false;
                    btnSaveProfile.textContent = 'Guardar Cambios';
                }
            }
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

    // 8.3. CONTROLADOR PARA ABRIR EL MODAL DE CALIFICACIÓN
    if (appointmentsHistoryList) {
        appointmentsHistoryList.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-open-rate-modal');
            if (!btn) return;
            const apptId = btn.dataset.apptId;
            
            // Configurar modal
            document.getElementById('rateAppointmentId').value = apptId;
            document.getElementById('selectedRating').value = '';
            document.getElementById('rateComment').value = '';
            
            // Limpiar estrellas en el modal
            document.querySelectorAll('#modalStarsContainer .star-item').forEach(s => {
                s.classList.remove('selected', 'hover');
            });
            
            // Mostrar modal
            const rateModal = new bootstrap.Modal(document.getElementById('rateServiceModal'));
            rateModal.show();
        });
    }

    // 8.4. LÓGICA INTERACTIVA DE ESTRELLAS EN EL MODAL
    const modalStarsContainer = document.getElementById('modalStarsContainer');
    const selectedRatingInput = document.getElementById('selectedRating');
    if (modalStarsContainer) {
        const stars = modalStarsContainer.querySelectorAll('.star-item');
        stars.forEach(star => {
            star.addEventListener('click', () => {
                const rating = parseInt(star.dataset.rating, 10);
                selectedRatingInput.value = rating;
                stars.forEach((s, idx) => {
                    if (idx < rating) {
                        s.classList.add('selected');
                    } else {
                        s.classList.remove('selected');
                    }
                });
            });
            star.addEventListener('mouseover', () => {
                const rating = parseInt(star.dataset.rating, 10);
                stars.forEach((s, idx) => {
                    if (idx < rating) {
                        s.classList.add('hover');
                    } else {
                        s.classList.remove('hover');
                    }
                });
            });
            star.addEventListener('mouseout', () => {
                stars.forEach(s => s.classList.remove('hover'));
            });
        });
    }

    // Enviar el formulario de calificación
    const rateServiceForm = document.getElementById('rateServiceForm');
    if (rateServiceForm) {
        rateServiceForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const apptId = document.getElementById('rateAppointmentId').value;
            const rating = selectedRatingInput.value;
            const comment = document.getElementById('rateComment').value;
            
            if (!rating) {
                alert('Por favor selecciona una calificación por estrellas.');
                return;
            }
            
            const submitBtn = rateServiceForm.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.disabled = true;
            
            try {
                const res = await fetch(`${apiUrl}/reviews`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ appointment_id: apptId, rating, comment })
                });
                const data = await res.json();
                if (res.ok) {
                    alert('¡Gracias por tu calificación!');
                    
                    // Cerrar modal
                    const rateModalEl = document.getElementById('rateServiceModal');
                    const bsModal = bootstrap.Modal.getInstance(rateModalEl);
                    if (bsModal) bsModal.hide();
                    
                    // Resetear formulario
                    rateServiceForm.reset();
                    document.querySelectorAll('#modalStarsContainer .star-item').forEach(s => s.classList.remove('selected'));
                    selectedRatingInput.value = '';
                    
                    // Refrescar lista de turnos e historial
                    await refreshMyAppointmentsList();
                    // Refrescar negocios locales
                    await refreshBusinesses();
                } else {
                    alert('Error al enviar la calificación: ' + (data.message || 'Error desconocido'));
                }
            } catch (err) {
                console.error('Error al calificar servicio:', err);
                alert('Error de conexión. Inténtalo de nuevo.');
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }

    // 8.5. CONTROLADOR DE DETALLES DEL NEGOCIO (MODAL)
    const businessDetailsModal = document.getElementById('businessDetailsModal');
    const businessDetailsContent = document.getElementById('businessDetailsContent');

    if (businessGrid) {
        businessGrid.addEventListener('click', async (e) => {
            // Ignorar clicks en el botón de agendar turno para no abrir el modal
            if (e.target.closest('.btn-select-business')) {
                return;
            }

            const card = e.target.closest('.ml-card');
            if (!card) return;

            const btnView = card.querySelector('.btn-view-business');
            if (!btnView) return;

            const bid = parseInt(btnView.dataset.businessId, 10);
            const business = businesses.find(b => b.id === bid);
            if (!business) return;

            // Renderizar contenido dinámico en el modal
            const initials = (business.name || '').split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase();
            
            const logoHtml = business.logo_url 
                ? `<img src="${business.logo_url}" class="w-100 h-100 object-fit-cover rounded-circle shadow-sm p-1" style="max-width: 110px; max-height: 110px; aspect-ratio: 1;" alt="${business.name}" onerror="this.outerHTML='<div class=&quot;avatar fs-2&quot; style=&quot;width: 100px; height: 100px; border-radius: 12px; background: linear-gradient(135deg, #e6f5fc, #ffffff); color: #009ee3; display: flex; align-items: center; justify-content: center; font-weight: 800; border: 1px solid #cce9f8;&quot;>${initials}</div>'">`
                : `<div class="avatar fs-2 mx-auto" style="width: 100px; height: 100px; border-radius: 12px; background: linear-gradient(135deg, #e6f5fc, #ffffff); color: #009ee3; display: flex; align-items: center; justify-content: center; font-weight: 800; border: 1px solid #cce9f8;">${initials || 'TY'}</div>`;

            const addressHtml = business.address 
                ? `<p class="mb-3 fs-6 text-muted"><i class="bi bi-geo-alt me-1"></i><strong>Dirección:</strong> ${business.address}</p>`
                : `<p class="mb-3 fs-6 text-muted italic"><i class="bi bi-geo-alt me-1"></i><strong>Dirección:</strong> No especificada</p>`;

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

            // Consultar servicios del negocio a la API
            let servicesHtml = '';
            try {
                const services = await fetchServices(business.id);
                if (services && services.length > 0) {
                    servicesHtml = services.map(s => `
                        <div class="d-flex justify-content-between align-items-center py-2 border-bottom border-light">
                            <div class="text-start">
                                <span class="fw-semibold text-dark small d-block">${s.name}</span>
                                ${s.description ? `<span class="text-muted" style="font-size: 0.75rem;">${s.description}</span>` : ''}
                            </div>
                            <div class="text-end ms-2">
                                <span class="badge bg-light text-primary border border-primary-subtle py-1 px-2 rounded-pill small fw-bold">$${parseFloat(s.price).toFixed(2)}</span>
                                <span class="text-muted d-block" style="font-size: 0.7rem;"><i class="bi bi-clock"></i> ${s.duration_minutes} min</span>
                            </div>
                        </div>
                    `).join('');
                } else {
                    servicesHtml = `<p class="text-muted small italic text-center py-4 my-auto">Este negocio no tiene servicios registrados aún.</p>`;
                }
            } catch (err) {
                console.error("Error al cargar servicios:", err);
                servicesHtml = `<p class="text-danger small text-center py-3">Error al cargar servicios.</p>`;
            }

            // Consultar reseñas reales del negocio a la API
            let reviewsHtml = '';
            let bizRatingSummary = '';
            try {
                const reviewsRes = await fetch(`${apiUrl}/reviews?business_id=${business.id}`);
                if (reviewsRes.ok) {
                    const reviews = await reviewsRes.json();
                    if (reviews && reviews.length > 0) {
                        const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
                        const avg = (sum / reviews.length).toFixed(1);
                        bizRatingSummary = `<i class="bi bi-star-fill text-warning me-1"></i> <span class="fw-bold text-dark">${avg}</span> <span class="text-muted">/ 5 (${reviews.length} valoraciones)</span>`;
                        
                        reviewsHtml = reviews.map(r => {
                            const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
                            const rawDate = r.appointment_date ? r.appointment_date.split('T')[0] : '';
                            const dateParts = rawDate.split('-');
                            const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : rawDate;
                            return `
                                <div class="review-card mb-2 text-start">
                                    <div class="d-flex justify-content-between align-items-center mb-1">
                                        <span class="fw-bold text-dark small">${r.user_name}</span>
                                        <span class="text-muted" style="font-size: 0.75rem;">${formattedDate}</span>
                                    </div>
                                    <div class="review-star small mb-1">${stars}</div>
                                    ${r.comment ? `<p class="mb-0 small text-secondary italic" style="line-height: 1.3;">"${r.comment}"</p>` : ''}
                                </div>
                            `;
                        }).join('');
                    } else {
                        bizRatingSummary = `<span class="text-muted">Sin calificaciones aún</span>`;
                        reviewsHtml = `<p class="text-muted small italic text-center py-4 my-auto">Este negocio no tiene reseñas de clientes aún.</p>`;
                    }
                } else {
                    bizRatingSummary = `<span class="text-danger small">Error de carga</span>`;
                    reviewsHtml = `<p class="text-danger small text-center py-3">No se pudieron cargar las reseñas.</p>`;
                }
            } catch (err) {
                console.error("Error al cargar reseñas:", err);
                bizRatingSummary = `<span class="text-danger small">Error de conexión</span>`;
                reviewsHtml = `<p class="text-danger small text-center py-3">Error de conexión al cargar reseñas.</p>`;
            }

            if (businessDetailsContent) {
                businessDetailsContent.innerHTML = `
                    <div class="text-center mb-4">
                        <div class="mb-3 d-flex justify-content-center">
                            ${logoHtml}
                        </div>
                        <h3 class="fw-bold text-dark mb-1">${business.name}</h3>
                        <div class="d-flex justify-content-center align-items-center gap-1 mb-2">
                            ${bizRatingSummary}
                        </div>
                        <p class="text-muted mb-3">${business.description || 'Sin descripción disponible.'}</p>
                        <div class="d-flex justify-content-center">
                            ${addressHtml}
                        </div>
                    </div>
                    
                    <div class="row g-4 mt-2">
                        <div class="col-md-6 col-lg-4">
                            <div class="bg-light p-3 rounded-3 h-100 border border-light-subtle d-flex flex-column">
                                <h6 class="fw-bold text-dark border-bottom pb-2 mb-3 d-flex align-items-center gap-2"><i class="bi bi-clock"></i> Horarios de Atención</h6>
                                <div class="flex-grow-1 px-1" style="max-height: 250px; overflow-y: auto;">
                                    ${schedulesHtml}
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6 col-lg-4">
                            <div class="bg-light p-3 rounded-3 h-100 border border-light-subtle d-flex flex-column">
                                <h6 class="fw-bold text-dark border-bottom pb-2 mb-3 d-flex align-items-center gap-2"><i class="bi bi-briefcase"></i> Servicios Ofrecidos</h6>
                                <div class="flex-grow-1 px-1" style="max-height: 250px; overflow-y: auto;">
                                    ${servicesHtml}
                                </div>
                            </div>
                        </div>
                        <div class="col-md-12 col-lg-4">
                            <div class="bg-light p-3 rounded-3 h-100 border border-light-subtle d-flex flex-column">
                                <h6 class="fw-bold text-dark border-bottom pb-2 mb-3 d-flex align-items-center gap-2"><i class="bi bi-star-fill text-warning"></i> Reseñas de Clientes</h6>
                                <div class="flex-grow-1 px-1" style="max-height: 250px; overflow-y: auto;">
                                    ${reviewsHtml}
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

    // Exponer showSection al ámbito global para cambiar de sección desde notifications.js
    window.showSection = showSection;

    // Detectar si venimos con un parámetro de sección en la URL
    const urlParams = new URLSearchParams(window.location.search);
    const sec = urlParams.get('section');
    if (sec === 'profile') {
        showSection('profile');
    } else if (sec === 'appointments') {
        showSection('appointments');
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
