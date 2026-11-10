// Cloudflare Pages: simple password gate for the alpha (HTTP Basic auth; any user name, the password is the
// SITE_PASSWORD secret set with `npx.cmd wrangler pages secret put SITE_PASSWORD --project-name ffrogue`).
// Fails closed: without the secret nobody gets in. public/_routes.json limits it to the entry page, so the
// thousands of asset requests per session do not count against the free Functions quota.
export async function onRequest({request, next, env}) {
  const password = env.SITE_PASSWORD;
  if (!password) return new Response('Site password not configured.', {status: 503});
  const header = request.headers.get('Authorization') ?? '';
  if (header.startsWith('Basic ')) {
    let decoded = '';
    try { decoded = atob(header.slice(6)); } catch { /* malformed header: ask again */ }
    if (decoded.slice(decoded.indexOf(':') + 1) === password) return next();
  }
  return new Response('Password required.', {status: 401, headers: {'WWW-Authenticate': 'Basic realm="FF Rogue alpha", charset="UTF-8"', 'X-Robots-Tag': 'noindex'}});
}
