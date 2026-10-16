import { apiRequest } from '../api.js';
import { requireLogin } from '../auth.js';
import { element, formatPrice, initPage, pageHeading, showEmpty, showError, showLoading, showToast } from '../ui.js';

const user = await requireLogin();
if (user) {
    const root = initPage(user);
    root.append(pageHeading('SIMULATED CHECKOUT', 'Review your order', 'Confirm the items before creating your order. No payment is collected.'));
    const rows = element('div', { className: 'order-list' });
    const summary = element('section', { className: 'panel cart-summary' });
    root.append(rows, summary);
    showLoading(rows, 'Loading cart…');
    try {
        const { data } = await apiRequest('/cart');
        const cart = data.cart;
        if (!cart.items.length) {
            showEmpty(rows, 'Your cart is empty.');
            summary.append(element('a', { className: 'button button-primary', text: 'Browse products', attrs: { href: '/products.html' } }));
        } else {
            rows.replaceChildren(...cart.items.map((item) => {
                const row = element('article', { className: 'cart-row' });
                row.append(
                    element('div', { className: 'cart-row-info', text: item.product.name }),
                    element('span', { text: `Quantity: ${item.quantity}` }),
                    element('strong', { text: formatPrice(item.subtotal) })
                );
                return row;
            }));
            summary.append(element('h2', { text: `Order total: ${formatPrice(cart.total)}` }));
            const message = element('p', { className: 'form-message', attrs: { 'aria-live': 'polite' } });
            const placeOrder = element('button', { className: 'button button-primary', text: 'Place order', attrs: { type: 'button' } });
            placeOrder.addEventListener('click', async () => {
                placeOrder.disabled = true;
                placeOrder.textContent = 'Creating order…';
                message.textContent = '';
                try {
                    const result = await apiRequest('/orders', { method: 'POST', body: {} });
                    showToast(result.message || 'Order created. Payment has not been processed.');
                    location.replace(`/order.html?id=${encodeURIComponent(result.data.order.id)}`);
                } catch (error) {
                    showToast(error.message, 'error');
                    message.textContent = error.message;
                    placeOrder.disabled = false;
                    placeOrder.textContent = 'Place order';
                }
            });
            summary.append(element('p', { className: 'muted-copy', text: 'Inventory is rechecked on the server at checkout. Payment is not processed.' }), placeOrder, message);
        }
    } catch (error) {
        showError(rows, error);
        summary.replaceChildren();
    }
}
