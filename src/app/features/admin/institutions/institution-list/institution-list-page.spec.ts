import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { InstitutionDto } from '../../../../core/institutions/institutions.service';
import { InstitutionListPage } from './institution-list-page';

function institution(id: string, name: string, isActive = true): InstitutionDto {
  return { id, name, acronym: null, isActive, eventCount: 2 };
}

describe('InstitutionListPage', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let root: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '', component: InstitutionListPage }]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function open(): Promise<void> {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/', InstitutionListPage);
    root = harness.routeNativeElement as HTMLElement;
  }

  it('lists the institutions with their state and fairs', async () => {
    await open();
    http
      .expectOne('/api/institutions')
      .flush([institution('i1', 'Universidad del Cauca'), institution('i2', 'Otra', false)]);
    harness.detectChanges();

    expect(root.textContent).toContain('Universidad del Cauca');
    expect(root.textContent).toContain('Activa');
    expect(root.textContent).toContain('Inactiva');
  });

  it('invites to create the first institution when there is none', async () => {
    await open();
    http.expectOne('/api/institutions').flush([]);
    harness.detectChanges();

    expect(root.textContent).toContain('Todavía no hay instituciones');
  });

  it('shows the error while the backend has no endpoint', async () => {
    await open();
    http.expectOne('/api/institutions').flush(null, { status: 404, statusText: 'Not Found' });
    harness.detectChanges();

    expect(root.querySelector('[role="alert"]')).not.toBeNull();
  });

  it('deactivates an active institution', async () => {
    await open();
    http.expectOne('/api/institutions').flush([institution('i1', 'Universidad del Cauca')]);
    harness.detectChanges();

    root.querySelector<HTMLButtonElement>('tbody button')!.click();
    http.expectOne({ method: 'POST', url: '/api/institutions/i1/deactivate' }).flush(null);
    harness.detectChanges();

    expect(root.textContent).toContain('Inactiva');
    expect(root.querySelector('tbody button')!.textContent).toContain('Activar');
  });
});
