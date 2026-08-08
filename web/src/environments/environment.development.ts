export const environment = {
  production: false,
  /**
   * Same relative path as production. `ng serve` has no /api origin, so
   * proxy.conf.json forwards it to the deployed API Gateway stage — fill in
   * the invoke URL there once `terraform apply` has run.
   */
  contactApiUrl: '/api/contact',
};
