import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { EventSummary } from '../../../../core/events/events.service';
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

  async function open(events: EventSummary[]): Promise<void> {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/events/new', EventCreatePage);
    http.expectOne('/api/events').flush(events);
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
    await open([fair('e1', 'inst-1', 'FIET 2026'), fair('e2', 'inst-1', 'FIET 2025')]);

    expect(root.querySelector('#create-event-institution')).toBeNull();
    expect(root.textContent).toContain('Se crea en la misma institución de las ferias existentes.');

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
    await open([fair('e1', 'inst-1', 'FIET 2026')]);

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
    await open([fair('e1', 'inst-1', 'FIET 2026'), fair('e2', 'inst-2', 'Feria Empresarial')]);

    expect(root.querySelector('#create-event-institution')).not.toBeNull();
    type('#create-event-name', 'Feria nueva');
    submit();

    expect(root.textContent).toContain('Selecciona una institución.');
    http.expectNone((req) => req.method === 'POST');
  });

  it('requires a name', async () => {
    await open([fair('e1', 'inst-1', 'FIET 2026')]);

    submit();

    expect(root.textContent).toContain('Ingresa el nombre de la feria.');
    http.expectNone((req) => req.method === 'POST');
  });

  it('explains that no fair can be created while no institution is known', async () => {
    await open([]);

    expect(root.textContent).toContain('Todavía no hay una institución disponible');
    expect(root.querySelector('form')).toBeNull();
  });

  it('shows the backend error', async () => {
    await open([fair('e1', 'inst-1', 'FIET 2026')]);

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
