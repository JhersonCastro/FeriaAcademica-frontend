import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EventStageDto } from '../../../core/events/events.service';
import { EventTimeline } from './event-timeline';

const DAY = 24 * 60 * 60 * 1000;
const at = (days: number): string => new Date(Date.now() + days * DAY).toISOString();

function stage(
  type: EventStageDto['type'],
  order: number,
  startDays: number | null,
  endDays: number | null,
): EventStageDto {
  return {
    type,
    order,
    status: 'Scheduled',
    startDate: startDays === null ? null : at(startDays),
    endDate: endDays === null ? null : at(endDays),
  };
}

describe('EventTimeline', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<EventTimeline>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EventTimeline);
    fixture.componentRef.setInput('eventId', 'e1');
    fixture.componentRef.setInput('eventName', 'FIET 2026');
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  function load(stages: EventStageDto[]): HTMLElement {
    http.expectOne('/api/events/e1/stages').flush(stages);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('says it is loading until the stages arrive', () => {
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Cargando las etapas');
    load([]);
  });

  it('shows each stage with its state and says which one is running now', () => {
    const root = load([
      stage('Configuration', 1, -20, -10),
      stage('Reception', 4, -2, 10),
      stage('Evaluation', 7, 11, 15),
    ]);
    const text = root.textContent ?? '';

    expect(root.querySelectorAll('.step')).toHaveLength(3);
    expect(text).toContain('Finalizada');
    expect(text).toContain('En curso');
    expect(text).toContain('Pendiente');
    expect(text).toContain('Ahora: Recepción de trabajos');
    expect(root.querySelectorAll('.step--now')).toHaveLength(1);
  });

  it('tells the person until when they can send works while the reception is open', () => {
    const root = load([stage('Reception', 4, -2, 10)]);

    expect(root.textContent).toContain('Puedes subir tus trabajos hasta el');
  });

  it('says when the reception opens if it has not started', () => {
    const root = load([stage('Reception', 4, 3, 10)]);

    expect(root.textContent).toContain('La recepción de trabajos abre el');
    expect(root.textContent).toContain('Próxima: Recepción de trabajos');
  });

  it('says the reception is closed once it ended', () => {
    const root = load([stage('Reception', 4, -10, -2)]);

    expect(root.textContent).toContain('La recepción de trabajos cerró el');
    expect(root.textContent).toContain('Etapas finalizadas');
  });

  it('puts the stages in the backend sequence, whatever order they arrive in', () => {
    const root = load([stage('Evaluation', 7, 11, 15), stage('Configuration', 1, -20, -10)]);
    const names = [...root.querySelectorAll('.step__name')].map((el) => el.textContent?.trim());

    expect(names).toEqual(['Configuración', 'Evaluación']);
  });

  it('says so when the fair has no stages yet', () => {
    const root = load([]);

    expect(root.textContent).toContain('Esta feria todavía no tiene etapas programadas.');
  });

  it('shows an error when the stages cannot be read', () => {
    http
      .expectOne('/api/events/e1/stages')
      .flush({ title: 'fallo' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'No pudimos cargar la línea de tiempo',
    );
  });
});
