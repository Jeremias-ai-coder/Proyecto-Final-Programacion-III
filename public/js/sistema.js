// URL base de la API RESTful
const pageBasePath = (function() {
    try {
        const pathname = window.location.pathname;
        const parts = pathname.split('/');
        const knownPages = ['pagina-inicio','client','crear-negocio','agregar-horario','login','dashboard','registro','api','sistema','admin'];
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

// Elementos del DOM
const kpiUsers = document.getElementById('kpiUsers');
const kpiBusinesses = document.getElementById('kpiBusinesses');
const kpiAdmins = document.getElementById('kpiAdmins');

const usersTableBody = document.getElementById('usersTableBody');
const businessesTableBody = document.getElementById('businessesTableBody');

const userSearchInput = document.getElementById('userSearchInput');
const businessSearchInput = document.getElementById('businessSearchInput');
const logoutBtn = document.getElementById('logoutBtn');

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

        // Calcular e inyectar KPIs
        updateKPIs();

        // Renderizar tablas
        renderUsers(allUsers);
        renderBusinesses(allBusinesses);

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
        const initials = (b.name || '').split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase();

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

// Inicializar al cargar el DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminPanel);
} else {
    initAdminPanel();
}
