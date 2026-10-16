import { apiRequest } from '../api.js';
import { getCurrentUser, getToken, redirectToLogin } from '../auth.js';
import { element, formatPrice, initPage, pageHeading, showError, showLoading, showToast } from '../ui.js';

const root = initPage(await getCurrentUser());
root.append(pageHeading('PRODUCT DETAILS', 'Product', 'Review the product details and availability.'));
const panel = element('section', { className: 'panel product-detail', attrs: { 'aria-live': 'polite' } });
root.append(panel);
showLoading(panel, 'Loading product…');
const id = new URLSearchParams(location.search).get('id');
if (!id) {
    showError(panel, new Error('A product ID is required.'));
} else {
    try {
        const { data } = await apiRequest(`/products/${encodeURIComponent(id)}`, { auth: false });
        const product = data.product;
        document.title = `${product.name} — Shopdesk`;
        const details = element('div', { className: 'detail-layout' });
        if (product.imageUrl) {
            const image = element('img', { className: 'detail-image', attrs: { src: product.imageUrl, alt: product.name } });
            image.addEventListener('error', () => {
                image.replaceWith(element('div', {
                    className: 'detail-image-placeholder',
                    text: '▦',
                    attrs: { role: 'img', 'aria-label': `${product.name} image unavailable` }
                }));
            }, { once: true });
            details.append(image);
        }
        const info = element('div');
        info.append(
            element('p', { className: 'eyebrow', text: product.category }),
            element('h2', { text: product.name }),
            element('p', { className: 'product-description detail-description', text: product.description }),
            element('strong', { className: 'product-price', text: formatPrice(product.price) }),
            element('p', { className: 'muted-copy', text: Number(product.stock) ? `${product.stock} in stock` : 'Out of stock' })
        );
        const add = element('button', { className: 'button button-primary', text: 'Add to cart', attrs: { type: 'button', disabled: Number(product.stock) < 1 ? '' : null } });
        async function addToCart() {
            add.disabled = true;
            try {
                await apiRequest('/cart', { method: 'POST', body: { productId: product.id, quantity: 1 } });
                showToast('Product added to your cart.');
                history.replaceState(null, '', `/product.html?id=${encodeURIComponent(product.id)}`);
            } catch (error) {
                showToast(error.message, 'error');
            } finally {
                add.disabled = Number(product.stock) < 1;
            }
        }
        add.addEventListener('click', () => {
            if (!getToken()) {
                redirectToLogin(`/product.html?id=${encodeURIComponent(product.id)}&addToCart=1`);
                return;
            }
            addToCart();
        });
        info.append(add);
        details.append(info);
        panel.replaceChildren(details);
        if (getToken() && new URLSearchParams(location.search).get('addToCart') === '1' && Number(product.stock) > 0) {
            await addToCart();
        }
    } catch (error) {
        showError(panel, error);
    }
}
