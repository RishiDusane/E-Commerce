import { apiRequest } from '../api.js';
import { requireAdmin } from '../auth.js';
import { element, initPage, pageHeading, showError, showLoading } from '../ui.js';

const user = await requireAdmin();
if (user) {
    const root = initPage(user);
    root.append(pageHeading('ADMINISTRATION', 'Store dashboard', 'Live store statistics from the Shopdesk API.'));
    const status = element('section', { className: 'notice', attrs: { 'aria-live': 'polite' } });
    const cards = element('section', { className: 'stats-grid', attrs: { 'aria-live': 'polite' } });
    root.append(status, cards);
    showLoading(cards, 'Loading dashboard statistics…');
    try {
        const [health, stats] = await Promise.all([
            apiRequest('/health', { auth: false }),
            apiRequest('/dashboard/stats')
        ]);
        status.textContent = `API status: ${health.data.status}; database: ${health.data.database}.`;
        cards.replaceChildren(
            ...[['Products', stats.data.products], ['Users', stats.data.users], ['Orders', stats.data.orders], ['Order value', `$${Number(stats.data.orderValue).toFixed(2)}`]]
                .map(([label, value]) => {
                    const card = element('article', { className: 'stat-card' });
                    card.append(element('span', { className: 'stat-label', text: label.toUpperCase() }), element('strong', { text: String(value) }));
                    return card;
                })
        );
        const links = element('div', { className: 'admin-links' });
        for (const [label, href] of [['Products', '/admin/products.html'], ['Users', '/admin/users.html'], ['Orders', '/admin/orders.html'], ['New product', '/admin/product-form.html']]) {
            links.append(element('a', { className: 'button button-secondary', text: label, attrs: { href } }));
        }
        root.append(links);
    } catch (error) {
        showError(status, error);
        showError(cards, error);
    }
}
