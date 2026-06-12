/**
 * Turnos Ya - Sistema de Notificaciones Premium (In-App & Toasts)
 */
(function() {
    // Configuración base
    const POLL_INTERVAL = 20000; // 20 segundos
    let lastUnreadCount = 0;

    // Obtener ruta base
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

    const NotificationSystem = {
        userId: localStorage.getItem('userId') || null,

        init() {
            this.userId = this.userId || (window.userId ? window.userId : null);
            if (!this.userId) return;

            // Iniciar polling
            this.fetchNotifications();
            setInterval(() => this.fetchNotifications(), POLL_INTERVAL);

            // Registrar eventos de interfaz
            this.bindEvents();
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
                        
                        // Opcional: Mostrar Toast para la última notificación entrante si es nueva
                        const newNotifs = unread.filter(n => !document.querySelector(`.notification-item[data-id="${n.id}"]`));
                        newNotifs.forEach(n => {
                            this.showToast(n.title, n.message, n.type);
                        });
                    }
                } else {
                    badge.classList.add('d-none');
                }
            }
            lastUnreadCount = unreadCount;

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
