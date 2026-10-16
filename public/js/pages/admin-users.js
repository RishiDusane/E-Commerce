import { apiRequest } from '../api.js';
import { requireAdmin, setFlashMessage, updateCurrentUser } from '../auth.js';
import { element, initPage, pageHeading, showEmpty, showError, showLoading, showToast } from '../ui.js';

const user = await requireAdmin();
if (user) {
    const root = initPage(user);
    root.append(pageHeading('ACCOUNT ADMIN', 'Manage users', 'Review accounts and change customer or administrator roles.'));
    const list = element('div', { className: 'admin-list', attrs: { 'aria-live': 'polite' } });
    root.append(list);
    async function load() {
        showLoading(list, 'Loading users…');
        try {
            const { data } = await apiRequest('/users?limit=100');
            if (!data.length) {
                showEmpty(list, 'No accounts found.');
                return;
            }
            list.replaceChildren(...data.map((account) => {
                const row = element('article', { className: 'admin-row' });
                const info = element('div');
                info.append(element('strong', { text: account.name }), element('span', { text: `${account.email} · ${account.role}` }));
                const role = element('select', { attrs: { 'aria-label': `Role for ${account.name}` } });
                role.add(new Option('Customer', 'customer'), new Option('Administrator', 'admin'));
                role.value = account.role;
                role.addEventListener('change', async () => {
                    try {
                        const { data } = await apiRequest(`/users/${encodeURIComponent(account.id)}/role`, { method: 'PATCH', body: { role: role.value } });
                        if (account.id === user.id && role.value !== 'admin') {
                            updateCurrentUser(data.user);
                            setFlashMessage('Your administrator role was removed.');
                            location.replace('/index.html');
                            return;
                        }
                        showToast(`Role updated to ${role.value}.`);
                        load();
                    } catch (error) {
                        showToast(error.message, 'error');
                        role.value = account.role;
                    }
                });
                row.append(info, role);
                if (account.role !== 'admin') {
                    const remove = element('button', { className: 'button button-quiet button-small', text: 'Delete', attrs: { type: 'button' } });
                    remove.addEventListener('click', async () => {
                        if (!confirm(`Delete ${account.name}? Accounts with order history cannot be deleted.`)) return;
                        try {
                            await apiRequest(`/users/${encodeURIComponent(account.id)}`, { method: 'DELETE' });
                            showToast('Account deleted.');
                            load();
                        } catch (error) {
                            showToast(error.message, 'error');
                        }
                    });
                    row.append(remove);
                }
                return row;
            }));
        } catch (error) {
            showError(list, error);
        }
    }
    await load();
}
