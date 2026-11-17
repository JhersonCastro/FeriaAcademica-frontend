import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { InstitutionFormPage } from './institution-form-page';

describe('InstitutionFormPage', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let root: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'admin/institutions/new', component: InstitutionFormPage },
          { path: 'admin/institutions/:institutionId', component: InstitutionFormPage },
          { path: 'admin/institutions', children: [] },
        ]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function open(url: string): Promise<void> {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, InstitutionFormPage);
    root = harness.routeNativeElement as HTMLElement;
  }

  function type(selector: string, value: string): void {
    const input = root.querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  function submit(): void {
    root.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    harness.detectChanges();
  }

  it('creates an institution and goes back to the list', async () => {
    await open('/admin/institutions/new');

    type('#institution-name', '  Universidad del Cauca  ');
    type('#institution-acronym', ' Unicauca ');
    submit();

    const request = http.expectOne({ method: 'POST', url: '/api/institutions' });
    expect(request.request.body).toEqual({ name: 'Universidad del Cauca', acronym: 'Unicauca' });
    request.flush({ id: 'i1' });
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/admin/institutions');
  });

  it('sends a null acronym when it is empty', async () => {
    await open('/admin/institutions/new');

    type('#institution-name', 'Universidad del Cauca');
    submit();

    const request = http.expectOne({ method: 'POST', url: '/api/institutions' });
    expect(request.request.body).toEqual({ name: 'Universidad del Cauca', acronym: null });
    request.flush({ id: 'i1' });
  });

  it('requires a name', async () => {
    await open('/admin/institutions/new');

    submit();

    expect(root.textContent).toContain('Ingresa el nombre de la institución.');
    http.expectNone((req) => req.method === 'POST');
  });

  it('edits an institution, filling the form from the list', async () => {
    await open('/admin/institutions/i1');
    http
      .expectOne('/api/institutions')
      .flush([{ id: 'i1', name: 'Unicauca', acronym: null, isActive: true, eventCount: 1 }]);
    harness.detectChanges();

    expect(root.querySelector<HTMLInputElement>('#institution-name')!.value).toBe('Unicauca');
    type('#institution-name', 'Universidad del Cauca');
    submit();

    const request = http.expectOne({ method: 'PUT', url: '/api/institutions/i1' });
    expect(request.request.body).toEqual({ name: 'Universidad del Cauca', acronym: null });
    request.flush(null);
  });

  it('shows the backend error', async () => {
    await open('/admin/institutions/new');

    type('#institution-name', 'Universidad del Cauca');
    submit();
    http
      .expectOne({ method: 'POST', url: '/api/institutions' })
      .flush(
        { title: 'Business rule violation', detail: 'Duplicate', status: 400 },
        { status: 400, statusText: 'Bad Request' },
      );
    harness.detectChanges();

    expect(root.querySelector('[role="alert"]')).not.toBeNull();
  });
});
