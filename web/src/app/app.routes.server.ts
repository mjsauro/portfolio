import { RenderMode, ServerRoute } from '@angular/ssr';
import { PROJECT_SLUGS } from './core/projects';

export const serverRoutes: ServerRoute[] = [
  {
    // Emits one static /projects/<slug>/index.html per entry in PROJECTS.
    path: 'projects/:slug',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => PROJECT_SLUGS.map((slug) => ({ slug })),
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
