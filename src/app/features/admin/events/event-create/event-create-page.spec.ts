import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { EventSummary } from '../../../../core/events/events.service';
import { InstitutionDto } from '../../../../core/institutions/institutions.service';
import { EventCreatePage } from './event-create-page';

function fair(id: string, institutionId: string, name: string): EventSummary {
  return {
    id,
    institutionId,
    name,
    status: 'Published',
    startDate: null,
    endDate: null,
    capacity: null,
    registered: 0,
    availableSeats: null,
    submissionDeadline: null,
  };
}

function institution(id: string, name: string, isActive = true): InstitutionDto {
  return { id, name, acronym: null, isActive, eventCount: 0 };
}

describe('EventCreatePage', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let root: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'admin/events/new', component: EventCreatePage },
          { path: 'admin/events/:eventId', children: [] },
        ]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function open(institutions: InstitutionDto[]): Promise<void> {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/events/new', EventCreatePage);
    http.expectOne('/api/institutions').flush(institutions);
    harness.detectChanges();
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

  it('creates the fair in the only institution that exists and opens its configuration', async () => {
    await open([institution('inst-1', 'Universidad del Cauca')]);

    expect(root.querySelector('#create-event-institution')).toBeNull();
    expect(root.textContent).toContain('Se crea en la única institución disponible.');

    type('#create-event-name', '  FIET 2027  ');
    type('#create-event-capacity', '120');
    submit();

    const request = http.expectOne((req) => req.method === 'POST' && req.url === '/api/events');
    expect(request.request.body).toEqual({
      institutionId: 'inst-1',
      name: 'FIET 2027',
      capacity: 120,
    });
    request.flush({ id: 'e3' });
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/admin/events/e3');
  });

  it('leaves the seats unlimited when the capacity is empty', async () => {
    await open([institution('inst-1', 'Universidad del Cauca')]);

    type('#create-event-name', 'Feria Empresarial');
    submit();

    const request = http.expectOne((req) => req.method === 'POST' && req.url === '/api/events');
    expect(request.request.body).toEqual({
      institutionId: 'inst-1',
      name: 'Feria Empresarial',
      capacity: null,
    });
    request.flush({ id: 'e9' });
  });

  it('asks for the institution when there is more than one and does not send an incomplete form', async () => {
    await open([
      institution('inst-1', 'Universidad del Cauca'),
      institution('inst-2', 'Otra universidad'),
    ]);

    expect(root.querySelector('#create-event-institution')).not.toBeNull();
    type('#create-event-name', 'Feria nueva');
    submit();

    expect(root.textContent).toContain('Selecciona una institución.');
    http.expectNone((req) => req.method === 'POST');
  });

  it('requires a name', async () => {
    await open([institution('inst-1', 'Universidad del Cauca')]);

    submit();

    expect(root.textContent).toContain('Ingresa el nombre de la feria.');
    http.expectNone((req) => req.method === 'POST');
  });

  it('only offers active institutions', async () => {
    await open([
      institution('inst-1', 'Universidad del Cauca'),
      institution('inst-2', 'Otra universidad', false),
    ]);

    expect(root.querySelector('#create-event-institution')).toBeNull();
    type('#create-event-name', 'Feria nueva');
    submit();

    expect(http.expectOne((req) => req.method === 'POST').request.body.institutionId).toBe(
      'inst-1',
    );
  });

  it('explains that no fair can be created while there is no active institution', async () => {
    await open([]);

    expect(root.textContent).toContain('Todavía no hay una institución disponible');
    expect(root.querySelector('form')).toBeNull();
  });

  it('shows the backend error', async () => {
    await open([institution('inst-1', 'Universidad del Cauca')]);

    type('#create-event-name', 'FIET 2027');
    submit();
    http
      .expectOne((req) => req.method === 'POST')
      .flush(
        { title: 'Business rule violation', detail: 'Name is required.', status: 400 },
        { status: 400, statusText: 'Bad Request' },
      );
    harness.detectChanges();

    expect(root.textContent).toContain('El nombre de la feria es obligatorio.');
  });
});
