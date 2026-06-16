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

function showBusinessMessage(message, type = 'success') {
    const businessMessage = document.getElementById('businessMessage');
    if (businessMessage) {
        businessMessage.textContent = message;
        businessMessage.className = `alert alert-${type}`;
        businessMessage.classList.remove('d-none');
    }
}

function hideMessage() {
    const businessMessage = document.getElementById('businessMessage');
    if (businessMessage) {
        businessMessage.classList.add('d-none');
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

function initCrearNegocio() {
    const createForm = document.getElementById('createBusinessForm');
    const nextButton = document.getElementById('nextToSchedule');
    const userId = localStorage.getItem('userId');

    if (!userId) {
        alert('Debes iniciar sesión para ingresar tu negocio.');
        window.location.href = pageBasePath + '/login';
        return;
    }

    const addressInput = document.getElementById('businessAddress');
    const suggestionsContainer = document.getElementById('addressSuggestions');
    const mapContainer = document.getElementById('mapContainer');

    let map = null;
    let marker = null;
    let selectedLatitude = null;
    let selectedLongitude = null;

    // Debounce para retrasar consultas a la API
    function debounce(func, delay) {
        let debounceTimer;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => func.apply(context, args), delay);
        };
    }

    // Inicializar o actualizar el mapa de Leaflet
    function initMap(lat, lon) {
        if (!mapContainer || typeof L === 'undefined') return;
        mapContainer.classList.remove('d-none');
        
        if (map) {
            map.setView([lat, lon], 15);
            if (marker) {
                marker.setLatLng([lat, lon]);
            } else {
                marker = L.marker([lat, lon], { draggable: true }).addTo(map);
                marker.on('dragend', function(e) {
                    const newLatLng = e.target.getLatLng();
                    selectedLatitude = newLatLng.lat;
                    selectedLongitude = newLatLng.lng;
                });
            }
        } else {
            map = L.map('map').setView([lat, lon], 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(map);

            marker = L.marker([lat, lon], { draggable: true }).addTo(map);
            marker.on('dragend', function(e) {
                const newLatLng = e.target.getLatLng();
                selectedLatitude = newLatLng.lat;
                selectedLongitude = newLatLng.lng;
            });
        }
        
        // Corregir tamaño del contenedor Leaflet
        setTimeout(() => { map.invalidateSize(); }, 200);
    }

    // Consultar sugerencias predictivas de Nominatim
    async function fetchSuggestions(query) {
        if (!query || query.length < 3 || !suggestionsContainer) {
            if (suggestionsContainer) {
                suggestionsContainer.innerHTML = '';
                suggestionsContainer.classList.add('d-none');
            }
            return;
        }

        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`);
            if (!res.ok) return;
            const data = await res.json();
            
            suggestionsContainer.innerHTML = '';
            
            if (data && data.length > 0) {
                suggestionsContainer.classList.remove('d-none');
                data.forEach(item => {
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.className = 'list-group-item list-group-item-action py-2 small';
                    button.style.cursor = 'pointer';
                    button.style.textAlign = 'left';
                    button.textContent = item.display_name;
                    button.addEventListener('click', () => {
                        addressInput.value = item.display_name;
                        selectedLatitude = parseFloat(item.lat);
                        selectedLongitude = parseFloat(item.lon);
                        suggestionsContainer.innerHTML = '';
                        suggestionsContainer.classList.add('d-none');
                        initMap(selectedLatitude, selectedLongitude);
                    });
                    suggestionsContainer.appendChild(button);
                });
            } else {
                suggestionsContainer.classList.add('d-none');
            }
        } catch (e) {
            console.warn('Suggestions fetch failed', e);
        }
    }

    if (addressInput && suggestionsContainer) {
        addressInput.addEventListener('input', debounce(function(e) {
            fetchSuggestions(e.target.value.trim());
        }, 400));

        // Cerrar sugerencias si hace clic fuera
        document.addEventListener('click', function(e) {
            if (e.target !== addressInput && e.target !== suggestionsContainer) {
                suggestionsContainer.innerHTML = '';
                suggestionsContainer.classList.add('d-none');
            }
        });
    }

    createForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        hideMessage();

        const formData = Object.fromEntries(new FormData(createForm).entries());
        const name = formData.businessName.trim();
        const description = formData.businessDescription.trim();
        const address = (formData.businessAddress || '').trim();
        const logoUrl = (formData.businessLogoUrl || '').trim();

        if (!name) {
            showBusinessMessage('El nombre del negocio es obligatorio.', 'danger');
            return;
        }

        const originalText = nextButton ? nextButton.textContent : 'Siguiente: Agregar Horarios';
        if (nextButton) {
            nextButton.disabled = true;
            nextButton.textContent = 'Validando dirección...';
        }

        let coords = { latitude: selectedLatitude, longitude: selectedLongitude };
        if (address !== '' && (coords.latitude === null || coords.longitude === null)) {
            coords = await geocodeAddress(address);
            if (coords.latitude === null || coords.longitude === null) {
                showBusinessMessage('La dirección ingresada no existe o no se pudo validar. Por favor, asegúrate de incluir calle, número y ciudad válidos (ej: Av. Pellegrini 1500, Rosario).', 'danger');
                if (nextButton) {
                    nextButton.disabled = false;
                    nextButton.textContent = originalText;
                }
                return;
            }
            selectedLatitude = coords.latitude;
            selectedLongitude = coords.longitude;
        }

        const pendingBusiness = {
            name,
            description,
            address,
            logo_url: logoUrl,
            owner_id: parseInt(userId, 10),
            latitude: selectedLatitude,
            longitude: selectedLongitude
        };

        // Guardar temporalmente y redirigir a la vista de agregar horario
        localStorage.setItem('pendingBusiness', JSON.stringify(pendingBusiness));
        window.location.href = pageBasePath + '/agregar-horario';
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCrearNegocio);
} else {
    initCrearNegocio();
}