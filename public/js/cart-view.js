import { element, formatPrice } from './ui.js';

export function cartRow(item, { onQuantity, onRemove }) {
    const row = element('article', { className: 'cart-row' });
    const description = element('div', { className: 'cart-row-info' });
    description.append(
        element('a', { className: 'text-link', text: item.product.name, attrs: { href: `/product.html?id=${encodeURIComponent(item.product.id)}` } }),
        element('span', { text: `${formatPrice(item.product.price)} each · Subtotal ${formatPrice(item.subtotal)}` })
    );
    const quantity = element('input', {
        attrs: { type: 'number', min: '1', max: String(item.product.stock), value: String(item.quantity), 'aria-label': `Quantity for ${item.product.name}` }
    });
    quantity.addEventListener('change', () => onQuantity(item.product.id, quantity.value));
    const remove = element('button', { className: 'button button-quiet button-small', text: 'Remove', attrs: { type: 'button' } });
    remove.addEventListener('click', () => onRemove(item.product.id));
    row.append(description, quantity, remove);
    return row;
}

export function cartSummary(cart, onCheckout) {
    const summary = element('section', { className: 'cart-summary panel' });
    summary.append(
        element('p', { text: `Cart total: ${formatPrice(cart.total)}` }),
        element('p', { className: 'muted-copy', text: 'Checkout creates an order and reserves stock. No payment is collected.' })
    );
    const button = element('a', { className: 'button button-primary', text: 'Review checkout', attrs: { href: '/checkout.html' } });
    if (onCheckout) button.addEventListener('click', onCheckout);
    summary.append(button);
    return summary;
}
