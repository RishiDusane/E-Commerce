const config = window.SHOPDESK_CONFIG || {};
const API_BASE = (config.apiBaseUrl || '/api').replace(/\/+$/, '');
export class ApiError extends Error {
    constructor(status, payload) {
        super(payload?.error?.message || `Request failed with status ${status}.`);
        this.name = 'ApiError';
        this.status = status;
        this.payload = payload;
    }
}

function apiUrl(path) {
    if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) {
        throw new Error('API endpoint must begin with a single slash.');
    }
    const basePath = API_BASE.startsWith('/') ? API_BASE : new URL(API_BASE).pathname.replace(/\/+$/, '');
    const endpoint = path === basePath || path.startsWith(`${basePath}/`)
        ? path.slice(basePath.length)
        : path;
    return `${API_BASE}${endpoint}`;
}

export async function apiRequest(path, { method = 'GET', body, auth = true } = {}) {
    const token = auth ? sessionStorage.getItem('shopdesk-session-token') : null;
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;

    let response;
    try {
        response = await fetch(apiUrl(path), {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body)
        });
    } catch (error) {
        throw new ApiError(0, {
            success: false,
            error: { code: 'NETWORK_ERROR', message: error.message || 'Could not reach the API.' }
        });
    }

    let payload;
    try {
        payload = await response.json();
    } catch {
        payload = {
            success: false,
            error: { code: 'INVALID_RESPONSE', message: 'The server returned an unreadable response.' }
        };
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        payload = {
            success: false,
            error: { code: 'INVALID_RESPONSE', message: 'The server returned an unexpected response.' }
        };
    }
    if (!response.ok || payload.success === false) {
        if (response.status === 401 && auth) {
            window.dispatchEvent(new CustomEvent('shopdesk:unauthorized'));
        }
        throw new ApiError(response.status, payload);
    }
    Object.defineProperty(payload, 'httpStatus', { value: response.status, enumerable: false });
    return payload;
}

export { API_BASE };
