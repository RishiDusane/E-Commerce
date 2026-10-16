import { apiRequest } from '../api.js';
import { requireLogin } from '../auth.js';
import { element, formatDate, formatPrice, initPage, pageHeading, showEmpty, showError, showLoading } from '../ui.js';

const user = await requireLogin();
if (user) {
    const root = initPage(user);
    root.append(pageHeading('PURCHASE HISTORY', 'Your orders', 'Order history and simulated checkout records.'));
    const list = element('div', { className: 'order-list', attrs: { 'aria-live': 'polite' } });
    root.append(list);
    showLoading(list);
    try {
        const { data, meta } = await apiRequest('/orders/my-orders');
        if (!data.length) {
            showEmpty(list, 'No orders yet. Your orders will appear here after checkout.');
        } else {
            list.replaceChildren(...data.map((order) => {
                const card = element('article', { className: 'order-card' });
                const info = element('div', { className: 'order-main' });
                info.append(
                    element('strong', { text: `Order #${order.id.slice(-8).toUpperCase()}` }),
                    element('span', { text: `${formatDate(order.createdAt)} · ${order.items.length} line item(s)` })
                );
                const detail = element('a', { className: 'button button-secondary button-small', text: 'View details', attrs: { href: `/order.html?id=${encodeURIComponent(order.id)}` } });
                const total = element('div', { className: 'order-side' });
                total.append(element('strong', { className: 'order-total', text: formatPrice(order.total) }), element('span', { className: `status-pill ${order.status}`, text: order.status }));
                card.append(info, total, detail);
                return card;
            }));
            root.append(element('p', { className: 'muted-copy', text: `${meta.total} total order(s).` }));
        }
    } catch (error) {
        showError(list, error);
    }
}
