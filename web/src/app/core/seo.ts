import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

export const SITE_NAME = 'Matthew J. Sauro';

/**
 * Sets <title> and the description/OG tags per route. Because every route is
 * prerendered, these end up in the static HTML — which is the whole point of
 * SSG here: crawlers and link-preview bots never run our JavaScript.
 */
@Injectable({ providedIn: 'root' })
export class SeoTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  override updateTitle(state: RouterStateSnapshot): void {
    const routeTitle = this.buildTitle(state);
    const full = routeTitle ? `${routeTitle} · ${SITE_NAME}` : SITE_NAME;
    this.title.setTitle(full);

    const description =
      this.deepestData(state, 'description') ??
      'Software engineer building reliable web and cloud systems.';

    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: full });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
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
