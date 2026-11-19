import { TestBed } from '@angular/core/testing';
import { RECONNECT_MS, RealtimeMessage, RealtimeService } from './realtime.service';

class FakeEventSource {
  static readonly CLOSED = 2;
  static instances: FakeEventSource[] = [];

  readyState = 0;
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;
  private readonly listeners = new Map<string, (event: MessageEvent<string>) => void>();

  constructor(
    readonly url: string,
    readonly init?: EventSourceInit,
  ) {
    FakeEventSource.instances.push(this);
  }

  addEventListener(name: string, listener: (event: MessageEvent<string>) => void): void {
    this.listeners.set(name, listener);
  }

  close(): void {
    this.closed = true;
  }

  emit(name: string, data: string): void {
    this.listeners.get(name)?.({ data } as MessageEvent<string>);
  }
}

describe('RealtimeService', () => {
  let service: RealtimeService;
  let received: RealtimeMessage[];

  beforeEach(() => {
    vi.useFakeTimers();
    FakeEventSource.instances = [];
    vi.stubGlobal('EventSource', FakeEventSource);
    service = TestBed.inject(RealtimeService);
    received = [];
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('opens the stream with the session cookie and reports when it is connected', () => {
    service.watch('/api/notifications/stream', ['notification']).subscribe((m) => received.push(m));
    const source = FakeEventSource.instances[0];
    source.onopen?.();

    expect(source.url).toBe('/api/notifications/stream');
    expect(source.init).toEqual({ withCredentials: true });
    expect(received).toEqual([{ kind: 'open' }]);
  });

  it('passes on the events it was asked for, parsed from JSON', () => {
    service.watch('/s', ['summary']).subscribe((m) => received.push(m));
    FakeEventSource.instances[0].emit('summary', '{"entered":3}');

    expect(received).toEqual([{ kind: 'event', name: 'summary', data: { entered: 3 } }]);
  });

  it('drops a payload that is not JSON', () => {
    service.watch('/s', ['summary']).subscribe((m) => received.push(m));
    FakeEventSource.instances[0].emit('summary', 'hola');

    expect(received).toEqual([]);
  });

  it('says it is down but lets the browser retry while it is reconnecting', () => {
    service.watch('/s', []).subscribe((m) => received.push(m));
    FakeEventSource.instances[0].onerror?.();

    expect(received).toEqual([{ kind: 'down' }]);
    expect(FakeEventSource.instances).toHaveLength(1);
  });

  it('opens a new connection later when the browser gave up for good', () => {
    service.watch('/s', []).subscribe((m) => received.push(m));
    const first = FakeEventSource.instances[0];
    first.readyState = FakeEventSource.CLOSED;
    first.onerror?.();

    expect(first.closed).toBe(true);
    vi.advanceTimersByTime(RECONNECT_MS);
    expect(FakeEventSource.instances).toHaveLength(2);
  });

  it('closes the connection and stops retrying when the subscriber leaves', () => {
    const subscription = service.watch('/s', []).subscribe();
    const first = FakeEventSource.instances[0];
    first.readyState = FakeEventSource.CLOSED;
    first.onerror?.();
    subscription.unsubscribe();
    vi.advanceTimersByTime(RECONNECT_MS);

    expect(FakeEventSource.instances).toHaveLength(1);
  });

  it('closes the open connection on unsubscribe', () => {
    const subscription = service.watch('/s', []).subscribe();
    subscription.unsubscribe();

    expect(FakeEventSource.instances[0].closed).toBe(true);
  });
});
