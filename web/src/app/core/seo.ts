import { DOCUMENT, Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

export const SITE_NAME = 'Matthew J. Sauro';

/**
 * Canonical origin. The site answers on both the apex and www, and CloudFront
 * serves the same bytes for either, so every page has to name one of them as
 * the real address or search engines index two copies of it.
 */
export const SITE_ORIGIN = 'https://mattsauro.com';

/**
 * Sets <title> and the description/OG tags per route. Because every route is
 * prerendered, these end up in the static HTML — which is the whole point of
 * SSG here: crawlers and link-preview bots never run our JavaScript.
 */
@Injectable({ providedIn: 'root' })
export class SeoTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly doc = inject(DOCUMENT);

  override updateTitle(state: RouterStateSnapshot): void {
    const routeTitle = this.buildTitle(state);
    const full = routeTitle ? `${routeTitle} · ${SITE_NAME}` : SITE_NAME;
    this.title.setTitle(full);

    const description =
      this.deepestData(state, 'description') ??
      'Senior software engineer building the APIs behind background screening.';

    const canonical = this.canonicalUrl(state.url);

    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: full });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:url', content: canonical });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.setCanonicalLink(canonical);
  }

  /**
   * Absolute URL for the current route, minus any query string or fragment —
   * those address the same page and must not split it into several canonicals.
   */
  private canonicalUrl(url: string): string {
    const path = url.split(/[?#]/, 1)[0].replace(/\/+$/, '');
    return `${SITE_ORIGIN}${path || '/'}`;
  }

  /**
   * `Meta` only manages <meta> tags, so the canonical <link> is handled by hand.
   * Reuses the existing element rather than appending, or a client-side
   * navigation would leave a trail of stale canonicals in the head.
   */
  private setCanonicalLink(href: string): void {
    const head = this.doc.head;
    let link = head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      head.appendChild(link);
    }
    link.setAttribute('href', href);
  }

  private deepestData(state: RouterStateSnapshot, key: string): string | undefined {
    let route = state.root;
    let value: string | undefined;
    while (route) {
      value = (route.data[key] as string | undefined) ?? value;
      route = route.firstChild!;
    }
    return value;
  }
}
