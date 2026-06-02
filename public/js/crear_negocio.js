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

function initCrearNegocio() {
    const businessStep = document.getElementById('businessStep');
    const createForm = document.getElementById('createBusinessForm');
    const nextButton = document.getElementById('nextToSchedule');
    const userId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole');

    let pendingBusiness = null;

    if (!userId) {
        alert('Debes iniciar sesión para ingresar tu negocio.');
        window.location.href = pageBasePath + '/login';
        return;
    }

    // Controlador de envío primario (maneja Enter y el envío del formulario)
    createForm.addEventListener('submit', (event) => {
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

        pendingBusiness = {
            name,
            description,
            address,
            logo_url: logoUrl,
            owner_id: parseInt(userId, 10),
        };

        // Guardar temporalmente y redirigir a la vista de agregar horario
        localStorage.setItem('pendingBusiness', JSON.stringify(pendingBusiness));
        window.location.href = pageBasePath + '/agregar-horario';
    });

    // Also bind click on the button directly to ensure immediate response
    if (nextButton) {
        nextButton.addEventListener('click', (ev) => {
            ev.preventDefault();
            // Dispara la misma lógica de envío que el controlador de formulario
            createForm.requestSubmit && createForm.requestSubmit();
            // Alternativa para navegadores más antiguos
            try {
                const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                createForm.dispatchEvent(submitEvent);
            } catch (e) {
                // ignorar
            }
        });
    }

    // Alternativa robusta: controlador de clic directo que lee los campos, guarda el negocio pendiente y redirige.
    if (nextButton) {
        nextButton.addEventListener('click', (ev) => {
            ev.preventDefault();
            try {
                const name = (createForm.elements['businessName'] || {}).value || '';
                const description = (createForm.elements['businessDescription'] || {}).value || '';
                const address = (createForm.elements['businessAddress'] || {}).value || '';
                const logoUrl = (createForm.elements['businessLogoUrl'] || {}).value || '';
                if (!name.trim()) {
                    showBusinessMessage('El nombre del negocio es obligatorio.', 'danger');
                    return;
                }
                const pb = { 
                    name: name.trim(), 
                    description: description.trim(), 
                    address: address.trim(),
                    logo_url: logoUrl.trim(),
                    owner_id: parseInt(userId, 10) 
                };
                localStorage.setItem('pendingBusiness', JSON.stringify(pb));
                // depuración
                console.debug('pendingBusiness saved (click fallback)', pb);
                window.location.href = pageBasePath + '/agregar-horario';
            } catch (err) {
                console.error('Error manejando click de agregar horario', err);
            }
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCrearNegocio);
} else {
    initCrearNegocio();
}