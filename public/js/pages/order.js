import { apiRequest } from '../api.js';
import { requireLogin } from '../auth.js';
import { element, formatDate, formatPrice, initPage, pageHeading, showError, showLoading } from '../ui.js';

const user = await requireLogin();
if (user) {
    const root = initPage(user);
    root.append(pageHeading('ORDER DETAILS', 'Order', 'Purchased item names and prices are retained as snapshots.'));
    const details = element('section', { className: 'panel', attrs: { 'aria-live': 'polite' } });
    root.append(details);
    showLoading(details, 'Loading order…');
    const id = new URLSearchParams(location.search).get('id');
    if (!id) {
        showError(details, new Error('An order ID is required.'));
    } else {
        try {
            const { data } = await apiRequest(`/orders/${encodeURIComponent(id)}`);
            const order = data.order;
            details.replaceChildren(
                element('h2', { text: `Order #${order.id.slice(-8).toUpperCase()}` }),
                element('p', { className: 'muted-copy', text: `${formatDate(order.createdAt)} · ${order.status}` })
            );
            const lines = element('div', { className: 'order-list' });
            for (const item of order.items) {
                const line = element('article', { className: 'order-card' });
                line.append(
                    element('div', { className: 'order-main', text: `${item.name} · Qty ${item.quantity}` }),
                    element('div', { className: 'order-side', text: `${formatPrice(item.unitPrice)} each · ${formatPrice(item.subtotal)}` })
                );
                lines.append(line);
            }
            details.append(lines, element('h3', { className: 'order-total total-heading', text: `Total: ${formatPrice(order.total)}` }));
        } catch (error) {
            showError(details, error);
        }
    }
}
