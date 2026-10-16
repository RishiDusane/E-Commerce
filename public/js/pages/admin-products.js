import { apiRequest } from '../api.js';
import { requireAdmin, setFlashMessage } from '../auth.js';
import { element, formatPrice, initPage, pageHeading, showEmpty, showError, showLoading, showToast } from '../ui.js';

const user = await requireAdmin();
if (user) {
    const root = initPage(user);
    root.append(pageHeading('CATALOG ADMIN', 'Manage products', 'Edit product details or remove products from the active catalog.'));
    root.append(element('a', { className: 'button button-primary', text: 'Add product', attrs: { href: '/admin/product-form.html' } }));
    const tableWrap = element('div', { className: 'table-wrap', attrs: { 'aria-live': 'polite' } });
    root.append(tableWrap);
    showLoading(tableWrap);
    async function load() {
        showLoading(tableWrap, 'Loading products…');
        try {
            const { data } = await apiRequest('/products?limit=50&sort=newest', { auth: false });
            if (!data.length) {
                showEmpty(tableWrap, 'No products in the catalog yet.');
                return;
            }
            const table = element('table');
            const head = element('thead');
            const headerRow = element('tr');
            for (const label of ['Product', 'Category', 'Price', 'Stock', 'Actions']) headerRow.append(element('th', { text: label }));
            head.append(headerRow);
            const body = element('tbody');
            for (const product of data) {
                const row = element('tr');
                row.append(
                    element('td', { text: product.name }),
                    element('td', { text: product.category }),
                    element('td', { text: formatPrice(product.price) }),
                    element('td', { text: String(product.stock) })
                );
                const actions = element('td', { className: 'table-actions' });
                actions.append(element('a', { className: 'button button-secondary button-small', text: 'Edit', attrs: { href: `/admin/product-form.html?id=${encodeURIComponent(product.id)}` } }));
                const remove = element('button', { className: 'button button-quiet button-small', text: 'Delete', attrs: { type: 'button' } });
                remove.addEventListener('click', async () => {
                    if (!confirm(`Remove "${product.name}" from the active catalog?`)) return;
                    try {
                        await apiRequest(`/products/${encodeURIComponent(product.id)}`, { method: 'DELETE' });
                        setFlashMessage('Product removed.');
                        location.reload();
                    } catch (error) {
                        showToast(error.message, 'error');
                    }
                });
                actions.append(remove);
                row.append(actions);
                body.append(row);
            }
            table.append(head, body);
            tableWrap.replaceChildren(table);
        } catch (error) {
            showError(tableWrap, error);
        }
    }
    await load();
}
