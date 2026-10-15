import { apiRequest } from './api.js';
import { getSafeNext } from './safe-redirect.mjs';

const TOKEN_KEY = 'shopdesk-session-token';
const SYNC_KEY = 'shopdesk-session-sync';
let currentUser = null;
let profileLoaded = false;
let redirecting = false;

function currentPage() {
    return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function setFlashMessage(message, type = 'success') {
    try {
        sessionStorage.setItem('shopdesk-flash-message', JSON.stringify({ message, type }));
    } catch {
        return;
    }
}

function broadcastSession(event) {
    try {
        localStorage.setItem(SYNC_KEY, JSON.stringify({ ...event, nonce: crypto.randomUUID() }));
        localStorage.removeItem(SYNC_KEY);
    } catch {
        return;
    }
}

export function redirectToLogin(next = currentPage(), message = '') {
    if (redirecting || ['/login.html', '/register.html'].includes(window.location.pathname)) return;
    redirecting = true;
    if (message) setFlashMessage(message, 'error');
    const safeNext = getSafeNext(`?next=${encodeURIComponent(next)}`);
    window.location.replace(`/login.html?next=${encodeURIComponent(safeNext)}`);
}

export function redirectAfterLogin(user, search = window.location.search) {
    const destination = getSafeNext(search, user);
    window.location.replace(destination);
}

export async function redirectIfAuthenticated(search = window.location.search) {
    if (!getToken()) return false;
    try {
        const user = await getCurrentUser();
        if (user) {
            window.location.replace(getSafeNext(search, user));
            return true;
        }
    } catch {
        return false;
    }
    return false;
}

export { getSafeNext };

export function getToken() {
    return sessionStorage.getItem(TOKEN_KEY);
}

export function setSession(token, user) {
    sessionStorage.setItem(TOKEN_KEY, token);
    currentUser = user;
    profileLoaded = true;
    broadcastSession({ type: 'login', token, user });
}

export function clearSession() {
    sessionStorage.removeItem(TOKEN_KEY);
    currentUser = null;
    profileLoaded = false;
}

export function updateCurrentUser(user) {
    currentUser = user;
    profileLoaded = true;
    broadcastSession({ type: 'profile', user });
}

export async function getCurrentUser() {
    if (!getToken()) return null;
    if (profileLoaded) return currentUser;
    try {
        const result = await apiRequest('/auth/me');
        currentUser = result.data.user;
        profileLoaded = true;
        return currentUser;
    } catch (error) {
        if (error.status !== 401) {
            setFlashMessage('Could not verify your account because the API is unavailable.', 'error');
        }
        return null;
    }
}

export async function requireLogin(next = currentPage()) {
    if (!getToken()) {
        redirectToLogin(next);
        return null;
    }
    try {
        const user = await getCurrentUser();
        if (user) return user;
    } catch {
        redirectToLogin(next, 'Your session could not be verified. Please sign in again.');
        return null;
    }
    redirectToLogin(next);
    return null;
}

export async function requireAdmin() {
    const user = await requireLogin();
    if (!user) return null;
    if (user?.role !== 'admin') {
        setFlashMessage('Administrator access is required. You have been returned to the storefront.', 'error');
        window.location.replace('/index.html');
        return null;
    }
    return user;
}

export function logout() {
    clearSession();
    broadcastSession({ type: 'logout' });
    window.location.replace('/index.html');
}

window.addEventListener('shopdesk:unauthorized', () => {
    clearSession();
    redirectToLogin(currentPage(), 'Your session expired. Please sign in again.');
});

window.addEventListener('storage', (event) => {
    if (event.key !== SYNC_KEY || !event.newValue) return;
    let update;
    try {
        update = JSON.parse(event.newValue);
    } catch {
        return;
    }
    if (update.type === 'logout') {
        clearSession();
        if (isProtectedPath(window.location.pathname)) redirectToLogin(currentPage(), 'You signed out in another tab.');
        else window.location.reload();
        return;
    }
    if (update.type === 'login' && typeof update.token === 'string' && update.user) {
        sessionStorage.setItem(TOKEN_KEY, update.token);
        currentUser = update.user;
        profileLoaded = true;
        window.location.reload();
        return;
    }
    if (update.type === 'profile' && update.user) {
        currentUser = update.user;
        profileLoaded = true;
        window.location.reload();
    }
});

window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    if (isProtectedPath(window.location.pathname) && !getToken()) {
        redirectToLogin(currentPage());
        return;
    }
    window.location.reload();
});

function isProtectedPath(path) {
    return ['/cart.html', '/checkout.html', '/orders.html', '/order.html', '/profile.html'].includes(path) ||
        path.startsWith('/admin/');
}
