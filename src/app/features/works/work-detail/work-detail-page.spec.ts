import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { WorkArtifactDto, WorkDto } from '../../../core/models/work';
import { WorkDetailPage } from './work-detail-page';

const OPEN_CALL = '2099-01-01T00:00:00Z';
const CLOSED_CALL = '2020-01-01T00:00:00Z';

const LINK: WorkArtifactDto = {
  id: 'a1',
  type: 'Document',
  version: 1,
  fileUrl: null,
  linkUrl: 'https://example.org/informe',
  uploadedAt: '2026-10-28T12:00:00Z',
};

function work(overrides: Partial<WorkDto> = {}): WorkDto {
  return {
    id: 'w1',
    participationId: 'p1',
    eventId: 'e1',
    eventName: 'FIET 2026',
    professorId: 'prof1',
    title: 'Sistema de riego',
    summary: null,
    status: 'Draft',
    currentAttempt: 1,
    rejectionCount: 0,
    maxRejections: 3,
    submittedAt: null,
    submissionDeadline: OPEN_CALL,
    closure: null,
    closureReason: null,
    closedAt: null,
    artifacts: [],
    reviews: [],
    ...overrides,
  };
}

describe('WorkDetailPage actions', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'works/:workId', component: WorkDetailPage }]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function open(dto: WorkDto): Promise<HTMLElement> {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/works/${dto.id}`, WorkDetailPage);
    http.expectOne(`/api/works/${dto.id}`).flush(dto);
    harness.detectChanges();
    return harness.routeNativeElement as HTMLElement;
  }

  function button(root: HTMLElement, label: string): HTMLButtonElement | undefined {
    return [...root.querySelectorAll('button')].find((item) => item.textContent?.trim() === label);
  }

  function click(root: HTMLElement, label: string): void {
    const target = button(root, label);
    expect(target, `button "${label}"`).toBeDefined();
    target!.click();
    harness.detectChanges();
  }

  /** Picks a file the way the browser does: through the hidden input of the drop zone. */
  function choose(root: HTMLElement, file: File): void {
    const input = root.querySelector<HTMLInputElement>('#replace-file')!;
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));
    harness.detectChanges();
  }

  const FINAL = { ...LINK, id: 'a2', version: 2, isFinal: true };
  const PDF = (): File =>
    new File(['%PDF-1.4 contenido'], 'final.pdf', { type: 'application/pdf' });

  it('offers the final version only to an approved work that has none', async () => {
    const approved = await open(work({ status: 'Admitted', artifacts: [LINK] }));

    expect(approved.textContent).toContain('Entregar la versión final');
    expect(button(approved, 'Entregar versión final')).toBeDefined();
  });

  it('does not offer it again once it was delivered, and says so', async () => {
    const root = await open(work({ status: 'Admitted', artifacts: [LINK, FINAL] }));

    expect(root.textContent).not.toContain('Entregar la versión final');
    expect(root.textContent).toContain('Ya entregaste la versión final.');
  });

  it.each(['Draft', 'Submitted', 'InReview'] as const)(
    'does not offer it while the work is %s',
    async (status) => {
      const root = await open(work({ status, artifacts: [LINK] }));

      expect(root.textContent).not.toContain('Entregar la versión final');
    },
  );

  it('asks before delivering the final version, sends the PDF as a form and then hides the section', async () => {
    const root = await open(work({ status: 'Admitted', artifacts: [LINK] }));

    choose(root, PDF());
    click(root, 'Entregar versión final');
    expect(root.textContent).toContain('¿Entregar la versión final?');
    http.expectNone('/api/works/w1/final-version');

    click(root, 'Sí, entregar');
    const request = http.expectOne('/api/works/w1/final-version');
    expect(request.request.method).toBe('POST');
    const body = request.request.body as FormData;
    expect((body.get('file') as File).name).toBe('final.pdf');
    expect(body.has('type')).toBe(false);
    request.flush({ id: 'a2', version: 2 });
    http.expectOne('/api/works/w1').flush(work({ status: 'Admitted', artifacts: [LINK, FINAL] }));
    harness.detectChanges();

    expect(root.textContent).toContain('Entregaste la versión final de tu trabajo.');
    expect(button(root, 'Entregar versión final')).toBeUndefined();
  });

  it('asks for the file before anything else', async () => {
    const root = await open(work({ status: 'Admitted', artifacts: [LINK] }));

    click(root, 'Entregar versión final');

    expect(root.textContent).toContain('Elige un archivo PDF para continuar.');
    expect(root.textContent).not.toContain('¿Entregar la versión final?');
    http.expectNone('/api/works/w1/final-version');
  });

  it('refuses a file that is not a PDF without calling the API', async () => {
    const root = await open(work({ status: 'Admitted', artifacts: [LINK] }));

    choose(root, new File(['texto'], 'final.docx'));
    click(root, 'Entregar versión final');

    expect(root.textContent).toContain('Solo se aceptan archivos PDF.');
    http.expectNone('/api/works/w1/final-version');
  });

  it('shows what the backend answers when the delivery is refused', async () => {
    const dto = work({ status: 'Admitted', artifacts: [LINK] });
    const root = await open(dto);

    choose(root, PDF());
    click(root, 'Entregar versión final');
    click(root, 'Sí, entregar');
    http.expectOne('/api/works/w1/final-version').flush(
      {
        title: 'Business rule violation',
        detail: 'The final version was already submitted.',
        status: 400,
      },
      { status: 400, statusText: 'Bad Request' },
    );
    http.expectOne('/api/works/w1').flush(dto);
    harness.detectChanges();

    expect(root.textContent).toContain('La versión final ya fue entregada.');
  });

  it('lists what a draft still needs before it can be sent', async () => {
    const root = await open(work());
    const items = [...root.querySelectorAll('.checklist__item')].map((item) =>
      item.classList.contains('checklist__item--pending'),
    );
    expect(root.textContent).toContain('Antes de enviar');
    expect(items).toEqual([true, false]);
  });

  it('asks before withdrawing a draft and only then calls the API', async () => {
    const root = await open(work());

    click(root, 'Retirar trabajo');
    expect(root.textContent).toContain('¿Retirar este trabajo?');
    http.expectNone('/api/works/w1/withdraw');

    click(root, 'Sí, retirar');
    const request = http.expectOne('/api/works/w1/withdraw');
    expect(request.request.method).toBe('POST');
    request.flush(null);
    http.expectOne('/api/works/w1').flush(work({ status: 'Cancelled' }));
    harness.detectChanges();

    expect(root.textContent).toContain('Retiraste el trabajo: quedó cancelado.');
    expect(root.textContent).toContain('Trabajo cancelado');
  });

  it('does nothing when the confirmation is cancelled', async () => {
    const root = await open(work());

    click(root, 'Retirar trabajo');
    click(root, 'Cancelar');

    expect(root.textContent).not.toContain('¿Retirar este trabajo?');
    http.expectNone('/api/works/w1/withdraw');
  });

  it('asks before sending a draft and posts the submission afterwards', async () => {
    const root = await open(work({ artifacts: [LINK] }));

    click(root, 'Enviar sin cambios');
    expect(root.textContent).toContain('¿Enviar el trabajo a revisión?');
    http.expectNone('/api/works/w1/submit');

    click(root, 'Sí, enviar');
    http.expectOne('/api/works/w1/submit').flush(null);
    http.expectOne('/api/works/w1').flush(work({ status: 'Submitted', artifacts: [LINK] }));
  });

  it('lets a submitted work nobody opened go back to draft after confirming', async () => {
    const root = await open(work({ status: 'Submitted', artifacts: [LINK] }));

    click(root, 'Devolver a Borrador');
    expect(root.textContent).toContain('Perderás tu lugar en la cola de revisión');

    click(root, 'Sí, devolver');
    const request = http.expectOne('/api/works/w1/withdraw');
    expect(request.request.method).toBe('POST');
    request.flush(null);
    http.expectOne('/api/works/w1').flush(work({ status: 'Draft', artifacts: [LINK] }));
  });

  it('blocks withdrawing a work that is already in review', async () => {
    const root = await open(work({ status: 'InReview', artifacts: [LINK] }));

    const blocked = button(root, 'Devolver a Borrador');
    expect(blocked?.disabled).toBe(true);
    expect(root.textContent).toContain('Una vez en revisión no puedes retirar el trabajo.');
    expect(button(root, 'Retirar trabajo')).toBeUndefined();
  });

  it('offers no way back once the deadline has passed', async () => {
    const root = await open(
      work({ status: 'Submitted', artifacts: [LINK], submissionDeadline: CLOSED_CALL }),
    );

    expect(button(root, 'Devolver a Borrador')).toBeUndefined();
    expect(root.textContent).toContain('La convocatoria está cerrada');
  });

  it('marks the final version in the list of attachments', async () => {
    const root = await open(
      work({
        status: 'Admitted',
        artifacts: [LINK, { ...LINK, id: 'a2', version: 2, isFinal: true }],
      }),
    );

    expect(root.textContent?.match(/Versión final/g)).toHaveLength(1);
  });
});
