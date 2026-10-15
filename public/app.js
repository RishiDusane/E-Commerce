const responseStatus = document.querySelector('#response-status');
const responseBody = document.querySelector('#response-body');
const responseMethod = document.querySelector('#response-method');
const responseTime = document.querySelector('#response-time');

function showResponse({ status, label, message, method, duration }) {
    responseStatus.className = `response-status ${status}`;
    responseStatus.innerHTML = `<span></span> ${label}`;
    responseBody.replaceChildren();

    const output = document.createElement('pre');
    output.textContent = message;
    responseBody.append(output);
    responseMethod.textContent = method;
    responseTime.textContent = duration === undefined ? '—' : `${duration} MS`;
}

async function sendRequest(method, path) {
    responseStatus.className = 'response-status loading';
    responseStatus.innerHTML = '<span></span> SENDING';
    responseMethod.textContent = `${method} ${path}`.toUpperCase();
    responseTime.textContent = '—';
    responseBody.replaceChildren();

    const placeholder = document.createElement('p');
    placeholder.textContent = 'Waiting for the API response…';
    responseBody.append(placeholder);

    const startedAt = performance.now();

    try {
        const response = await fetch(path, { method });
        const message = await response.text();
        const duration = Math.round(performance.now() - startedAt);
        showResponse({
            status: response.ok ? 'success' : 'error',
            label: response.ok ? `${response.status} OK` : `${response.status} ERROR`,
            message: message || '(empty response)',
            method: `${method} ${path}`.toUpperCase(),
            duration
        });
    } catch (error) {
        showResponse({
            status: 'error',
            label: 'REQUEST FAILED',
            message: error instanceof Error ? error.message : 'Unable to reach the API.',
            method: `${method} ${path}`.toUpperCase()
        });
    }
}

document.querySelectorAll('.request-button').forEach((button) => {
    button.addEventListener('click', () => {
        sendRequest(button.dataset.method, button.dataset.path);
    });
});

document.querySelectorAll('.request-form').forEach((form) => {
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const field = document.getElementById(form.dataset.field);
        const id = field.value.trim();
        if (!id) {
            field.focus();
            return;
        }

        sendRequest(form.dataset.method, `${form.dataset.pathPrefix}${encodeURIComponent(id)}`);
    });
});

document.querySelectorAll('.side-nav .nav-link').forEach((link) => {
    link.addEventListener('click', () => {
        document.querySelectorAll('.side-nav .nav-link').forEach((item) => item.classList.remove('active'));
        link.classList.add('active');
    });
});
