import { apiRequest } from '../api.js';
import { redirectAfterLogin, requireLogin, setSession } from '../auth.js';
import { element, formMessage, initPage, pageHeading } from '../ui.js';

const user = await requireLogin();
if (user) {
    if (user?.role === 'admin' || !window.SHOPDESK_CONFIG?.adminBootstrapEnabled) {
        location.replace('/404.html');
    } else {
        const root = initPage(user);
        root.append(pageHeading('ONE-TIME SETUP', 'Bootstrap administrator', 'Use the configured temporary token to promote your already registered account.'));
        const form = element('form', { className: 'panel form-stack' });
        const emailLabel = element('label', { text: 'Registered account email' });
        const email = element('input', { attrs: { name: 'email', type: 'email', autocomplete: 'email', required: '' } });
        email.value = user.email;
        emailLabel.append(email);
        const tokenLabel = element('label', { text: 'Temporary bootstrap token' });
        const token = element('input', { attrs: { name: 'token', type: 'password', autocomplete: 'off', required: '' } });
        tokenLabel.append(token);
        const submit = element('button', { className: 'button button-primary', text: 'Set up administrator', attrs: { type: 'submit' } });
        const message = element('p', { className: 'form-message', attrs: { 'aria-live': 'polite' } });
        form.append(emailLabel, tokenLabel, submit, message);
        root.append(form, element('p', { className: 'muted-copy', text: 'After setup succeeds, remove ADMIN_BOOTSTRAP_TOKEN from the server environment.' }));
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            submit.disabled = true;
            try {
                const { data } = await apiRequest('/auth/bootstrap-admin', {
                    method: 'POST',
                    body: Object.fromEntries(new FormData(form)),
                    auth: false
                });
                setSession(data.token, data.user);
                redirectAfterLogin(data.user, '?next=%2Fadmin%2Fdashboard.html');
            } catch (error) {
                formMessage(message, error.message, true);
            } finally {
                submit.disabled = false;
            }
        });
    }
}
