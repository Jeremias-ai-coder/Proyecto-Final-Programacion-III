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

// Evitar que ciertos errores causados por extensiones del navegador rompan el flujo
window.addEventListener('unhandledrejection', function (event) {
    try {
        const reason = event.reason;
        const msg = reason && (reason.message || reason.toString && reason.toString() || '');
        if (typeof msg === 'string' && msg.includes('A listener indicated an asynchronous response')) {
            console.warn('Ignored extension messaging error:', msg);
            event.preventDefault();
        }
    } catch (e) {
        // no-op
    }
});

function showScheduleMessage(message, type = 'success') {
    const msg = document.getElementById('scheduleMessage');
    msg.textContent = message;
    msg.className = `alert alert-${type}`;
    msg.classList.remove('d-none');
}

function hideScheduleMessage() {
    const msg = document.getElementById('scheduleMessage');
    msg.classList.add('d-none');
}

function initAgregarHorario() {
    const info = document.getElementById('businessInfo');
    const form = document.getElementById('addScheduleForm');

    const pending = localStorage.getItem('pendingBusiness');
    if (!pending) {
        // No hay datos, volver a crear negocio
        info.innerHTML = '<div class="alert alert-warning">No hay datos del negocio. Volviendo al formulario...</div>';
        setTimeout(() => { window.location.href = pageBasePath + '/crear-negocio'; }, 1200);
        return;
    }

    const pendingBusiness = JSON.parse(pending);
    info.innerHTML = `<div><strong>Negocio:</strong> ${pendingBusiness.name}</div><div class="text-muted">${pendingBusiness.description || ''}</div>`;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideScheduleMessage();
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;
        console.debug('Submitting schedule form', { pendingBusiness });

        const formData = Object.fromEntries(new FormData(form).entries());
        const startDay = parseInt(formData.startDay, 10);
        const endDay = parseInt(formData.endDay, 10);
        const startTime = formData.startTime;
        const endTime = formData.endTime;

        if (endDay < startDay) {
            showScheduleMessage('El día final debe ser igual o posterior al día de inicio.', 'danger');
            return;
        }
        if (!startTime || !endTime) {
            showScheduleMessage('Debes completar el horario de atención.', 'danger');
            return;
        }

        const payload = {
            name: pendingBusiness.name,
            description: pendingBusiness.description,
            address: pendingBusiness.address || null,
            logo_url: pendingBusiness.logo_url || null,
            owner_id: pendingBusiness.owner_id,
            start_day: startDay,
            end_day: endDay,
            start_time: startTime,
            end_time: endTime,
        };

        try {
            const res = await fetch(`${apiUrl}/businesses-with-schedule`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            let result;
            try {
                result = await res.json();
            } catch (parseErr) {
                console.error('Error parsing JSON response', parseErr);
                showScheduleMessage('Respuesta del servidor inválida.', 'danger');
                if (submitBtn) submitBtn.disabled = false;
                return;
            }

            if (res.ok) {
                showScheduleMessage('Negocio y horario guardados correctamente.', 'success');
                if (result && result.owner && result.owner.role) {
                    localStorage.setItem('userRole', result.owner.role);
                }
                // Guardar el negocio retornado para que la página de inicio lo muestre inmediatamente
                try {
                    localStorage.setItem('pendingCreatedBusiness', JSON.stringify(result));
                } catch (e) { console.warn('No se pudo guardar en localStorage', e); }
                localStorage.removeItem('pendingBusiness');
                // Redirigir tras breve pausa
                setTimeout(() => { window.location.href = pageBasePath + '/pagina-inicio'; }, 900);
        } else {
            showScheduleMessage(result.message || 'Error al guardar el horario.', 'danger');
        }
        } catch (err) {
            console.error('Network or unexpected error saving schedule', err);
            showScheduleMessage('Error de red o servidor. Reintenta más tarde.', 'danger');
        } finally {
            const btn = form.querySelector('button[type="submit"]');
            if (btn) btn.disabled = false;
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAgregarHorario);
} else {
    initAgregarHorario();
}