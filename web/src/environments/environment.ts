export const environment = {
  production: true,
  /**
   * Relative on purpose. CloudFront has a second origin behind the `/api/*`
   * cache behavior pointing at API Gateway, so the browser only ever talks to
   * one host — no CORS preflight, and no API URL to substitute at build time.
   */
  contactApiUrl: '/api/contact',
};
