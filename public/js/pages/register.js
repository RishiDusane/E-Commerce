import { apiRequest } from '../api.js';
import { redirectAfterLogin, redirectIfAuthenticated, setSession } from '../auth.js';
import { element, formMessage, initPage, pageHeading } from '../ui.js';

if (!await redirectIfAuthenticated()) {
    const root = initPage();
    root.append(pageHeading('JOIN SHOPDESK', 'Create your account', 'Create a customer account to save your cart and orders.'));
    const form = element('form', { className: 'panel form-stack' });
    const fields = [
        ['Full name', 'name', 'text', 'name', 80],
        ['Email address', 'email', 'email', 'email', 254],
        ['Password', 'password', 'password', 'new-password', 128]
    ];
    for (const [label, name, type, autocomplete, maxLength] of fields) {
        const control = element('label', { text: label });
        control.append(element('input', {
            attrs: { name, type, autocomplete, maxlength: String(maxLength), minlength: name === 'password' ? '8' : name === 'name' ? '2' : undefined, required: '' }
        }));
        form.append(control);
    }
    const message = element('p', { className: 'form-message', attrs: { 'aria-live': 'polite' } });
    const submit = element('button', { className: 'button button-primary', text: 'Create account', attrs: { type: 'submit' } });
    form.append(submit, message);
    root.append(form, element('a', { className: 'text-link', text: 'Already have an account? Sign in', attrs: { href: `/login.html${location.search}` } }));
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        submit.disabled = true;
        formMessage(message, 'Creating account…');
        try {
            const { data } = await apiRequest('/auth/register', {
                method: 'POST',
                body: Object.fromEntries(new FormData(form)),
                auth: false
            });
            setSession(data.token, data.user);
            redirectAfterLogin(data.user);
        } catch (error) {
            formMessage(message, error.message, true);
        } finally {
            submit.disabled = false;
        }
    });
}
