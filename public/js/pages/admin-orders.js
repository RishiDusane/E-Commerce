import { apiRequest } from '../api.js';
import { requireAdmin } from '../auth.js';
import { element, formatDate, formatPrice, initPage, pageHeading, showEmpty, showError, showLoading, showToast } from '../ui.js';

const user = await requireAdmin();
if (user) {
    const root = initPage(user);
    root.append(pageHeading('FULFILLMENT', 'Manage orders', 'Review order snapshots and update fulfillment status.'));
    const list = element('div', { className: 'order-list', attrs: { 'aria-live': 'polite' } });
    root.append(list);
    async function load() {
        showLoading(list, 'Loading orders…');
        try {
            const { data } = await apiRequest('/orders?limit=100');
            if (!data.length) {
                showEmpty(list, 'There are no orders yet.');
                return;
            }
            list.replaceChildren(...data.map((order) => {
                const row = element('article', { className: 'order-card' });
                const info = element('div', { className: 'order-main' });
                info.append(
                    element('strong', { text: `Order #${order.id.slice(-8).toUpperCase()}` }),
                    element('span', { text: `${order.user?.name || 'Customer'} · ${formatDate(order.createdAt)} · ${order.items.length} line(s)` })
                );
                const actions = element('div', { className: 'order-side' });
                actions.append(element('strong', { className: 'order-total', text: formatPrice(order.total) }));
                const detail = element('a', { className: 'button button-secondary button-small', text: 'Details', attrs: { href: `/order.html?id=${encodeURIComponent(order.id)}` } });
                const allowed = {
                    pending: ['processing', 'cancelled'],
                    processing: ['shipped', 'cancelled'],
                    shipped: ['delivered'],
                    delivered: [],
                    cancelled: []
                }[order.status];
                if (allowed.length) {
                    const select = element('select', { attrs: { 'aria-label': `Update order status from ${order.status}` } });
                    select.add(new Option(`Status: ${order.status}`, ''));
                    for (const value of allowed) select.add(new Option(value, value));
                    select.addEventListener('change', async () => {
                        if (!select.value) return;
                        try {
                            await apiRequest(`/orders/${encodeURIComponent(order.id)}/status`, { method: 'PATCH', body: { status: select.value } });
                            showToast(`Order updated to ${select.value}.`);
                            load();
                        } catch (error) {
                            showToast(error.message, 'error');
                            select.value = '';
                        }
                    });
                    actions.append(select);
                }
                row.append(info, actions, detail);
                return row;
            }));
        } catch (error) {
            showError(list, error);
        }
    }
    await load();
}
