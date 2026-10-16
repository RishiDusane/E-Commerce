const AUTH_PATHS = new Set(['/login', '/login.html', '/register', '/register.html']);

export function getSafeNext(search = '', user = null) {
    let candidate = null;
    try {
        const query = search.startsWith('?') ? search.slice(1) : search;
        candidate = new URLSearchParams(query).get('next');
    } catch {
        candidate = null;
    }

    if (typeof candidate === 'string' &&
        candidate.startsWith('/') &&
        !candidate.startsWith('//') &&
        !candidate.includes('\\') &&
        !/%5c/i.test(candidate) &&
        !/[\u0000-\u001f\u007f]/.test(candidate)) {
        try {
            const destination = new URL(candidate, 'https://shopdesk.invalid');
            const decodedPath = decodeURIComponent(destination.pathname);
            const canonicalPath = new URL(decodedPath, 'https://shopdesk.invalid').pathname.replace(/\/+$/, '').toLowerCase() || '/';
            if (destination.origin === 'https://shopdesk.invalid' &&
                decodedPath.startsWith('/') &&
                !decodedPath.startsWith('//') &&
                !decodedPath.includes('\\') &&
                !AUTH_PATHS.has(canonicalPath)) {
                return `${destination.pathname}${destination.search}${destination.hash}`;
            }
        } catch {
            candidate = null;
        }
    }
    return user?.role === 'admin' ? '/admin/dashboard.html' : '/index.html';
}
