/**
 * Turnos Ya - Sistema de Notificaciones Premium (In-App & Toasts)
 */
(function() {
    // Configuración base
    const POLL_INTERVAL = 20000; // 20 segundos
    let lastUnreadCount = 0;
    let isInitialLoad = true;

    // Obtener ruta base
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

    const NotificationSystem = {
        userId: localStorage.getItem('userId') || null,

        init() {
            this.userId = this.userId || (window.userId ? window.userId : null);

            // Dibujar barra de usuario (si existe el contenedor)
            this.initNavbar();

            if (!this.userId) return;

            // Iniciar polling
            this.fetchNotifications();
            setInterval(() => this.fetchNotifications(), POLL_INTERVAL);

            // Registrar eventos de interfaz
            this.bindEvents();
        },

        async initNavbar() {
            const navbarActions = document.getElementById('navbarActions');
            if (!navbarActions) return;

            const userId = this.userId;
            const userRole = localStorage.getItem('userRole');

            if (!userId) {
                navbarActions.innerHTML = `
                    <div class="d-flex gap-2">
                        <a class="btn btn-light btn-sm fw-semibold text-primary px-3" href="${pageBasePath}/login">Iniciar Sesión</a>
                        <a class="btn btn-outline-light btn-sm fw-semibold px-3" href="${pageBasePath}/registro">Crear Cuenta</a>
                    </div>
                `;
                return;
            }

            try {
                const res = await fetch(`${apiUrl}/users?id=${userId}`);
                if (res.ok) {
                    const u = await res.json();
                    const initials = (u.name || '').split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase();
                    
                    // Opciones de rol
                    let roleOptions = '';
                    const resolvedRole = userRole || u.role;
                    if (resolvedRole === 'owner' || resolvedRole === 'staff') {
                        roleOptions = `
                            <li>
                                <a class="dropdown-item py-2 fw-semibold d-flex align-items-center gap-2" href="${pageBasePath}/dashboard">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-briefcase-fill text-muted" viewBox="0 0 16 16">
                                        <path d="M6.5 1A1.5 1.5 0 0 0 5 2.5V3H1.5A1.5 1.5 0 0 0 0 4.5v1.384l7.614 2.03a1.5 1.5 0 0 0 .772 0L16 5.884V4.5A1.5 1.5 0 0 0 14.5 3H11v-.5A1.5 1.5 0 0 0 9.5 1h-3zm0 1h3a.5.5 0 0 1 .5.5V3H6v-.5a.5.5 0 0 1 .5-.5z"/>
                                        <path d="M0 12.5A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5V6.85L8.129 8.947a.5.5 0 0 1-.258 0L0 6.85v5.65z"/>
                                    </svg>
                                    ${resolvedRole === 'staff' ? 'Panel de Empleado' : 'Gestionar mis negocios'}
                                </a>
                            </li>
                        `;
                    } else if (resolvedRole === 'administrator') {
                        roleOptions = `
                            <li>
                                <a class="dropdown-item py-2 fw-semibold text-danger d-flex align-items-center gap-2" href="${pageBasePath}/sistema">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-shield-lock-fill text-danger" viewBox="0 0 16 16">
                                        <path fill-rule="evenodd" d="M8 0c-.69 0-1.843.265-2.928.56-1.11.3-2.229.655-2.887.87a1.54 1.54 0 0 0-1.044 1.262c-.596 4.477.787 7.795 2.465 9.99 1.679 2.196 3.7 3.28 4.016 3.43a.498.498 0 0 0 .376 0c.315-.15 2.337-1.034 4.016-3.43 1.678-2.195 3.061-5.513 2.466-9.99a1.54 1.54 0 0 0-1.044-1.263 62.439 62.439 0 0 0-2.887-.87C9.843.266 8.69 0 8 0zm0 5a1.5 1.5 0 0 1 .5 2.915V9a.5.5 0 0 1-1 0V7.915A1.5 1.5 0 0 1 8 5z"/>
                                    </svg>
                                    Panel de Control
                                </a>
                            </li>
                        `;
                    } else {
                        roleOptions = `
                            <li>
                                <a class="dropdown-item py-2 fw-semibold d-flex align-items-center gap-2" href="${pageBasePath}/crear-negocio">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-plus-circle-fill text-muted" viewBox="0 0 16 16">
                                        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8.5 4.5a.5.5 0 0 0-1 0v3h-3a.5.5 0 0 0 0 1h3v3a.5.5 0 0 0 1 0v-3h3a.5.5 0 0 0 0-1h-3v-3z"/>
                                    </svg>
                                    Registrar mi negocio
                                </a>
                            </li>
                        `;
                    }

                    navbarActions.innerHTML = `
                        <!-- Dropdown de Notificaciones -->
                        <div class="dropdown me-2 position-relative">
                            <button class="btn btn-link text-white p-1 position-relative border-0 shadow-none text-decoration-none" type="button" id="notificationBell" data-bs-toggle="dropdown" aria-expanded="false" style="display: flex; align-items: center; justify-content: center; height: 32px; width: 32px; border-radius: 50%; background: rgba(255,255,255,0.15);">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-bell-fill" viewBox="0 0 16 16">
                                    <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2zm.995-14.901a1 1 0 1 0-1.99 0A5.002 5.002 0 0 0 3 6c0 1.098-.5 6-2 7h14c-1.5-1-2-5.902-2-7 0-2.42-1.72-4.44-4.005-4.901z"/>
                                </svg>
                                <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger d-none" id="notificationBadge" style="font-size: 0.6rem; padding: 0.25em 0.45em;">0</span>
                            </button>
                            <div class="dropdown-menu dropdown-menu-end shadow border-0 p-0 mt-2" id="notificationMenu" style="border-radius: 12px; width: 320px; max-height: 400px; overflow: hidden; z-index: 1100;" aria-labelledby="notificationBell">
                                <div class="p-3 border-bottom d-flex justify-content-between align-items-center bg-light">
                                    <span class="fw-bold text-dark" style="font-size: 0.9rem;">Notificaciones</span>
                                    <button class="btn btn-link text-primary p-0 btn-sm text-decoration-none fw-semibold" id="btnMarkAllRead" style="font-size: 0.8rem;">Marcar leídas</button>
                                </div>
                                <div id="notificationList" style="max-height: 320px; overflow-y: auto;">
                                    <div class="text-center py-4 text-muted small">Cargando notificaciones...</div>
                                </div>
                            </div>
                        </div>

                        <div class="dropdown">
                            <button class="btn btn-link text-white text-decoration-none dropdown-toggle d-flex align-items-center gap-2 p-0 border-0 shadow-none" type="button" id="userMenuButton" data-bs-toggle="dropdown" aria-expanded="false">
                                <div class="user-avatar-circle-nav">${initials || 'U'}</div>
                                <span class="fw-semibold small d-none d-sm-inline">${u.name}</span>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end shadow border-0 mt-2 py-2" aria-labelledby="userMenuButton" style="border-radius: 12px; min-width: 210px; z-index: 1100;">
                                <li>
                                    <div class="px-3 py-2 text-truncate" style="max-width: 210px;">
                                        <div class="fw-bold text-dark small" style="line-height: 1.2;">${u.name}</div>
                                        <span class="text-muted" style="font-size: 0.75rem;">${u.email}</span>
                                    </div>
                                </li>
                                <li><hr class="dropdown-divider my-1"></li>
                                <li>
                                    <button class="dropdown-item py-2 fw-semibold d-flex align-items-center gap-2 border-0 bg-transparent text-start w-100" id="btnNavbarGoToProfile">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-person-fill text-muted" viewBox="0 0 16 16">
                                            <path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3Zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/>
                                        </svg>
                                        Mi Perfil
                                    </button>
                                </li>
                                <li>
                                    <button class="dropdown-item py-2 fw-semibold d-flex align-items-center gap-2 border-0 bg-transparent text-start w-100" id="btnNavbarGoToAppointments">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-calendar-check-fill text-muted" viewBox="0 0 16 16">
                                            <path d="M4 .5a.5.5 0 0 0-1 0V1H2a2 2 0 0 0-2 2v1h16V3a2 2 0 0 0-2-2h-1V.5a.5.5 0 0 0-1 0V1H4V.5zM16 14a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V5h16v9zm-5.146-5.146a.5.5 0 0 0-.708-.708L8 10.293 6.854 9.146a.5.5 0 1 0-.708.708L7.293 11l-1.147 1.146a.5.5 0 0 0 .708.708L8 11.707l1.146 1.147a.5.5 0 0 0 .708-.708L8.707 11l1.147-1.146z"/>
                                        </svg>
                                        Mis Turnos
                                    </button>
                                </li>
                                ${roleOptions}
                                <li><hr class="dropdown-divider my-1"></li>
                                <li>
                                    <button class="dropdown-item py-2 fw-semibold text-danger d-flex align-items-center gap-2 border-0 bg-transparent text-start w-100" id="btnNavbarLogout">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-box-arrow-right text-danger" viewBox="0 0 16 16">
                                            <path fill-rule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0v2z"/>
                                            <path fill-rule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3z"/>
                                        </svg>
                                        Cerrar Sesión
                                    </button>
                                </li>
                            </ul>
                        </div>
                    `;

                    // Forzar carga de notificaciones ya que dibujamos el badge/lista
                    this.fetchNotifications();
                } else {
                    if (res.status === 401 || res.status === 403) {
                        localStorage.clear();
                        window.location.reload();
                        return;
                    }
                    navbarActions.innerHTML = `<span class="text-white fw-semibold small">Usuario desconocido</span>`;
                }
            } catch (error) {
                console.error('Error rendering user navbar profile dropdown:', error);
            }
        },

        bindEvents() {
            // Delegación de click a nivel de documento para soportar elementos renderizados dinámicamente
            document.addEventListener('click', async (e) => {
                // Notificación individual
                const item = e.target.closest('.notification-item');
                if (item) {
                    const id = item.dataset.id;
                    const isRead = item.dataset.read === '1';
                    if (!isRead && id) {
                        await this.markAsRead(id, item);
                    }
                }

                // Marcar todas como leídas
                const btnMarkAll = e.target.closest('#btnMarkAllRead');
                if (btnMarkAll) {
                    e.preventDefault();
                    e.stopPropagation();
                    await this.markAllAsRead();
                }

                // Clic en "Mi Perfil"
                const btnProfile = e.target.closest('#btnNavbarGoToProfile');
                if (btnProfile) {
                    e.preventDefault();
                    const isClientPage = window.location.pathname.endsWith('/pagina-inicio') || window.location.pathname.endsWith('/client');
                    if (isClientPage && typeof window.showSection === 'function') {
                        window.showSection('profile');
                    } else {
                        window.location.href = `${pageBasePath}/pagina-inicio?section=profile`;
                    }
                }

                // Clic en "Mis Turnos"
                const btnAppointments = e.target.closest('#btnNavbarGoToAppointments');
                if (btnAppointments) {
                    e.preventDefault();
                    const isClientPage = window.location.pathname.endsWith('/pagina-inicio') || window.location.pathname.endsWith('/client');
                    if (isClientPage && typeof window.showSection === 'function') {
                        window.showSection('appointments');
                    } else {
                        window.location.href = `${pageBasePath}/pagina-inicio?section=appointments`;
                    }
                }

                // Clic en "Cerrar Sesión" del navbar
                const btnLogout = e.target.closest('#btnNavbarLogout');
                if (btnLogout) {
                    e.preventDefault();
                    try {
                        await fetch(`${apiUrl}/logout`, { method: 'POST' });
                    } catch (err) {
                        console.error('Error closing session on server', err);
                    }
                    localStorage.clear();
                    alert('Sesión cerrada con éxito.');
                    window.location.href = `${pageBasePath}/pagina-inicio`;
                }
            });
        },

        async fetchNotifications() {
            if (!this.userId) return;
            try {
                const res = await fetch(`${apiUrl}/notifications`);
                if (res.ok) {
                    const notifications = await res.json();
                    this.renderNotifications(notifications);
                }
            } catch (err) {
                console.warn('Error al obtener notificaciones:', err);
            }
        },

        renderNotifications(notifications) {
            const badge = document.getElementById('notificationBadge');
            const list = document.getElementById('notificationList');
            if (!list) return;

            const unread = notifications.filter(n => !n.is_read);
            const unreadCount = unread.length;

            // Actualizar badge
            if (badge) {
                if (unreadCount > 0) {
                    badge.innerText = unreadCount > 9 ? '9+' : unreadCount;
                    badge.classList.remove('d-none');
                    
                    // Si hay nuevas notificaciones no leídas que no conocíamos, hacer vibrar la campana visualmente
                    if (unreadCount > lastUnreadCount) {
                        this.jiggleBell();
                        
                        // Solo reproducir sonido y mostrar Toast si no es la carga inicial
                        if (!isInitialLoad) {
                            this.playNotificationSound();
                            
                            const newNotifs = unread.filter(n => !document.querySelector(`.notification-item[data-id="${n.id}"]`));
                            newNotifs.forEach(n => {
                                this.showToast(n.title, n.message, n.type);
                            });

                            // Refrescar la planilla de turnos (agenda) en el dashboard
                            if (typeof window.loadAgenda === 'function') {
                                window.loadAgenda();
                            }
                        }
                    }
                } else {
                    badge.classList.add('d-none');
                }
            }
            lastUnreadCount = unreadCount;
            isInitialLoad = false;

            // Generar lista
            if (notifications.length === 0) {
                list.innerHTML = `
                    <div class="text-center py-4 text-muted small">
                        <i class="bi bi-bell-slash fs-4 d-block mb-2 text-secondary"></i>
                        No tienes notificaciones
                    </div>
                `;
                return;
            }

            list.innerHTML = notifications.map(n => {
                const icon = this.getTypeIcon(n.type);
                const timeStr = this.formatTime(n.created_at);
                const unreadClass = !n.is_read ? 'bg-light fw-semibold border-start border-primary border-3' : '';
                return `
                    <div class="notification-item p-3 border-bottom d-flex gap-3 align-items-start ${unreadClass}" 
                         style="cursor: pointer; transition: background 0.2s; min-height: 65px;" 
                         data-id="${n.id}" 
                         data-read="${n.is_read ? '1' : '0'}">
                        <div class="mt-1 flex-shrink-0">${icon}</div>
                        <div class="flex-grow-1" style="min-width: 0;">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <span class="text-dark small fw-bold text-truncate">${n.title}</span>
                                <span class="text-muted" style="font-size: 0.7rem;">${timeStr}</span>
                            </div>
                            <p class="mb-0 text-muted small text-wrap" style="line-height: 1.3; font-size: 0.8rem;">${n.message}</p>
                        </div>
                    </div>
                `;
            }).join('');
        },

        async markAsRead(id, element) {
            try {
                const res = await fetch(`${apiUrl}/notifications`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: id })
                });
                if (res.ok) {
                    if (element) {
                        element.classList.remove('bg-light', 'fw-semibold', 'border-start', 'border-primary', 'border-3');
                        element.dataset.read = '1';
                    }
                    this.fetchNotifications();
                }
            } catch (err) {
                console.error('Error al marcar notificación como leída:', err);
            }
        },

        async markAllAsRead() {
            try {
                const res = await fetch(`${apiUrl}/notifications`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: 'all' })
                });
                if (res.ok) {
                    this.fetchNotifications();
                }
            } catch (err) {
                console.error('Error al marcar todas las notificaciones como leídas:', err);
            }
        },

        jiggleBell() {
            const bellBtn = document.getElementById('notificationBell');
            if (!bellBtn) return;
            bellBtn.classList.add('jiggle');
            setTimeout(() => bellBtn.classList.remove('jiggle'), 1000);
        },

        getTypeIcon(type) {
            switch(type) {
                case 'success':
                    return '<i class="bi bi-check-circle-fill text-success"></i>';
                case 'warning':
                    return '<i class="bi bi-exclamation-triangle-fill text-warning"></i>';
                case 'danger':
                    return '<i class="bi bi-exclamation-octagon-fill text-danger"></i>';
                case 'info':
                default:
                    return '<i class="bi bi-info-circle-fill text-primary"></i>';
            }
        },

        formatTime(dateStr) {
            try {
                const d = new Date(dateStr.replace(/-/g, '/'));
                const now = new Date();
                
                const isToday = d.getDate() === now.getDate() &&
                                d.getMonth() === now.getMonth() &&
                                d.getFullYear() === now.getFullYear();
                
                const hours = String(d.getHours()).padStart(2, '0');
                const minutes = String(d.getMinutes()).padStart(2, '0');
                
                if (isToday) {
                    return `Hoy, ${hours}:${minutes}`;
                } else {
                    const day = String(d.getDate()).padStart(2, '0');
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    return `${day}/${month} ${hours}:${minutes}`;
                }
            } catch (e) {
                return '';
            }
        },

        playNotificationSound() {
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (!AudioContext) return;
                
                const ctx = new AudioContext();
                
                // Primer tono (agudo, corto)
                const osc1 = ctx.createOscillator();
                const gain1 = ctx.createGain();
                osc1.type = 'sine';
                osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
                gain1.gain.setValueAtTime(0.08, ctx.currentTime);
                gain1.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
                osc1.connect(gain1);
                gain1.connect(ctx.destination);
                osc1.start();
                osc1.stop(ctx.currentTime + 0.15);
                
                // Segundo tono (más agudo, un poco después)
                setTimeout(() => {
                    try {
                        const osc2 = ctx.createOscillator();
                        const gain2 = ctx.createGain();
                        osc2.type = 'sine';
                        osc2.frequency.setValueAtTime(880, ctx.currentTime); // A5
                        gain2.gain.setValueAtTime(0.08, ctx.currentTime);
                        gain2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
                        osc2.connect(gain2);
                        gain2.connect(ctx.destination);
                        osc2.start();
                        osc2.stop(ctx.currentTime + 0.25);
                    } catch (e) {
                        console.warn('AudioContext sound 2 failed', e);
                    }
                }, 120);
            } catch (err) {
                console.warn('Web Audio API blocked or not supported:', err);
            }
        },

        /**
         * Renderiza Toasts Premium Dinámicos
         */
        showToast(title, message, type = 'success') {
            let container = document.getElementById('toastContainer');
            if (!container) {
                container = document.createElement('div');
                container.id = 'toastContainer';
                container.className = 'position-fixed top-0 end-0 p-3';
                container.style.zIndex = '1090';
                document.body.appendChild(container);
            }

            const toast = document.createElement('div');
            toast.className = 'toast-premium shadow border-0 d-flex align-items-center mb-2';
            
            // Colores por tipo
            let borderLeftColor = '#009ee3'; // info
            let bgLight = '#f8fafc';
            if (type === 'success') borderLeftColor = '#10b981';
            else if (type === 'warning') borderLeftColor = '#f59e0b';
            else if (type === 'danger') borderLeftColor = '#ef4444';

            toast.style.background = bgLight;
            toast.style.borderLeft = `5px solid ${borderLeftColor}`;
            toast.style.borderRadius = '8px';
            toast.style.padding = '12px 16px';
            toast.style.minWidth = '300px';
            toast.style.maxWidth = '360px';
            toast.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)';
            toast.style.transition = 'all 300ms cubic-bezier(0.16, 1, 0.3, 1)';
            toast.style.transform = 'translateX(120%)';
            toast.style.opacity = '0';
            
            const icon = this.getTypeIcon(type);

            toast.innerHTML = `
                <div class="d-flex align-items-start gap-3 w-100">
                    <div class="fs-5 mt-1 flex-shrink-0">${icon}</div>
                    <div class="flex-grow-1" style="min-width: 0;">
                        <div class="fw-bold text-dark small mb-1">${title}</div>
                        <div class="text-muted small text-wrap" style="font-size: 0.8rem; line-height: 1.3;">${message}</div>
                    </div>
                    <button type="button" class="btn-close ms-auto btn-close-toast align-self-start" style="font-size: 0.75rem; opacity: 0.5; padding: 2px; box-shadow:none; border:none; background:none; cursor:pointer;">✕</button>
                </div>
            `;

            container.appendChild(toast);

            // Animación de entrada
            requestAnimationFrame(() => {
                toast.style.transform = 'translateX(0)';
                toast.style.opacity = '1';
            });

            // Manejador de cierre manual
            const closeBtn = toast.querySelector('.btn-close-toast');
            const dismissToast = () => {
                toast.style.transform = 'translateX(120%)';
                toast.style.opacity = '0';
                setTimeout(() => {
                    try { container.removeChild(toast); } catch(e) {}
                }, 300);
            };

            if (closeBtn) {
                closeBtn.addEventListener('click', dismissToast);
            }

            // Auto descarte
            setTimeout(dismissToast, 5000);
        }
    };

    // Estilos CSS dinámicos de las notificaciones
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes jiggle {
            0% { transform: rotate(0); }
            15% { transform: rotate(15deg); }
            30% { transform: rotate(-15deg); }
            45% { transform: rotate(10deg); }
            60% { transform: rotate(-10deg); }
            75% { transform: rotate(4deg); }
            85% { transform: rotate(-4deg); }
            100% { transform: rotate(0); }
        }
        .jiggle {
            animation: jiggle 1s ease-in-out;
        }
        .notification-item:hover {
            background-color: #f8fafc;
        }
        #notificationMenu::-webkit-scrollbar {
            width: 6px;
        }
        #notificationMenu::-webkit-scrollbar-track {
            background: #f1f5f9;
        }
        #notificationMenu::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 3px;
        }
        #notificationMenu::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
        }
        .user-avatar-circle-nav {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background-color: #ffffff;
            color: #009ee3;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.05rem;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
            transition: transform 0.15s ease;
        }
        .user-avatar-circle-nav:hover {
            transform: scale(1.05);
        }
        .dropdown-menu .dropdown-item:active {
            background-color: #009ee3 !important;
        }
        @media (max-width: 767.98px) {
            .dropdown-menu-end {
                position: absolute !important;
                top: 100% !important;
                left: 50% !important;
                right: auto !important;
                transform: translate3d(-50%, 8px, 0px) !important;
            }
            #notificationMenu {
                width: 290px !important;
                max-width: calc(100vw - 24px) !important;
            }
        }
    `;
    document.head.appendChild(style);

    // Exponer globalmente
    window.NotificationSystem = NotificationSystem;

    // Sobrescribir el alert nativo para usar Toasts dinámicos de forma automática
    const nativeAlert = window.alert;
    window.alert = function(message) {
        let type = 'info';
        let title = 'Notificación';
        
        const lower = String(message || '').toLowerCase();
        if (lower.includes('error') || lower.includes('no se pudo') || lower.includes('fallo') || lower.includes('denegado') || lower.includes('inválido') || lower.includes('incorrectos')) {
            type = 'danger';
            title = 'Error';
        } else if (lower.includes('éxito') || lower.includes('correctamente') || lower.includes('exitosamente') || lower.includes('gracias') || lower.includes('guardado')) {
            type = 'success';
            title = 'Operación Exitosa';
        } else if (lower.includes('cuidado') || lower.includes('advertencia') || lower.includes('selecciona') || lower.includes('debes') || lower.includes('atención') || lower.includes('inicie sesión')) {
            type = 'warning';
            title = 'Atención';
        }
        
        try {
            NotificationSystem.showToast(title, message, type);
        } catch (e) {
            // Fallback al alert nativo en caso de error
            nativeAlert(message);
        }
    };

    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => NotificationSystem.init());
    } else {
        NotificationSystem.init();
    }
})();
