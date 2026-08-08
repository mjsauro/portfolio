import { Routes } from '@angular/router';

/**
 * Every route is lazily loaded and prerendered to its own index.html.
 * `title` and `data.description` are consumed by SeoTitleStrategy.
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
    title: '',
    data: {
      description:
        'Senior software engineer building the APIs behind background screening — applicant tracking system integrations, post-hire monitoring, and the AWS infrastructure underneath.',
    },
  },
  {
    path: 'projects',
    loadComponent: () => import('./pages/projects/projects-page').then((m) => m.ProjectsPage),
    title: 'Projects',
    data: {
      description:
        'Selected engineering work — ATS integrations, post-hire monitoring, LLM-assisted screening, and infrastructure — each with the problem, approach, and outcome.',
    },
  },
  {
    path: 'projects/:slug',
    loadComponent: () => import('./pages/projects/project-detail').then((m) => m.ProjectDetail),
    title: 'Project',
  },
  {
    path: 'about',
    loadComponent: () => import('./pages/about/about').then((m) => m.About),
    title: 'About',
    data: {
      description:
        'From title insurance underwriting to background screening software: background, experience, technical skills, and how to get in touch.',
    },
  },
  {
    path: 'not-found',
    loadComponent: () => import('./pages/not-found/not-found').then((m) => m.NotFound),
    title: 'Page not found',
  },
  { path: '**', redirectTo: 'not-found' },
];
