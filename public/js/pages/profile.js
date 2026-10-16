import { apiRequest } from '../api.js';
import { requireLogin, updateCurrentUser } from '../auth.js';
import { element, formMessage, initPage, pageHeading, renderShell, showError } from '../ui.js';

const user = await requireLogin();
if (user) {
    const root = initPage(user);
    root.append(pageHeading('YOUR ACCOUNT', 'Profile', 'View and update your account details.'));
    const form = element('form', { className: 'panel form-stack' });
    const nameLabel = element('label', { text: 'Name' });
    const name = element('input', { attrs: { name: 'name', minlength: '2', maxlength: '80', required: '' } });
    nameLabel.append(name);
    const emailLabel = element('label', { text: 'Email address' });
    const email = element('input', { attrs: { name: 'email', type: 'email', maxlength: '254', required: '' } });
    emailLabel.append(email);
    const passwordLabel = element('label', { text: 'New password (optional)' });
    const password = element('input', { attrs: { name: 'password', type: 'password', autocomplete: 'new-password', minlength: '8', maxlength: '128', placeholder: 'Leave blank to keep current' } });
    passwordLabel.append(password);
    const message = element('p', { className: 'form-message', attrs: { 'aria-live': 'polite' } });
    const submit = element('button', { className: 'button button-primary', text: 'Save profile', attrs: { type: 'submit' } });
    form.append(nameLabel, emailLabel, passwordLabel, element('p', { className: 'muted-copy', text: `Account role: ${user.role}` }), submit, message);
    root.append(form);
    try {
        const { data } = await apiRequest(`/users/${encodeURIComponent(user.id)}`);
        name.value = data.user.name;
        email.value = data.user.email;
    } catch (error) {
        showError(form, error);
    }
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const body = Object.fromEntries(new FormData(form));
        if (!body.password) delete body.password;
        submit.disabled = true;
        try {
            const { data } = await apiRequest(`/users/${encodeURIComponent(user.id)}`, { method: 'PUT', body });
            formMessage(message, 'Profile updated.');
            name.value = data.user.name;
            email.value = data.user.email;
            password.value = '';
            updateCurrentUser(data.user);
            renderShell(data.user);
        } catch (error) {
            formMessage(message, error.message, true);
        } finally {
            submit.disabled = false;
        }
    });
}
