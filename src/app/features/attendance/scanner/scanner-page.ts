import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { apiErrorMessage, translateApiMessage } from '../../../core/api/api-error';
import { AttendanceService } from '../../../core/attendance/attendance.service';
import { injectEventName } from '../../../core/events/event-name';
import { ScanOutcome, ScanResultDto } from '../../../core/models/attendance';
import { CameraError, CameraErrorKind, QrCamera } from '../../../shared/qr/qr-camera';

/** How long a result stays on screen; reading is paused meanwhile. */
const RESULT_DISPLAY_MS = 1800;
/** The same QR is still in front of the camera after a result: ignore it for this long. */
const SAME_CODE_COOLDOWN_MS = 5000;
/** A scan answers in milliseconds; show a loader only when it takes longer than this. */
const SLOW_REQUEST_MS = 300;
const HISTORY_SIZE = 8;

type CameraState = 'off' | 'starting' | 'on' | 'error';
type Phase = 'ready' | 'sending' | 'result' | 'failed';

interface ScanFailure {
  message: string;
  /** Set for network errors: resending the same QR is safe, the backend never duplicates. */
  retryToken: string | null;
}

interface ScanLogEntry {
  id: number;
  outcome: ScanOutcome;
  attendeeName: string | null;
  message: string;
  scannedAt: Date;
  enteredAt: string | null;
}

const CAMERA_MESSAGES: Record<CameraErrorKind, string> = {
  insecure:
    'La cámara solo funciona con HTTPS o en localhost. Abre la aplicación con https:// para escanear.',
  unsupported: 'Este navegador no permite usar la cámara. Usa el ingreso manual.',
  denied:
    'No diste permiso para usar la cámara. Actívalo en la configuración del navegador y vuelve a intentarlo.',
  'not-found': 'No encontramos una cámara en este dispositivo.',
  busy: 'La cámara está en uso por otra aplicación. Ciérrala y vuelve a intentarlo.',
  unknown: 'No pudimos abrir la cámara. Vuelve a intentarlo.',
};

export const OUTCOME_LABELS: Record<ScanOutcome, string> = {
  Valid: 'Ingreso registrado',
  AlreadyEntered: 'Ya ingresó',
  Invalid: 'QR no válido',
};

/** Door check-in: reads attendee QR codes with the camera and records attendance. */
@Component({
  selector: 'app-scanner-page',
  imports: [DatePipe, RouterLink],
  templateUrl: './scanner-page.html',
  styleUrl: './scanner-page.css',
  host: { class: 'page-content' },
})
export class ScannerPage {
  private readonly attendance = inject(AttendanceService);
  protected readonly eventId = inject(ActivatedRoute).snapshot.paramMap.get('eventId') ?? '';
  protected readonly eventName = injectEventName(this.eventId);
  protected readonly outcomeLabels = OUTCOME_LABELS;
  protected readonly today = new Date();

  private readonly video = viewChild.required<ElementRef<HTMLVideoElement>>('video');
  private camera: QrCamera | null = null;

  protected readonly cameraState = signal<CameraState>('off');
  protected readonly cameraError = signal<string | null>(null);
  protected readonly phase = signal<Phase>('ready');
  protected readonly slow = signal(false);
  /** Result covering the camera while reading is paused. */
  protected readonly overlay = signal<ScanResultDto | null>(null);
  protected readonly failure = signal<ScanFailure | null>(null);
  protected readonly history = signal<ScanLogEntry[]>([]);
  protected readonly manualToken = signal('');

  private lastCode: { text: string; at: number } | null = null;
  private resumeTimer: ReturnType<typeof setTimeout> | null = null;
  private logId = 0;

  constructor() {
    afterNextRender(() => void this.startCamera());
    inject(DestroyRef).onDestroy(() => {
      this.camera?.stop();
      if (this.resumeTimer !== null) {
        clearTimeout(this.resumeTimer);
      }
    });
  }

  protected async startCamera(): Promise<void> {
    this.camera ??= new QrCamera(this.video().nativeElement, (text) => this.onCode(text));
    this.cameraState.set('starting');
    this.cameraError.set(null);
    try {
      await this.camera.start();
      this.cameraState.set('on');
    } catch (error) {
      this.camera.stop();
      this.cameraState.set('error');
      this.cameraError.set(
        CAMERA_MESSAGES[error instanceof CameraError ? error.kind : 'unknown'],
      );
    }
  }

  protected stopCamera(): void {
    this.camera?.stop();
    this.cameraState.set('off');
  }

  protected submitManual(event: Event): void {
    event.preventDefault();
    const token = this.manualToken().trim();
    if (token && this.phase() !== 'sending') {
      this.manualToken.set('');
      this.send(token);
    }
  }

  protected onManualInput(event: Event): void {
    this.manualToken.set((event.target as HTMLInputElement).value);
  }

  protected retry(): void {
    const token = this.failure()?.retryToken;
    this.failure.set(null);
    this.phase.set('ready');
    if (token) {
      this.send(token);
    }
  }

  protected dismissFailure(): void {
    this.failure.set(null);
    this.phase.set('ready');
  }

  private onCode(text: string): void {
    const token = text.trim();
    const repeated =
      this.lastCode?.text === token && Date.now() - this.lastCode.at < SAME_CODE_COOLDOWN_MS;
    if (this.phase() === 'ready' && token && !repeated) {
      this.send(token);
    }
  }

  private send(token: string): void {
    this.lastCode = { text: token, at: Date.now() };
    this.phase.set('sending');
    this.failure.set(null);
    const slowTimer = setTimeout(() => this.slow.set(true), SLOW_REQUEST_MS);

    this.attendance
      .scan(this.eventId, token)
      .pipe(
        finalize(() => {
          clearTimeout(slowTimer);
          this.slow.set(false);
        }),
      )
      .subscribe({
        next: (result) => this.showResult(token, result),
        error: (error: unknown) => {
          const offline = error instanceof HttpErrorResponse && error.status === 0;
          this.phase.set('failed');
          this.failure.set({
            message: offline
              ? 'Sin conexión con el servidor. Revisa la red y reintenta: reenviar el mismo QR no duplica la asistencia.'
              : apiErrorMessage(error),
            retryToken: offline ? token : null,
          });
        },
      });
  }

  private showResult(token: string, result: ScanResultDto): void {
    const localized = { ...result, message: translateApiMessage(result.message) };
    this.overlay.set(localized);
    this.phase.set('result');
    this.history.update((entries) =>
      [
        {
          id: ++this.logId,
          outcome: result.outcome,
          attendeeName: result.attendeeName,
          message: localized.message,
          scannedAt: new Date(),
          enteredAt: result.enteredAt,
        },
        ...entries,
      ].slice(0, HISTORY_SIZE),
    );

    this.resumeTimer = setTimeout(() => {
      this.overlay.set(null);
      this.lastCode = { text: token, at: Date.now() };
      this.phase.set('ready');
    }, RESULT_DISPLAY_MS);
  }
}
