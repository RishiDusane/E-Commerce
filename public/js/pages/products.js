import { apiRequest } from '../api.js';
import { getCurrentUser, getToken, redirectToLogin } from '../auth.js';
import { element, initPage, pageHeading, productCard, showEmpty, showError, showLoading, showToast } from '../ui.js';

const root = initPage(await getCurrentUser());
root.append(pageHeading('THE CATALOG', 'Explore products', 'Search, filter, and sort the Shopdesk collection.'));
const toolbar = element('form', { className: 'catalog-toolbar', attrs: { role: 'search' } });
const search = element('input', { attrs: { type: 'search', name: 'q', maxlength: '100', placeholder: 'Search products…', 'aria-label': 'Search products' } });
search.value = new URLSearchParams(location.search).get('q') || '';
const category = element('select', { attrs: { name: 'category', 'aria-label': 'Filter by category' } });
category.add(new Option('All categories', ''));
const sort = element('select', { attrs: { name: 'sort', 'aria-label': 'Sort products' } });
for (const [value, label] of [['newest', 'Newest'], ['oldest', 'Oldest'], ['price', 'Price: low to high'], ['-price', 'Price: high to low']]) sort.add(new Option(label, value));
sort.value = new URLSearchParams(location.search).get('sort') || 'newest';
toolbar.append(search, category, sort);
root.append(toolbar);
const status = element('p', { className: 'muted-copy', attrs: { 'aria-live': 'polite' } });
const grid = element('div', { className: 'product-grid', attrs: { 'aria-live': 'polite' } });
const empty = element('div');
const pagination = element('div', { className: 'pagination' });
const previous = element('button', { className: 'button button-secondary button-small', text: '← Previous', attrs: { type: 'button' } });
const pageLabel = element('span', { text: 'Page 1' });
const next = element('button', { className: 'button button-secondary button-small', text: 'Next →', attrs: { type: 'button' } });
pagination.append(previous, pageLabel, next);
root.append(status, grid, empty, pagination);
let page = Math.max(1, Number(new URLSearchParams(location.search).get('page')) || 1);
let lastPage = 1;
let timer;

async function add(productId) {
    if (!getToken()) {
        redirectToLogin(`/product.html?id=${encodeURIComponent(productId)}&addToCart=1`);
        return;
    }
    try {
        await apiRequest('/cart', { method: 'POST', body: { productId, quantity: 1 } });
        showToast('Product added to your cart.');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function load() {
    showLoading(grid, 'Loading products…');
    status.textContent = '';
    const params = new URLSearchParams({ page: String(page), limit: '9', sort: sort.value });
    if (search.value.trim()) params.set('q', search.value.trim());
    if (category.value) params.set('category', category.value);
    try {
        const result = await apiRequest(`/products?${params}`, { auth: false });
        grid.replaceChildren(...result.data.map((product) => productCard(product, { addToCart: add })));
        status.textContent = `${result.meta.total} product${result.meta.total === 1 ? '' : 's'} found.`;
        lastPage = Math.max(1, result.meta.totalPages);
        pageLabel.textContent = `Page ${result.meta.page} of ${lastPage}`;
        previous.disabled = page <= 1;
        next.disabled = page >= lastPage;
        if (!result.data.length) showEmpty(empty, 'No products match those filters.');
        else empty.replaceChildren();
    } catch (error) {
        showError(grid, error);
        empty.replaceChildren();
        status.textContent = 'Unable to load products.';
    }
}

apiRequest('/products/categories', { auth: false }).then(({ data }) => {
    for (const name of data) category.add(new Option(name, name));
    category.value = new URLSearchParams(location.search).get('category') || '';
    load();
}).catch((error) => {
    showError(empty, error);
    load();
});
search.addEventListener('input', () => {
    clearTimeout(timer);
    page = 1;
    timer = setTimeout(load, 250);
});
category.addEventListener('change', () => { page = 1; load(); });
sort.addEventListener('change', () => { page = 1; load(); });
previous.addEventListener('click', () => { if (page > 1) { page -= 1; load(); } });
next.addEventListener('click', () => { if (page < lastPage) { page += 1; load(); } });
toolbar.addEventListener('submit', (event) => { event.preventDefault(); page = 1; load(); });
