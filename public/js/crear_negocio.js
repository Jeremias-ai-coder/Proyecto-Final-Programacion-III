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
    businessMessage.textContent = message;
    businessMessage.className = `alert alert-${type}`;
    businessMessage.classList.remove('d-none');
}

function hideMessage() {
    const businessMessage = document.getElementById('businessMessage');
    businessMessage.classList.add('d-none');
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

        let coords = { latitude: null, longitude: null };
        if (address !== '') {
            coords = await geocodeAddress(address);
            if (coords.latitude === null || coords.longitude === null) {
                showBusinessMessage('La dirección ingresada no existe o no se pudo validar. Por favor, asegúrate de incluir calle, número y ciudad válidos (ej: Av. Pellegrini 1500, Rosario).', 'danger');
                if (nextButton) {
                    nextButton.disabled = false;
                    nextButton.textContent = originalText;
                }
                return;
            }
        }

        const pendingBusiness = {
            name,
            description,
            address,
            logo_url: logoUrl,
            owner_id: parseInt(userId, 10),
            latitude: coords.latitude,
            longitude: coords.longitude
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