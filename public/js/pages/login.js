import { apiRequest } from '../api.js';
import { redirectAfterLogin, redirectIfAuthenticated, setSession } from '../auth.js';
import { element, formMessage, initPage, pageHeading } from '../ui.js';

if (!await redirectIfAuthenticated()) {
const root = initPage();
root.append(pageHeading('WELCOME BACK', 'Sign in', 'Sign in to see your cart and orders.'));
const form = element('form', { className: 'panel form-stack' });
form.append(
    element('label', { text: 'Email address' }),
    element('label', { text: 'Password' })
);
const labels = form.querySelectorAll('label');
const email = element('input', { attrs: { name: 'email', type: 'email', autocomplete: 'email', maxlength: '254', required: '' } });
const password = element('input', { attrs: { name: 'password', type: 'password', autocomplete: 'current-password', minlength: '8', maxlength: '128', required: '' } });
labels[0].append(email);
labels[1].append(password);
const submit = element('button', { className: 'button button-primary', text: 'Sign in', attrs: { type: 'submit' } });
const message = element('p', { className: 'form-message', attrs: { 'aria-live': 'polite' } });
form.append(submit, message);
root.append(form, element('p', { className: 'muted-copy', text: 'New to Shopdesk? Create an account to get started.' }));
const registerLink = element('a', { className: 'text-link', text: 'Create account', attrs: { href: `/register.html${location.search}` } });
root.append(registerLink);
form.addEventListener('submit', async (event) => {
    event.preventDefault();
    submit.disabled = true;
    formMessage(message, 'Signing in…');
    try {
        const { data } = await apiRequest('/auth/login', {
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
