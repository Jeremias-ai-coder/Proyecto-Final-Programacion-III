// URL base de la API RESTful
const pageBasePath = (function () {
    try {
        const pathname = window.location.pathname;
        const parts = pathname.split('/');
        const knownPages = ['pagina-inicio', 'client', 'crear-negocio', 'agregar-horario', 'login', 'dashboard', 'registro', 'api', 'sistema', 'admin'];
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

if (!userId || userRole !== 'administrator') {
    alert('Acceso denegado. Debes iniciar sesión como administrador.');
    window.location.href = pageBasePath + '/login';
}

// Estado global de la administración
let allUsers = [];
let allBusinesses = [];
let allServices = [];
let allAppointments = [];
let allMailQueue = [];
let allSecurityLocks = [];

// Elementos del DOM
const kpiUsers = document.getElementById('kpiUsers');
const kpiBusinesses = document.getElementById('kpiBusinesses');
const kpiAdmins = document.getElementById('kpiAdmins');

const usersTableBody = document.getElementById('usersTableBody');
const businessesTableBody = document.getElementById('businessesTableBody');
const servicesTableBody = document.getElementById('servicesTableBody');
const appointmentsTableBody = document.getElementById('appointmentsTableBody');
const mailQueueTableBody = document.getElementById('mailQueueTableBody');

const userSearchInput = document.getElementById('userSearchInput');
const businessSearchInput = document.getElementById('businessSearchInput');
const serviceSearchInput = document.getElementById('serviceSearchInput');
const appointmentSearchInput = document.getElementById('appointmentSearchInput');
const mailSearchInput = document.getElementById('mailSearchInput');

const btnClearProcessedMails = document.getElementById('btnClearProcessedMails');
const btnRefreshLogs = document.getElementById('btnRefreshLogs');
const appLogsConsole = document.getElementById('appLogsConsole');
const mailLogsConsole = document.getElementById('mailLogsConsole');
const failedMailsCount = document.getElementById('failedMailsCount');
const logoutBtn = document.getElementById('logoutBtn');

const lockedAccountsCount = document.getElementById('lockedAccountsCount');
const lockedAccountsTableBody = document.getElementById('lockedAccountsTableBody');
const securitySearchInput = document.getElementById('securitySearchInput');
const btnRefreshSecurity = document.getElementById('btnRefreshSecurity');

// Inicialización
async function initAdminPanel() {
    // Vincular cierre de sesión
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

    // Vincular búsqueda interactiva
    if (userSearchInput) {
        userSearchInput.addEventListener('input', () => {
            renderUsers(filterUsers(allUsers, userSearchInput.value.trim()));
        });
    }

    if (businessSearchInput) {
        businessSearchInput.addEventListener('input', () => {
            renderBusinesses(filterBusinesses(allBusinesses, businessSearchInput.value.trim()));
        });
    }

    if (serviceSearchInput) {
        serviceSearchInput.addEventListener('input', () => {
            const query = serviceSearchInput.value.trim().toLowerCase();
            const filtered = allServices.filter(s => {
                const nameMatch = s.name && s.name.toLowerCase().includes(query);
                const descMatch = s.description && s.description.toLowerCase().includes(query);
                const bizMatch = s.business && s.business.name.toLowerCase().includes(query);
                return nameMatch || descMatch || bizMatch;
            });
            renderPendingServices(filtered);
        });
    }

    if (appointmentSearchInput) {
        appointmentSearchInput.addEventListener('input', () => {
            renderAppointments(filterAppointments(allAppointments, appointmentSearchInput.value.trim()));
        });
    }

    if (mailSearchInput) {
        mailSearchInput.addEventListener('input', () => {
            renderMailQueue(filterMailQueue(allMailQueue, mailSearchInput.value.trim()));
        });
    }

    if (btnClearProcessedMails) {
        btnClearProcessedMails.addEventListener('click', async () => {
            if (confirm('¿Estás seguro de que deseas eliminar de la base de datos todos los correos con estado "sent" o "failed"?')) {
                try {
                    const res = await fetch(`${apiUrl}/mail-queue?type=processed`, { method: 'DELETE' });
                    const result = await res.json();
                    if (res.ok) {
                        alert(result.message || 'Cola de correos limpia.');
                        await loadMailQueue();
                    } else {
                        alert('Error: ' + result.message);
                    }
                } catch (e) {
                    alert('Error de conexión al limpiar la cola.');
                }
            }
        });
    }

    if (btnRefreshLogs) {
        btnRefreshLogs.addEventListener('click', async () => {
            await loadSystemLogs();
        });
    }

    // Recargar logs al hacer click en la pestaña
    const logsTabButton = document.getElementById('logs-tab');
    if (logsTabButton) {
        logsTabButton.addEventListener('shown.bs.tab', async () => {
            await loadSystemLogs();
        });
    }

    if (securitySearchInput) {
        securitySearchInput.addEventListener('input', () => {
            renderSecurityLocks(filterSecurityLocks(allSecurityLocks, securitySearchInput.value.trim()));
        });
    }

    if (btnRefreshSecurity) {
        btnRefreshSecurity.addEventListener('click', async () => {
            await loadSecurityLocks();
        });
    }

    // Recargar estadísticas al hacer click en la pestaña
    const statsTabButton = document.getElementById('stats-tab');
    if (statsTabButton) {
        statsTabButton.addEventListener('shown.bs.tab', async () => {
            await loadSystemStats();
        });
    }

    // Recargar bloqueos al hacer click en la pestaña
    const securityTabButton = document.getElementById('security-tab');
    if (securityTabButton) {
        securityTabButton.addEventListener('shown.bs.tab', async () => {
            await loadSecurityLocks();
        });
    }

    // Cargar datos del servidor
    await loadData();
}

// Cargar usuarios y negocios de la API
async function loadData() {
    try {
        // Cargar usuarios
        const usersRes = await fetch(`${apiUrl}/users`);
        if (!usersRes.ok) throw new Error('Error al cargar usuarios');
        allUsers = await usersRes.json();

        // Cargar negocios
        const businessesRes = await fetch(`${apiUrl}/businesses`);
        if (!businessesRes.ok) throw new Error('Error al cargar negocios');
        allBusinesses = await businessesRes.json();

        // Cargar servicios para moderación
        const servicesRes = await fetch(`${apiUrl}/services`);
        if (!servicesRes.ok) throw new Error('Error al cargar servicios');
        allServices = await servicesRes.json();

        // Cargar turnos globales
        try {
            const apptsRes = await fetch(`${apiUrl}/appointments?global=1`);
            if (apptsRes.ok) {
                allAppointments = await apptsRes.json();
            }
        } catch (err) {
            console.error('Error al cargar turnos globales:', err);
        }

        // Cargar cola de correos
        try {
            const mailRes = await fetch(`${apiUrl}/mail-queue`);
            if (mailRes.ok) {
                allMailQueue = await mailRes.json();
            }
        } catch (err) {
            console.error('Error al cargar cola de correos:', err);
        }

        // Cargar bloqueos de seguridad para actualizar el badge de seguridad
        try {
            await loadSecurityLocksBadge();
        } catch (err) {
            console.error('Error al cargar badge de bloqueos:', err);
        }

        // Calcular e inyectar KPIs
        updateKPIs();

        // Renderizar tablas
        renderUsers(allUsers);
        renderBusinesses(allBusinesses);
        renderPendingServices(allServices);
        renderAppointments(allAppointments);
        renderMailQueue(allMailQueue);

        // Cargar logs (no bloqueante)
        loadSystemLogs().catch(err => console.error('Error al cargar logs:', err));

    } catch (error) {
        console.error('Error loading admin panel data:', error);
        alert('Hubo un problema al cargar los datos del panel. Por favor intenta recargar la página.');
    }
}

// Actualizar tarjetas de métricas (KPIs)
function updateKPIs() {
    if (kpiUsers) kpiUsers.innerText = allUsers.length;
    if (kpiBusinesses) kpiBusinesses.innerText = allBusinesses.length;
    if (kpiAdmins) {
        const adminCount = allUsers.filter(u => u.role === 'administrator').length;
        kpiAdmins.innerText = adminCount;
    }
    // Actualizar badge de servicios pendientes
    const pendingServices = allServices.filter(s => s.status === 'pending');
    const countBadge = document.getElementById('pendingServicesCount');
    if (countBadge) {
        countBadge.innerText = pendingServices.length;
        countBadge.style.display = pendingServices.length > 0 ? 'inline-block' : 'none';
    }
    // Actualizar badge de correos fallidos
    const failedMails = allMailQueue.filter(m => m.status === 'failed');
    if (failedMailsCount) {
        failedMailsCount.innerText = failedMails.length;
        failedMailsCount.style.display = failedMails.length > 0 ? 'inline-block' : 'none';
    }
}

// Filtrar usuarios
function filterUsers(users, query) {
    if (!query) return users;
    const lowerQuery = query.toLowerCase();
    return users.filter(u =>
        (u.name && u.name.toLowerCase().includes(lowerQuery)) ||
        (u.email && u.email.toLowerCase().includes(lowerQuery)) ||
        (u.id && u.id.toString() === lowerQuery)
    );
}

// Renderizar tabla de usuarios
function renderUsers(users) {
    if (!usersTableBody) return;
    usersTableBody.innerHTML = '';

    if (users.length === 0) {
        usersTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted py-4">No se encontraron usuarios.</td>
            </tr>
        `;
        return;
    }

    for (const u of users) {
        const tr = document.createElement('tr');

        let roleBadgeClass = 'badge badge-client';
        let roleText = 'Cliente';
        if (u.role === 'owner') {
            roleBadgeClass = 'badge badge-owner';
            roleText = 'Dueño';
        } else if (u.role === 'administrator') {
            roleBadgeClass = 'badge badge-admin';
            roleText = 'Admin';
        }

        tr.innerHTML = `
            <td>${u.id}</td>
            <td class="fw-semibold text-dark">${u.name}</td>
            <td>${u.email}</td>
            <td><span class="badge ${roleBadgeClass}">${roleText}</span></td>
            <td>${u.phone || '-'}</td>
            <td style="text-align: center;">
                <select class="form-select form-select-sm select-change-role mx-auto" data-id="${u.id}" style="max-width: 160px; border-radius: 8px;">
                    <option value="client" ${u.role === 'client' ? 'selected' : ''}>Cliente</option>
                    <option value="owner" ${u.role === 'owner' ? 'selected' : ''}>Dueño</option>
                    <option value="administrator" ${u.role === 'administrator' ? 'selected' : ''}>Administrador</option>
                </select>
            </td>
            <td style="text-align: center;">
                <button class="btn btn-outline-danger btn-sm px-3 btn-deactivate-user" data-id="${u.id}" data-name="${u.name}" ${parseInt(u.id, 10) === parseInt(userId, 10) ? 'disabled' : ''} style="border-radius: 8px;">
                    Desactivar
                </button>
            </td>
        `;
        usersTableBody.appendChild(tr);
    }

    // Vincular cambios de rol
    usersTableBody.querySelectorAll('.select-change-role').forEach(select => {
        select.addEventListener('change', async (e) => {
            const targetId = e.target.dataset.id;
            const newRole = e.target.value;

            try {
                const res = await fetch(`${apiUrl}/users`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: targetId, role: newRole })
                });
                const result = await res.json();

                if (res.ok) {
                    // Actualizar el estado local y recargar KPIs
                    const userIdx = allUsers.findIndex(u => u.id == targetId);
                    if (userIdx !== -1) {
                        allUsers[userIdx].role = newRole;
                    }
                    updateKPIs();
                    // Si el admin logueado se cambia de rol a sí mismo (caso extremo, pero posible si no se restringe)
                    if (parseInt(targetId, 10) === parseInt(userId, 10)) {
                        localStorage.setItem('userRole', newRole);
                        if (newRole !== 'administrator') {
                            window.location.href = pageBasePath + '/pagina-inicio';
                            return;
                        }
                    }
                    alert('Rol de usuario actualizado correctamente.');
                    // Re-renderizar la lista completa actual
                    renderUsers(filterUsers(allUsers, userSearchInput.value.trim()));
                } else {
                    alert('Error: ' + result.message);
                    // Revertir selector
                    loadData();
                }
            } catch (err) {
                alert('Error de conexión al actualizar el rol.');
                loadData();
            }
        });
    });

    // Vincular desactivación de usuario
    usersTableBody.querySelectorAll('.btn-deactivate-user').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const targetId = e.target.dataset.id;
            const targetName = e.target.dataset.name;

            if (confirm(`¿Estás seguro de que deseas desactivar temporalmente la cuenta del usuario "${targetName}"?\nEl usuario ya no podrá iniciar sesión.`)) {
                try {
                    const res = await fetch(`${apiUrl}/users?id=${targetId}`, {
                        method: 'DELETE'
                    });
                    const result = await res.json();

                    if (res.ok) {
                        alert('Usuario desactivado correctamente.');
                        // Eliminar usuario de la lista local
                        allUsers = allUsers.filter(u => u.id != targetId);
                        updateKPIs();
                        renderUsers(filterUsers(allUsers, userSearchInput.value.trim()));
                    } else {
                        alert('Error: ' + result.message);
                    }
                } catch (err) {
                    alert('Error de conexión al desactivar usuario.');
                }
            }
        });
    });
}

// Filtrar negocios
function filterBusinesses(businesses, query) {
    if (!query) return businesses;
    const lowerQuery = query.toLowerCase();
    return businesses.filter(b =>
        (b.name && b.name.toLowerCase().includes(lowerQuery)) ||
        (b.address && b.address.toLowerCase().includes(lowerQuery)) ||
        (b.id && b.id.toString() === lowerQuery)
    );
}

// Renderizar tabla de negocios
function renderBusinesses(businesses) {
    if (!businessesTableBody) return;
    businessesTableBody.innerHTML = '';

    if (businesses.length === 0) {
        businessesTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted py-4">No se encontraron negocios registrados.</td>
            </tr>
        `;
        return;
    }

    for (const b of businesses) {
        const tr = document.createElement('tr');
        const initials = (b.name || '').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();

        const logoHtml = b.logo_url
            ? `<img src="${b.logo_url}" class="rounded-circle border" style="width: 38px; height: 38px; object-fit: cover;" alt="${b.name}" onerror="this.outerHTML='<div class=&quot;d-flex align-items-center justify-content-center bg-light text-primary fw-bold rounded-circle border&quot; style=&quot;width: 38px; height: 38px;&quot;>${initials}</div>'">`
            : `<div class="d-flex align-items-center justify-content-center bg-light text-primary fw-bold rounded-circle border" style="width: 38px; height: 38px;">${initials || 'TY'}</div>`;

        tr.innerHTML = `
            <td>${b.id}</td>
            <td>${logoHtml}</td>
            <td class="fw-semibold text-dark">${b.name}</td>
            <td>${b.owner ? `${b.owner.name} <br><small class="text-muted">${b.owner.email}</small>` : 'N/D'}</td>
            <td><small class="text-muted">${b.address || 'No especificada'}</small></td>
            <td style="text-align: center;">
                <button class="btn btn-danger btn-sm px-3 btn-delete-business" data-id="${b.id}" data-name="${b.name}" style="border-radius: 8px;">
                    Eliminar
                </button>
            </td>
        `;
        businessesTableBody.appendChild(tr);
    }

    // Vincular eliminación de negocio
    businessesTableBody.querySelectorAll('.btn-delete-business').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const targetId = e.target.dataset.id;
            const targetName = e.target.dataset.name;

            const confirmMsg = `¡ALERTA MÁXIMA!\n¿Estás seguro de que deseas eliminar permanentemente el negocio "${targetName}"?\n\nEsta acción borrará irrevocablemente todos los turnos, servicios, configuraciones e historial de este negocio en la plataforma.`;

            if (confirm(confirmMsg)) {
                try {
                    const res = await fetch(`${apiUrl}/businesses?id=${targetId}`, {
                        method: 'DELETE'
                    });
                    const result = await res.json();

                    if (res.ok) {
                        alert('Negocio eliminado correctamente.');
                        allBusinesses = allBusinesses.filter(b => b.id != targetId);
                        updateKPIs();
                        renderBusinesses(filterBusinesses(allBusinesses, businessSearchInput.value.trim()));
                    } else {
                        alert('Error: ' + result.message);
                    }
                } catch (err) {
                    alert('Error de conexión al eliminar el negocio.');
                }
            }
        });
    });
}

// Renderizar tabla de servicios pendientes
function renderPendingServices(services) {
    if (!servicesTableBody) return;
    servicesTableBody.innerHTML = '';

    const pending = services.filter(s => s.status === 'pending');

    if (pending.length === 0) {
        servicesTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted py-4">No hay servicios pendientes de aprobación.</td>
            </tr>
        `;
        return;
    }

    for (const s of pending) {
        const tr = document.createElement('tr');
        const bizName = s.business ? s.business.name : 'N/D';
        tr.innerHTML = `
            <td>${s.id}</td>
            <td class="fw-semibold text-dark">${s.name}</td>
            <td><small class="text-muted">${s.description || 'Sin descripción'}</small></td>
            <td><span class="badge bg-light text-secondary">${bizName}</span></td>
            <td>
                <span class="fw-bold text-primary">$${parseFloat(s.price).toFixed(2)}</span>
                <br><small class="text-muted">${s.duration_minutes} min</small>
            </td>
            <td style="text-align: center;">
                <div class="d-flex justify-content-center gap-2">
                    <button class="btn btn-success btn-sm px-3 btn-approve-service" data-id="${s.id}" style="border-radius: 8px;">
                        <i class="bi bi-check-lg"></i> Aprobar
                    </button>
                    <button class="btn btn-outline-danger btn-sm px-3 btn-reject-service" data-id="${s.id}" style="border-radius: 8px;">
                        <i class="bi bi-x-lg"></i> Rechazar
                    </button>
                </div>
            </td>
        `;
        servicesTableBody.appendChild(tr);
    }

    // Vincular botones
    servicesTableBody.querySelectorAll('.btn-approve-service').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const sid = e.currentTarget.dataset.id;
            await updateServiceStatus(sid, 'approved');
        });
    });

    servicesTableBody.querySelectorAll('.btn-reject-service').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const sid = e.currentTarget.dataset.id;
            if (confirm('¿Estás seguro de que deseas rechazar este servicio?')) {
                await updateServiceStatus(sid, 'rejected');
            }
        });
    });
}

// Actualizar estado del servicio
async function updateServiceStatus(id, newStatus) {
    try {
        const res = await fetch(`${apiUrl}/services`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id, status: newStatus })
        });
        const result = await res.json();
        if (res.ok) {
            alert(newStatus === 'approved' ? 'Servicio aprobado con éxito.' : 'Servicio rechazado.');
            await loadData();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (err) {
        alert('Error de conexión con el servidor.');
    }
}

// Filtrar turnos
function filterAppointments(appointments, query) {
    if (!query) return appointments;
    const lowerQuery = query.toLowerCase();
    return appointments.filter(a => {
        const clientName = a.user && a.user.name ? a.user.name.toLowerCase() : '';
        const clientEmail = a.user && a.user.email ? a.user.email.toLowerCase() : '';
        const businessName = a.business && a.business.name ? a.business.name.toLowerCase() : '';
        const serviceName = a.service && a.service.name ? a.service.name.toLowerCase() : '';
        return clientName.includes(lowerQuery) ||
            clientEmail.includes(lowerQuery) ||
            businessName.includes(lowerQuery) ||
            serviceName.includes(lowerQuery) ||
            (a.id && a.id.toString() === lowerQuery);
    });
}

// Filtrar cola de correos
function filterMailQueue(mails, query) {
    if (!query) return mails;
    const lowerQuery = query.toLowerCase();
    return mails.filter(m => {
        const recipientName = m.recipient_name ? m.recipient_name.toLowerCase() : '';
        const recipientEmail = m.recipient_email ? m.recipient_email.toLowerCase() : '';
        const subject = m.subject ? m.subject.toLowerCase() : '';
        const errorMessage = m.error_message ? m.error_message.toLowerCase() : '';
        return recipientName.includes(lowerQuery) ||
            recipientEmail.includes(lowerQuery) ||
            subject.includes(lowerQuery) ||
            errorMessage.includes(lowerQuery) ||
            (m.status && m.status.toLowerCase().includes(lowerQuery)) ||
            (m.id && m.id.toString() === lowerQuery);
    });
}

// Renderizar tabla de turnos globales
function renderAppointments(appointments) {
    if (!appointmentsTableBody) return;
    appointmentsTableBody.innerHTML = '';

    if (appointments.length === 0) {
        appointmentsTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted py-4">No se encontraron turnos.</td>
            </tr>
        `;
        return;
    }

    for (const a of appointments) {
        const tr = document.createElement('tr');

        // Formatear estado con badges bonitos
        let statusBadge = '';
        if (a.status === 'pending') {
            statusBadge = '<span class="badge bg-warning text-dark">Pendiente</span>';
        } else if (a.status === 'completed') {
            statusBadge = '<span class="badge bg-success">Completado</span>';
        } else if (a.status === 'cancelled') {
            statusBadge = '<span class="badge bg-danger">Cancelado</span>';
        } else {
            statusBadge = `<span class="badge bg-secondary">${a.status}</span>`;
        }

        const clientName = a.user ? a.user.name : 'N/D';
        const clientEmail = a.user ? a.user.email : 'N/D';
        const bizName = a.business ? a.business.name : 'N/D';
        const svcName = a.service ? a.service.name : 'N/D';

        // Formatear fecha y hora
        let dateTimeStr = 'N/D';
        if (a.date && a.time) {
            const dateParts = a.date.split('-');
            const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : a.date;
            dateTimeStr = `${formattedDate} - ${a.time.substring(0, 5)} hs`;
        }

        // El admin puede cancelar turnos que no estén completados ni ya cancelados
        const isCancellable = a.status === 'pending';
        const btnHtml = isCancellable
            ? `<button class="btn btn-outline-danger btn-sm px-3 btn-cancel-appointment" data-id="${a.id}" style="border-radius: 8px;">
                   Cancelar
               </button>`
            : '<span class="text-muted small">-</span>';

        tr.innerHTML = `
            <td>${a.id}</td>
            <td>
                <span class="fw-semibold text-dark">${clientName}</span>
                <br><small class="text-muted">${clientEmail}</small>
            </td>
            <td><span class="badge bg-light text-dark border">${bizName}</span></td>
            <td>
                <span>${svcName}</span>
                ${a.service ? `<br><small class="text-muted">$${parseFloat(a.service.price).toFixed(2)} | ${a.service.duration_minutes} min</small>` : ''}
            </td>
            <td class="fw-medium text-secondary">${dateTimeStr}</td>
            <td style="text-align: center;">${statusBadge}</td>
            <td style="text-align: center;">${btnHtml}</td>
        `;
        appointmentsTableBody.appendChild(tr);
    }

    // Vincular botón de cancelar turno
    appointmentsTableBody.querySelectorAll('.btn-cancel-appointment').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const aid = e.target.dataset.id;
            if (confirm(`¿Estás seguro de que deseas cancelar de manera administrativa el turno ID #${aid}?\nSe enviará una notificación y correo al cliente.`)) {
                try {
                    const res = await fetch(`${apiUrl}/appointments?id=${aid}`, {
                        method: 'DELETE'
                    });
                    const result = await res.json();
                    if (res.ok) {
                        alert('Turno cancelado correctamente.');
                        await loadAppointments();
                    } else {
                        alert('Error: ' + result.message);
                    }
                } catch (err) {
                    alert('Error de conexión al cancelar el turno.');
                }
            }
        });
    });
}

// Renderizar tabla de cola de correos
function renderMailQueue(mails) {
    if (!mailQueueTableBody) return;
    mailQueueTableBody.innerHTML = '';

    if (mails.length === 0) {
        mailQueueTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted py-4">No hay correos en la cola.</td>
            </tr>
        `;
        return;
    }

    for (const m of mails) {
        const tr = document.createElement('tr');

        let statusBadge = '';
        if (m.status === 'pending') {
            statusBadge = '<span class="badge bg-info text-dark">Pendiente</span>';
        } else if (m.status === 'sent') {
            statusBadge = '<span class="badge bg-success">Enviado</span>';
        } else if (m.status === 'failed') {
            statusBadge = '<span class="badge bg-danger">Fallido</span>';
        } else {
            statusBadge = `<span class="badge bg-secondary">${m.status}</span>`;
        }

        // Acción de reintentar si falló o está pendiente con intentos
        const canRetry = m.status === 'failed' || (m.status === 'pending' && m.attempts > 0);
        const actionHtml = canRetry
            ? `<button class="btn btn-warning btn-sm px-3 btn-retry-mail text-dark fw-semibold" data-id="${m.id}" style="border-radius: 8px;">
                   Reintentar
               </button>`
            : '<span class="text-muted small">-</span>';

        // Detalle de error o mensaje exitoso
        let errorMsgHtml = '';
        if (m.status === 'failed' && m.error_message) {
            errorMsgHtml = `<div class="text-danger small text-start border p-1 rounded bg-light" style="max-width: 250px; max-height: 80px; overflow-y: auto; font-family: monospace; font-size: 0.75rem;">
                ${escapeHtml(m.error_message)}
            </div>`;
        } else if (m.status === 'sent') {
            errorMsgHtml = '<span class="text-success small"><i class="bi bi-check-circle-fill"></i> Enviado correctamente</span>';
        } else {
            errorMsgHtml = '<span class="text-muted small">Esperando envío...</span>';
        }

        // Formatear fecha última actualización
        let dateStr = 'N/D';
        if (m.updated_at) {
            const parts = m.updated_at.split(' ');
            if (parts.length === 2) {
                const dateParts = parts[0].split('-');
                const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}` : parts[0];
                dateStr = `${formattedDate} ${parts[1].substring(0, 5)}`;
            } else {
                dateStr = m.updated_at;
            }
        }

        tr.innerHTML = `
            <td>${m.id}</td>
            <td>
                <span class="fw-semibold text-dark">${escapeHtml(m.recipient_name || 'N/D')}</span>
                <br><small class="text-muted">${escapeHtml(m.recipient_email || 'N/D')}</small>
            </td>
            <td class="text-truncate" style="max-width: 150px;" title="${escapeHtml(m.subject)}">${m.subject}</td>
            <td class="text-center font-monospace">${m.attempts}</td>
            <td><small class="text-muted">${dateStr}</small></td>
            <td style="text-align: center;">${statusBadge}</td>
            <td>${errorMsgHtml}</td>
            <td style="text-align: center;">${actionHtml}</td>
        `;
        mailQueueTableBody.appendChild(tr);
    }

    // Vincular botón de reintentar
    mailQueueTableBody.querySelectorAll('.btn-retry-mail').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const mid = e.target.dataset.id;
            try {
                e.target.disabled = true;
                e.target.innerText = 'Enviando...';

                const res = await fetch(`${apiUrl}/mail-queue`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'retry', id: mid })
                });
                const result = await res.json();

                if (res.ok) {
                    alert('El correo ha sido encolado y el procesador de envíos ha sido activado.');
                    await loadMailQueue();
                } else {
                    alert('Error: ' + result.message);
                    e.target.disabled = false;
                    e.target.innerText = 'Reintentar';
                }
            } catch (err) {
                alert('Error de conexión al reintentar enviar el correo.');
                e.target.disabled = false;
                e.target.innerText = 'Reintentar';
            }
        });
    });
}

// Cargar cola de correos desde la API
async function loadMailQueue() {
    try {
        const mailRes = await fetch(`${apiUrl}/mail-queue`);
        if (mailRes.ok) {
            allMailQueue = await mailRes.json();
            updateKPIs();
            renderMailQueue(allMailQueue);
        }
    } catch (err) {
        console.error('Error al recargar cola de correos:', err);
    }
}

// Cargar turnos globales desde la API
async function loadAppointments() {
    try {
        const apptsRes = await fetch(`${apiUrl}/appointments?global=1`);
        if (apptsRes.ok) {
            allAppointments = await apptsRes.json();
            renderAppointments(allAppointments);
        }
    } catch (err) {
        console.error('Error al recargar turnos globales:', err);
    }
}

// Cargar logs del sistema
async function loadSystemLogs() {
    if (appLogsConsole) appLogsConsole.innerText = 'Cargando logs de aplicación...';
    if (mailLogsConsole) mailLogsConsole.innerText = 'Cargando logs de correo...';

    try {
        const res = await fetch(`${apiUrl}/system-logs`);
        if (res.ok) {
            const data = await res.json();
            if (appLogsConsole) {
                appLogsConsole.innerText = data.app_logs && data.app_logs.length > 0
                    ? data.app_logs.join('\n')
                    : 'No hay logs de aplicación disponibles.';
                appLogsConsole.scrollTop = appLogsConsole.scrollHeight;
            }
            if (mailLogsConsole) {
                mailLogsConsole.innerText = data.mail_logs && data.mail_logs.length > 0
                    ? data.mail_logs.join('\n')
                    : 'No hay logs de correo disponibles.';
                mailLogsConsole.scrollTop = mailLogsConsole.scrollHeight;
            }
        } else {
            const errMsg = 'Error al cargar logs del servidor.';
            if (appLogsConsole) appLogsConsole.innerText = errMsg;
            if (mailLogsConsole) mailLogsConsole.innerText = errMsg;
        }
    } catch (err) {
        const errMsg = 'Error de conexión al cargar logs.';
        if (appLogsConsole) appLogsConsole.innerText = errMsg;
        if (mailLogsConsole) mailLogsConsole.innerText = errMsg;
    }
}

// Helper para escapar HTML en JS
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function (m) { return map[m]; });
}

// NUEVAS FUNCIONES PARA ESTADÍSTICAS Y SEGURIDAD

async function loadSystemStats() {
    const container = document.getElementById('statsTopBusinessesTable');
    if (container) {
        container.innerHTML = '<tr><td colspan="3" class="text-center py-4"><div class="spinner-border spinner-border-sm text-primary" role="status"></div> Cargando estadísticas...</td></tr>';
    }

    try {
        const res = await fetch(`${apiUrl}/system-stats`);
        if (!res.ok) throw new Error('Error de servidor al obtener estadísticas');
        const data = await res.json();
        renderStats(data);
    } catch (err) {
        console.error('Error loading stats:', err);
        alert('No se pudieron cargar las estadísticas del sistema.');
    }
}

function renderStats(data) {
    // 1. Users by Role
    const users = data.users || { total: 0, clients: 0, owners: 0, admins: 0 };
    const totalUsers = users.total || 1;

    const clientPct = ((users.clients / totalUsers) * 100).toFixed(1);
    const ownerPct = ((users.owners / totalUsers) * 100).toFixed(1);
    const adminPct = ((users.admins / totalUsers) * 100).toFixed(1);

    document.getElementById('statsClientsCount').innerText = `${users.clients} (${clientPct}%)`;
    document.getElementById('statsOwnersCount').innerText = `${users.owners} (${ownerPct}%)`;
    document.getElementById('statsAdminsCount').innerText = `${users.admins} (${adminPct}%)`;

    document.getElementById('statsClientsProgress').style.width = `${clientPct}%`;
    document.getElementById('statsOwnersProgress').style.width = `${ownerPct}%`;
    document.getElementById('statsAdminsProgress').style.width = `${adminPct}%`;

    // 2. Efficiency of Appointments
    const appts = data.appointments || { total: 0, pending: 0, completed: 0, cancelled: 0 };
    document.getElementById('statsApptsTotal').innerText = appts.total;
    document.getElementById('statsApptsPending').innerText = appts.pending;
    document.getElementById('statsApptsCompleted').innerText = appts.completed;
    document.getElementById('statsApptsCancelled').innerText = appts.cancelled;

    const completedOrCancelled = appts.completed + appts.cancelled;
    let successRate = 0;
    if (completedOrCancelled > 0) {
        successRate = ((appts.completed / completedOrCancelled) * 100).toFixed(1);
    } else if (appts.completed > 0) {
        successRate = 100;
    }
    document.getElementById('statsApptsSuccessRate').innerText = `${successRate}%`;

    // 3. Quality & Services
    const reviews = data.reviews || { total: 0, average: 0 };
    document.getElementById('statsAvgRating').innerText = parseFloat(reviews.average).toFixed(2);
    document.getElementById('statsReviewsCount').innerText = reviews.total;

    const starsContainer = document.getElementById('statsStarsContainer');
    if (starsContainer) {
        starsContainer.innerHTML = '';
        const rating = parseFloat(reviews.average) || 0;
        for (let i = 1; i <= 5; i++) {
            const star = document.createElement('i');
            if (i <= rating) {
                star.className = 'bi bi-star-fill text-warning fs-5 me-1';
            } else if (i - 0.5 <= rating) {
                star.className = 'bi bi-star-half text-warning fs-5 me-1';
            } else {
                star.className = 'bi bi-star text-muted fs-5 me-1';
            }
            starsContainer.appendChild(star);
        }
    }

    const services = data.services || { total: 0, pending: 0, approved: 0, rejected: 0 };
    document.getElementById('statsServicesApproved').innerText = services.approved;
    document.getElementById('statsServicesPending').innerText = services.pending;
    document.getElementById('statsServicesRejected').innerText = services.rejected;

    // 4. Top 5 businesses
    const topBizTable = document.getElementById('statsTopBusinessesTable');
    if (topBizTable) {
        topBizTable.innerHTML = '';
        const topBiz = data.top_businesses || [];
        if (topBiz.length === 0) {
            topBizTable.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-3">No hay registros de reservas en el sistema.</td></tr>';
        } else {
            topBiz.forEach((biz, index) => {
                const tr = document.createElement('tr');
                let trophy = '';
                if (index === 0) trophy = '🥇 ';
                else if (index === 1) trophy = '🥈 ';
                else if (index === 2) trophy = '🥉 ';

                tr.innerHTML = `
                    <td class="fw-semibold">${index + 1}</td>
                    <td class="fw-medium text-dark">${trophy}${escapeHtml(biz.name)}</td>
                    <td class="text-end fw-bold text-primary">${biz.appointments_count}</td>
                `;
                topBizTable.appendChild(tr);
            });
        }
    }

    // 5. DB Table Sizes
    const dbTable = document.getElementById('statsDbSizesTable');
    let totalDbSize = 0;
    if (dbTable) {
        dbTable.innerHTML = '';
        const sizes = data.table_sizes || [];
        if (sizes.length === 0) {
            dbTable.innerHTML = '<tr><td colspan="2" class="text-center text-muted py-3">No se pudieron recuperar los tamaños de las tablas.</td></tr>';
        } else {
            sizes.forEach(sz => {
                totalDbSize += parseFloat(sz.size_mb);
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="font-monospace text-secondary">${escapeHtml(sz.table)}</td>
                    <td class="text-end fw-bold font-monospace">${parseFloat(sz.size_mb).toFixed(2)} MB</td>
                `;
                dbTable.appendChild(tr);
            });
        }
    }
    const totalSizeEl = document.getElementById('statsDbTotalSize');
    if (totalSizeEl) {
        totalSizeEl.innerText = `${totalDbSize.toFixed(2)} MB`;
    }
}

async function loadSecurityLocks() {
    try {
        const res = await fetch(`${apiUrl}/security-locks`);
        if (res.ok) {
            allSecurityLocks = await res.json();
            updateSecurityBadge();
            renderSecurityLocks(allSecurityLocks);
        }
    } catch (err) {
        console.error('Error al cargar bloqueos de seguridad:', err);
    }
}

async function loadSecurityLocksBadge() {
    try {
        const res = await fetch(`${apiUrl}/security-locks`);
        if (res.ok) {
            allSecurityLocks = await res.json();
            updateSecurityBadge();
        }
    } catch (err) {
        console.error('Error al actualizar el badge de seguridad:', err);
    }
}

function updateSecurityBadge() {
    if (lockedAccountsCount) {
        const activeLocks = allSecurityLocks.filter(l => l.is_locked).length;
        lockedAccountsCount.innerText = activeLocks;
        lockedAccountsCount.style.display = activeLocks > 0 ? 'inline-block' : 'none';
    }
}

function renderSecurityLocks(locks) {
    if (!lockedAccountsTableBody) return;
    lockedAccountsTableBody.innerHTML = '';

    if (locks.length === 0) {
        lockedAccountsTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted py-4">No hay bloqueos ni intentos fallidos registrados.</td>
            </tr>
        `;
        return;
    }

    locks.forEach(l => {
        const tr = document.createElement('tr');

        let statusBadge = '';
        let buttonHtml = '';

        if (l.is_locked) {
            statusBadge = `<span class="badge bg-danger">Bloqueado (${l.remaining_seconds}s restantes)</span>`;
            buttonHtml = `<button class="btn btn-success btn-sm btn-unlock-account px-3 w-100" data-id="${l.id}" data-email="${escapeHtml(l.email)}" style="border-radius: 8px;">
                Desbloquear
            </button>`;
        } else {
            statusBadge = `<span class="badge bg-warning text-dark">Intentos acumulados</span>`;
            buttonHtml = `<button class="btn btn-outline-secondary btn-sm btn-unlock-account px-3 w-100" data-id="${l.id}" data-email="${escapeHtml(l.email)}" style="border-radius: 8px;">
                Limpiar
            </button>`;
        }

        tr.innerHTML = `
            <td>
                <span class="fw-semibold text-dark">${escapeHtml(l.email)}</span>
                <br><small class="text-muted font-monospace">MD5: ${l.id}</small>
            </td>
            <td class="text-center fw-bold">${l.attempts}</td>
            <td><small class="text-muted">${l.reset_time}</small></td>
            <td>${statusBadge} ${l.locked_until ? `<br><small class="text-muted">Expira: ${l.locked_until}</small>` : ''}</td>
            <td class="text-center">${buttonHtml}</td>
        `;
        lockedAccountsTableBody.appendChild(tr);
    });

    // Vincular botones de desbloqueo
    lockedAccountsTableBody.querySelectorAll('.btn-unlock-account').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.dataset.id;
            const email = e.target.dataset.email;
            if (confirm(`¿Estás seguro de que deseas desbloquear y reestablecer los intentos fallidos para la cuenta "${email}"?`)) {
                try {
                    const res = await fetch(`${apiUrl}/security-locks?id=${id}`, {
                        method: 'DELETE'
                    });
                    const result = await res.json();
                    if (res.ok) {
                        alert(result.message || 'Cuenta reactivada.');
                        await loadSecurityLocks();
                    } else {
                        alert('Error: ' + result.message);
                    }
                } catch (err) {
                    alert('Error al conectar con el servidor.');
                }
            }
        });
    });
}

function filterSecurityLocks(locks, query) {
    if (!query) return locks;
    const lowerQuery = query.toLowerCase();
    return locks.filter(l =>
        (l.email && l.email.toLowerCase().includes(lowerQuery)) ||
        (l.id && l.id.toLowerCase().includes(lowerQuery))
    );
}

// Inicializar al cargar el DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminPanel);
} else {
    initAdminPanel();
}
