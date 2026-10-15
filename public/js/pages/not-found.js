import { getCurrentUser } from '../auth.js';
import { element, initPage, pageHeading } from '../ui.js';

const root = initPage(await getCurrentUser());
root.replaceChildren();
root.append(pageHeading('404', 'Page not found', 'We could not find the page you requested.'));
root.append(element('a', { className: 'button button-primary', text: 'Return to Shopdesk', attrs: { href: '/index.html' } }));
