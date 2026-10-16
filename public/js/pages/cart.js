import { apiRequest } from '../api.js';
import { requireLogin } from '../auth.js';
import { cartRow } from '../cart-view.js';
import { element, formatPrice, initPage, pageHeading, showEmpty, showError, showLoading, showToast } from '../ui.js';

const user = await requireLogin();
if (user) {
    const root = initPage(user);
    root.append(pageHeading('YOUR BASKET', 'Shopping cart', 'Update quantities or continue to checkout.'));
    const items = element('div', { className: 'order-list' });
    const summary = element('div');
    root.append(items, summary);
    async function load() {
        showLoading(items, 'Loading cart…');
        try {
            const { data } = await apiRequest('/cart');
            const cart = data.cart;
            if (!cart.items.length) {
                showEmpty(items, 'Your cart is empty. Browse products to add something.');
                summary.replaceChildren(element('a', { className: 'button button-primary', text: 'Browse products', attrs: { href: '/products.html' } }));
                return;
            }
            items.replaceChildren(...cart.items.map((item) => cartRow(item, { onQuantity: update, onRemove: remove })));
            summary.replaceChildren(element('section', { className: 'cart-summary panel', text: `Total: ${formatPrice(cart.total)}` }));
            summary.append(element('a', { className: 'button button-primary', text: 'Continue to checkout', attrs: { href: '/checkout.html' } }));
        } catch (error) {
            showError(items, error);
            summary.replaceChildren();
        }
    }
    async function update(id, quantity) {
        try {
            const { data } = await apiRequest(`/cart/${encodeURIComponent(id)}`, { method: 'PUT', body: { quantity: Number(quantity) } });
            showToast('Cart updated.');
            items.replaceChildren(...data.cart.items.map((item) => cartRow(item, { onQuantity: update, onRemove: remove })));
            summary.firstElementChild.textContent = `Total: ${formatPrice(data.cart.total)}`;
        } catch (error) {
            showToast(error.message, 'error');
            load();
        }
    }
    async function remove(id) {
        try {
            await apiRequest(`/cart/${encodeURIComponent(id)}`, { method: 'DELETE' });
            await load();
        } catch (error) {
            showToast(error.message, 'error');
        }
    }
    await load();
}
