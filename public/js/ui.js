const config = window.SHOPDESK_CONFIG || {};

export function element(tag, { className, text, attrs = {} } = {}) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    for (const [name, value] of Object.entries(attrs)) {
        if (value !== undefined && value !== null) node.setAttribute(name, String(value));
    }
    return node;
}

export function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
}

export function renderShell(user = null) {
    const sidebar = document.querySelector('#site-sidebar');
    const topbar = document.querySelector('#site-topbar');
    const footer = document.querySelector('#site-footer');
    const path = window.location.pathname;
    const links = [
        ['/index.html', '◫', 'Home', true],
        ['/products.html', '▦', 'Products', true],
        ['/cart.html', '⌑', 'Cart', Boolean(user)],
        ['/orders.html', '▤', 'Orders', Boolean(user)],
        ['/profile.html', '♙', 'Profile', Boolean(user)],
        ['/admin/dashboard.html', '⚙', 'Admin', user?.role === 'admin'],
        ['/admin/setup.html', '✳', 'Admin setup', Boolean(user && user.role !== 'admin' && config.adminBootstrapEnabled)]
    ];
    const activePath = path === '/' ? '/index.html' : (path.endsWith('.html') ? path : `${path.replace(/\/+$/, '')}.html`);
    sidebar.replaceChildren();
    const brand = element('a', { className: 'brand', text: 'shopdesk.', attrs: { href: '/index.html', 'aria-label': 'Shopdesk home' } });
    const mark = element('span', { className: 'brand-mark', text: 'S', attrs: { 'aria-hidden': 'true' } });
    brand.prepend(mark);
    sidebar.append(brand, element('p', { className: 'sidebar-label', text: 'SHOPDESK' }));
    const nav = element('nav', { className: 'side-nav', attrs: { 'aria-label': 'Main navigation' } });
    for (const [href, icon, label, visible] of links) {
        if (!visible) continue;
        const link = element('a', {
            className: `nav-link${(activePath === href || (href === '/admin/dashboard.html' && activePath.startsWith('/admin/'))) ? ' active' : ''}`,
            text: `${icon}  ${label}`,
            attrs: { href, 'aria-current': activePath === href || (href === '/admin/dashboard.html' && activePath.startsWith('/admin/')) ? 'page' : null }
        });
        nav.append(link);
    }
    sidebar.append(nav);
    const sideBottom = element('div', { className: 'sidebar-bottom' });
    sideBottom.append(
        element('div', { className: 'api-indicator', text: 'Shopdesk · Storefront' }),
        element('p', { text: user ? `Signed in as ${user.name}` : 'Browse the Shopdesk store' })
    );
    sidebar.append(sideBottom);

    topbar.replaceChildren();
    topbar.append(
        element('div', { className: 'breadcrumb', text: `Shopdesk  /  ${document.title.split(' — ')[0]}` })
    );
    const right = element('div', { className: 'topbar-right' });
    right.append(element('span', {
        className: 'avatar',
        text: user?.name?.charAt(0).toUpperCase() || 'G',
        attrs: { 'aria-label': user ? `${user.name} account` : 'Guest account' }
    }));
    if (user) {
        const logoutButton = element('button', { className: 'button button-quiet button-small', text: 'Sign out', attrs: { type: 'button' } });
        logoutButton.addEventListener('click', async () => {
            const { logout } = await import('./auth.js');
            logout();
        });
        right.append(logoutButton);
    } else if (!['/login.html', '/register.html'].includes(activePath)) {
        right.append(element('a', { className: 'button button-secondary button-small', text: 'Sign in', attrs: { href: `/login.html?next=${encodeURIComponent(path + window.location.search)}` } }));
    }
    topbar.append(right);
    footer.replaceChildren(element('span', { text: 'Shopdesk · Full-stack store' }));
}

export function showToast(message, type = '') {
    const region = document.querySelector('#toast-region');
    const toast = element('div', { className: `toast${type === 'error' ? ' error' : ''}`, text: message, attrs: { role: 'status' } });
    region.append(toast);
    window.setTimeout(() => toast.remove(), 4200);
}

export function consumeFlashMessage() {
    const stored = sessionStorage.getItem('shopdesk-flash-message');
    if (!stored) return;
    sessionStorage.removeItem('shopdesk-flash-message');
    try {
        const flash = JSON.parse(stored);
        showToast(flash.message, flash.type);
    } catch {
        showToast(stored);
    }
}

export function showLoading(container, message = 'Loading…') {
    container.replaceChildren(element('p', { className: 'loading-state', text: message, attrs: { role: 'status' } }));
}

export function showEmpty(container, message) {
    container.replaceChildren(element('p', { className: 'empty-state', text: message }));
}

export function showError(container, error) {
    container.replaceChildren(element('p', { className: 'error-state', text: error.message || 'Something went wrong.' }));
}

export function formMessage(node, message, isError = false) {
    node.textContent = message;
    node.className = `form-message${isError ? ' error' : ' success'}`;
}

export function formatPrice(value) {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(Number(value));
}

export function formatDate(value) {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function pageHeading(eyebrow, title, description = '') {
    const header = element('section', { className: 'welcome' });
    const copy = element('div');
    copy.append(element('p', { className: 'eyebrow', text: eyebrow }), element('h1', { text: title }));
    if (description) copy.append(element('p', { className: 'welcome-copy', text: description }));
    header.append(copy);
    return header;
}

export function productCard(product, { addToCart } = {}) {
    const card = element('article', { className: 'product-card' });
    const imageWrap = element('div', { className: 'product-image-wrap' });
    if (product.imageUrl) {
        const image = element('img', { className: 'product-image', attrs: { src: product.imageUrl, alt: product.name, loading: 'lazy' } });
        image.addEventListener('error', () => {
            image.replaceWith(element('span', {
                className: 'product-image-placeholder',
                text: '▦',
                attrs: { 'aria-hidden': 'true' }
            }));
        }, { once: true });
        imageWrap.append(image);
    } else {
        imageWrap.append(element('span', { className: 'product-image-placeholder', text: '▦', attrs: { 'aria-hidden': 'true' } }));
    }
    imageWrap.append(element('span', {
        className: `product-stock${Number(product.stock) ? '' : ' sold-out'}`,
        text: Number(product.stock) ? `${product.stock} in stock` : 'Out of stock'
    }));
    const content = element('div', { className: 'product-content' });
    content.append(element('span', { className: 'product-category', text: product.category }));
    const title = element('h3');
    const titleLink = element('a', { text: product.name, attrs: { href: `/product.html?id=${encodeURIComponent(product.id)}` } });
    title.append(titleLink);
    content.append(title, element('p', { className: 'product-description', text: product.description }));
    const bottom = element('div', { className: 'product-bottom' });
    bottom.append(element('strong', { className: 'product-price', text: formatPrice(product.price) }));
    if (addToCart) {
        const button = element('button', {
            className: 'button button-primary button-small',
            text: 'Add to cart',
            attrs: { type: 'button', disabled: Number(product.stock) < 1 ? '' : null }
        });
        button.addEventListener('click', async () => {
            button.disabled = true;
            try {
                await addToCart(product.id);
            } finally {
                button.disabled = Number(product.stock) < 1;
            }
        });
        bottom.append(button);
    }
    content.append(bottom);
    card.append(imageWrap, content);
    return card;
}

export function initPage(user = null) {
    renderShell(user);
    consumeFlashMessage();
    return document.querySelector('#page-content');
}
