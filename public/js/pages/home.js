import { apiRequest } from '../api.js';
import { getCurrentUser } from '../auth.js';
import { element, initPage, pageHeading, productCard, showError, showLoading } from '../ui.js';

const root = initPage(await getCurrentUser());
root.append(pageHeading('SHOPDESK · E-COMMERCE', 'Your next favorite is here.', 'Discover useful finds from the Shopdesk collection.'));
const notice = element('section', { className: 'notice', text: 'Checking store connection…', attrs: { role: 'status' } });
root.append(notice);
const heading = element('section', { className: 'section-heading' });
heading.append(element('h2', { text: 'Featured products' }), element('a', { className: 'button button-secondary button-small', text: 'Browse all products', attrs: { href: '/products.html' } }));
root.append(heading);
const grid = element('div', { className: 'product-grid' });
root.append(grid);
showLoading(grid);
try {
    const [health, products] = await Promise.all([
        apiRequest('/health', { auth: false }),
        apiRequest('/products?limit=3&sort=newest', { auth: false })
    ]);
    notice.textContent = health.data.status === 'ok'
        ? 'Shopdesk is connected and ready to browse.'
        : 'Shopdesk is currently unavailable.';
    grid.replaceChildren(...products.data.map((product) => productCard(product)));
    if (!products.data.length) grid.append(element('p', { className: 'empty-state', text: 'There are no products to feature yet.' }));
} catch (error) {
    notice.textContent = 'Store connection unavailable.';
    showError(grid, error);
}
const welcome = element('section', { className: 'welcome welcome-cta' });
welcome.append(element('div', { text: 'Shop with confidence. Your cart and order history stay connected to your account.' }));
const cta = element('a', { className: 'button button-primary', text: 'Explore the catalog', attrs: { href: '/products.html' } });
welcome.append(cta);
root.append(welcome);
