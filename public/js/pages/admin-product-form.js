import { apiRequest } from '../api.js';
import { requireAdmin, setFlashMessage } from '../auth.js';
import { element, formMessage, initPage, pageHeading, showError } from '../ui.js';

const user = await requireAdmin();
if (user) {
    const root = initPage(user);
    const id = new URLSearchParams(location.search).get('id');
    root.append(pageHeading('CATALOG ADMIN', id ? 'Edit product' : 'Add product', 'Product changes are validated by the server.'));
    const form = element('form', { className: 'panel form-stack' });
    const fields = [
        ['Product name', 'name', 'text', '2', '120'],
        ['Description', 'description', 'textarea', undefined, '3000'],
        ['Price (USD)', 'price', 'number', '0.01', '1000000'],
        ['Category', 'category', 'text', '2', '60'],
        ['Image URL', 'imageUrl', 'url', undefined, '2048'],
        ['Available stock', 'stock', 'number', '0', '10000000']
    ];
    for (const [label, name, type, min, max] of fields) {
        const field = element('label', { text: label });
        const input = type === 'textarea'
            ? element('textarea', { attrs: { name, maxlength: max, required: '' } })
            : element('input', { attrs: { name, type, maxlength: max, min, step: name === 'price' ? '0.01' : name === 'stock' ? '1' : undefined, required: name === 'imageUrl' ? undefined : '' } });
        field.append(input);
        form.append(field);
    }
    const message = element('p', { className: 'form-message', attrs: { 'aria-live': 'polite' } });
    const save = element('button', { className: 'button button-primary', text: id ? 'Save changes' : 'Create product', attrs: { type: 'submit' } });
    form.append(save, message);
    root.append(form);
    if (id) {
        try {
            const { data } = await apiRequest(`/products/${encodeURIComponent(id)}`, { auth: false });
            for (const [name, value] of Object.entries(data.product)) {
                if (form.elements[name]) form.elements[name].value = value;
            }
        } catch (error) {
            showError(form, error);
            save.disabled = true;
        }
    }
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const body = Object.fromEntries(new FormData(form));
        body.price = Number(body.price);
        body.stock = Number(body.stock);
        save.disabled = true;
        try {
            const result = await apiRequest(id ? `/products/${encodeURIComponent(id)}` : '/products', {
                method: id ? 'PUT' : 'POST',
                body
            });
            setFlashMessage(id ? 'Product updated.' : 'Product created.');
            location.replace('/admin/products.html');
        } catch (error) {
            formMessage(message, error.message, true);
        } finally {
            save.disabled = false;
        }
    });
}
