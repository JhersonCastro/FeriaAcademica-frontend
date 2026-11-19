import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { EventRegistrationDto } from '../../../core/models/attendance';
import { TurnoutPage } from './turnout-page';

const EVENT_ID = 'e1';

/** The page only needs to hear the stream; the browser's connection logic is not under test. */
class FakeEventSource {
  static instances: FakeEventSource[] = [];
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private readonly listeners = new Map<string, (event: MessageEvent<string>) => void>();

  constructor(readonly url: string) {
    FakeEventSource.instances.push(this);
  }

  addEventListener(name: string, listener: (event: MessageEvent<string>) => void): void {
    this.listeners.set(name, listener);
  }

  close(): void {}

  emit(name: string, data: unknown): void {
    this.listeners.get(name)?.({ data: JSON.stringify(data) } as MessageEvent<string>);
  }
}

function row(
  id: string,
  name: string,
  enteredAt: string | null,
  status: EventRegistrationDto['status'] = 'Registered',
): EventRegistrationDto {
  return {
    registrationId: id,
    userId: `u-${id}`,
    fullName: name,
    email: `${id}@test.edu.co`,
    status,
    enteredAt,
  };
}

describe('TurnoutPage', () => {
  let http: HttpTestingController;
  let root: HTMLElement;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    FakeEventSource.instances = [];
    vi.stubGlobal('EventSource', FakeEventSource);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'events/:eventId/attendance', component: TurnoutPage }]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/events/${EVENT_ID}/attendance`);
    root = harness.routeNativeElement as HTMLElement;
    http.expectOne('/api/events').flush([]);
    await new Promise((resolve) => setTimeout(resolve)); // the poll starts on a 0 ms timer
    http
      .expectOne(`/api/events/${EVENT_ID}/attendance/summary`)
      .flush({ eventId: EVENT_ID, registered: 3, entered: 2, pending: 1, lastEntryAt: null });
    harness.detectChanges();
  });

  afterEach(() => {
    http.verify();
    vi.unstubAllGlobals();
  });

  function openEntered(rows: EventRegistrationDto[]): void {
    const tab = [...root.querySelectorAll<HTMLButtonElement>('.subtabs__link')].find((el) =>
      el.textContent?.includes('Ingresados'),
    );
    tab!.click();
    harness.detectChanges();
    http.expectOne(`/api/events/${EVENT_ID}/registrations`).flush(rows);
    harness.detectChanges();
  }

  it('does not ask for the registrations until the "Ingresados" tab is opened', () => {
    http.expectNone(`/api/events/${EVENT_ID}/registrations`);
    expect(root.textContent).toContain('Ingresados / inscritos');
  });

  it('lists who entered, the latest first, leaving out who did not and the cancelled', () => {
    openEntered([
      row('a', 'Ana', '2026-11-20T10:00:00Z'),
      row('b', 'Beto', null),
      row('c', 'Carla', '2026-11-20T11:00:00Z'),
      row('d', 'Diego', '2026-11-20T12:00:00Z', 'Cancelled'),
    ]);

    const names = [...root.querySelectorAll('tbody tr td:first-child')].map((el) =>
      el.textContent?.trim(),
    );
    expect(names).toEqual(['Carla', 'Ana']);
    expect(root.textContent).not.toContain('Ingresados / inscritos');
  });

  it('says so when nobody has entered yet', () => {
    openEntered([row('a', 'Ana', null)]);

    expect(root.textContent).toContain('Todavía nadie ha hecho check-in.');
  });

  it('follows the attendance of the event over its stream', () => {
    const stream = FakeEventSource.instances[0];
    expect(stream.url).toBe(`/api/events/${EVENT_ID}/attendance/stream`);

    stream.onopen?.();
    harness.detectChanges();
    expect(root.textContent).toContain('en tiempo real');
    // Reconnecting asks once for the figures that moved while it was not connected.
    http
      .expectOne(`/api/events/${EVENT_ID}/attendance/summary`)
      .flush({ eventId: EVENT_ID, registered: 3, entered: 2, pending: 1, lastEntryAt: null });

    stream.emit('summary', {
      eventId: EVENT_ID,
      registered: 3,
      entered: 3,
      pending: 0,
      lastEntryAt: null,
    });
    harness.detectChanges();

    expect(root.querySelector('.turnout__figure')?.textContent).toContain('3');
    expect(root.querySelector('.turnout__figure')?.textContent).toContain('/ 3');
  });

  it('adds whoever just entered to the list without asking for it again', () => {
    const stream = FakeEventSource.instances[0];
    openEntered([row('a', 'Ana', '2026-11-20T10:00:00Z')]);

    stream.emit('entered', row('c', 'Carla', '2026-11-20T11:00:00Z'));
    harness.detectChanges();

    const names = [...root.querySelectorAll('tbody tr td:first-child')].map((el) =>
      el.textContent?.trim(),
    );
    expect(names).toEqual(['Carla', 'Ana']);
  });

  it('shows the error when the list cannot be loaded', () => {
    const tab = [...root.querySelectorAll<HTMLButtonElement>('.subtabs__link')][1];
    tab.click();
    harness.detectChanges();
    http
      .expectOne(`/api/events/${EVENT_ID}/registrations`)
      .flush({ title: 'fallo' }, { status: 500, statusText: 'Server Error' });
    harness.detectChanges();

    expect(root.textContent).toContain('No pudimos cargar la lista de ingresados');
  });
});
