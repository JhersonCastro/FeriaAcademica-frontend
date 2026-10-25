/** Time between two decode attempts; enough for a fluid read without draining a phone battery. */
const SCAN_INTERVAL_MS = 150;
/** jsQR works on downscaled frames: faster, and QR codes held at the door stay readable. */
const MAX_FRAME_WIDTH = 640;

type Decoder = (video: HTMLVideoElement) => Promise<string | null>;

// BarcodeDetector is not in TypeScript's DOM lib yet.
interface BarcodeDetectorLike {
  detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>;
}
interface BarcodeDetectorConstructor {
  new (options: { formats: string[] }): BarcodeDetectorLike;
  getSupportedFormats(): Promise<string[]>;
}

export type CameraErrorKind = 'insecure' | 'unsupported' | 'denied' | 'not-found' | 'busy' | 'unknown';

export class CameraError extends Error {
  constructor(readonly kind: CameraErrorKind) {
    super(kind);
  }
}

/**
 * Reads QR codes from the back camera into `onCode`. Uses the native BarcodeDetector when the
 * browser has it (Chrome on Android) and jsQR otherwise (iPhone Safari, desktop browsers).
 * It keeps reading the same code many times per second: callers decide what to ignore.
 */
export class QrCamera {
  private stream: MediaStream | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private decoder: Decoder | null = null;

  constructor(
    private readonly video: HTMLVideoElement,
    private readonly onCode: (text: string) => void,
  ) {}

  get active(): boolean {
    return this.stream !== null;
  }

  async start(): Promise<void> {
    if (!window.isSecureContext) {
      throw new CameraError('insecure');
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new CameraError('unsupported');
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
    } catch (error) {
      throw new CameraError(cameraErrorKind(error));
    }

    this.video.srcObject = this.stream;
    await this.video.play();
    this.decoder ??= await createDecoder();
    this.scheduleNext(0);
  }

  stop(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.video.srcObject = null;
  }

  private scheduleNext(delay = SCAN_INTERVAL_MS): void {
    this.timer = setTimeout(() => void this.readFrame(), delay);
  }

  private async readFrame(): Promise<void> {
    if (!this.stream || !this.decoder) {
      return;
    }
    if (this.video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
      const text = await this.decoder(this.video).catch(() => null);
      if (text && this.stream) {
        this.onCode(text);
      }
    }
    if (this.stream) {
      this.scheduleNext();
    }
  }
}

async function createDecoder(): Promise<Decoder> {
  const Detector = (globalThis as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
  const formats = Detector ? await Detector.getSupportedFormats().catch((): string[] => []) : [];
  if (Detector && formats.includes('qr_code')) {
    const detector = new Detector({ formats: ['qr_code'] });
    return async (video) => (await detector.detect(video))[0]?.rawValue ?? null;
  }

  const jsQR = (await import('jsqr')).default;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new CameraError('unsupported');
  }
  return async (video) => {
    const scale = Math.min(1, MAX_FRAME_WIDTH / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frame = context.getImageData(0, 0, canvas.width, canvas.height);
    return jsQR(frame.data, frame.width, frame.height, { inversionAttempts: 'dontInvert' })?.data ?? null;
  };
}

function cameraErrorKind(error: unknown): CameraErrorKind {
  const name = error instanceof DOMException ? error.name : '';
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'denied';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'not-found';
    case 'NotReadableError':
      return 'busy';
    default:
      return 'unknown';
  }
}
