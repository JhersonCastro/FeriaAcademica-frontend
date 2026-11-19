import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AssignedWorkDto, WorkArtifactDto } from '../../../core/models/work';
import { ReviewWorkPage } from '../review-work/review-work-page';
import { ApprovedWorksPage } from './approved-works-page';

const FINAL: WorkArtifactDto = {
  id: 'a1',
  type: 'Document',
  version: 2,
  fileUrl: '/api/works/w1/files/f1',
  linkUrl: null,
  uploadedAt: '2026-11-19T12:00:00Z',
  isFinal: true,
  fileName: 'sistema-riego-final.pdf',
  sizeBytes: 2.4 * 1024 * 1024,
};

function work(overrides: Partial<AssignedWorkDto> = {}): AssignedWorkDto {
  return {
    id: 'w1',
    eventId: 'e1',
    eventName: 'FIET 2026',
    title: 'Sistema de riego',
    summary: null,
    status: 'Admitted',
    currentAttempt: 2,
    rejectionCount: 1,
    maxRejections: 3,
    enqueuedAt: null,
    artifacts: [FINAL],
    ...overrides,
  };
}

describe('Approved works of a reviewer', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'reviews/approved', component: ApprovedWorksPage },
          { path: 'reviews/:workId', component: ReviewWorkPage },
        ]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function openList(works: AssignedWorkDto[]): Promise<HTMLElement> {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/reviews/approved', ApprovedWorksPage);
    http.expectOne('/api/reviews/approved').flush(works);
    harness.detectChanges();
    return harness.routeNativeElement as HTMLElement;
  }

  async function openWork(
    assigned: AssignedWorkDto[],
    approved: AssignedWorkDto[] | null,
  ): Promise<HTMLElement> {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/reviews/w1', ReviewWorkPage);
    http.expectOne('/api/reviews/assigned').flush(assigned);
    if (approved) {
      http.expectOne('/api/reviews/approved').flush(approved);
    }
    harness.detectChanges();
    return harness.routeNativeElement as HTMLElement;
  }

  it('shows the Pendientes and Aprobados tabs, with Aprobados active', async () => {
    const root = await openList([]);
    const tabs = [...root.querySelectorAll('.subtabs__link')];

    expect(tabs.map((tab) => tab.textContent?.trim())).toEqual(['Pendientes', 'Aprobados']);
    expect(tabs[1].classList.contains('subtabs__link--active')).toBe(true);
  });

  it('lists each approved work and whether its final version arrived', async () => {
    const pending = work({ id: 'w2', title: 'Red de sensores', artifacts: [] });
    const root = await openList([work(), pending]);
    const text = root.textContent ?? '';

    expect(text).toContain('Sistema de riego');
    expect(text).toContain('Entregada');
    expect(text).toContain('Red de sensores');
    expect(text).toContain('Pendiente');
    expect(root.querySelectorAll('tbody tr')).toHaveLength(2);
  });

  it('says so when no work was approved yet', async () => {
    const root = await openList([]);

    expect(root.textContent).toContain('Todavía no has aprobado ningún trabajo.');
  });

  it('opens an approved work read-only, with its file name and no decision form', async () => {
    const root = await openWork([], [work()]);
    const text = root.textContent ?? '';

    expect(text).toContain('Trabajo aprobado');
    expect(text).toContain('sistema-riego-final.pdf');
    expect(text).toContain('2,4 MB');
    expect(text).toContain('Versión final');
    expect(text).toContain('El estudiante entregó la versión final');
    expect(text).not.toContain('Guardar decisión');
  });

  it('says the final version is still missing when the student has not delivered it', async () => {
    const root = await openWork([], [work({ artifacts: [{ ...FINAL, isFinal: false }] })]);

    expect(root.textContent).toContain('Todavía no hay versión final');
  });

  it('keeps the decision form for a work that is still pending and never asks for approved ones', async () => {
    const root = await openWork([work({ status: 'InReview' })], null);

    expect(root.textContent).toContain('Guardar decisión');
    expect(root.textContent).not.toContain('Estado de la entrega');
  });

  it('says the work is not in the reviewer lists when it is in neither', async () => {
    const root = await openWork([], []);

    expect(root.textContent).toContain('Este trabajo ya no está en tu bandeja');
  });
});
