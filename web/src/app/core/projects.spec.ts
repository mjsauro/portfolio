import { TestBed } from '@angular/core/testing';
import { PROJECT_SLUGS, ProjectsStore } from './projects';

describe('ProjectsStore', () => {
  let store: ProjectsStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(ProjectsStore);
  });

  it('sorts projects newest first', () => {
    const years = store.list().map((p) => p.year);
    expect(years).toEqual([...years].sort((a, b) => b - a));
  });

  it('exposes only featured projects via featured()', () => {
    expect(store.featured().every((p) => p.featured)).toBe(true);
  });

  it('resolves every slug that gets prerendered', () => {
    // Guards against PROJECT_SLUGS drifting from the data and emitting dead routes.
    for (const slug of PROJECT_SLUGS) {
      expect(store.bySlug(slug)).toBeDefined();
    }
  });

  it('returns undefined for an unknown slug', () => {
    expect(store.bySlug('does-not-exist')).toBeUndefined();
  });
});
