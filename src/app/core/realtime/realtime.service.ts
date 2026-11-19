import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** What a watched stream reports: it is connected, it dropped, or the server sent an event. */
export type RealtimeMessage =
  { kind: 'open' } | { kind: 'down' } | { kind: 'event'; name: string; data: unknown };

/** Wait before opening the stream again once the browser gave up on it (e.g. 404 or 401). */
export const RECONNECT_MS = 30_000;

/**
 * Server-Sent Events from the backend. The session cookie travels with the request, so no token
 * is needed. While the connection drops the browser retries by itself; when it gives up for good
 * (the endpoint does not exist yet, or the session ended) the stream is opened again later.
 * Whoever consumes it keeps a fallback (polling) for as long as it reports `down`.
 */
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  /** Unsubscribing closes the connection. Event payloads are JSON; anything else is dropped. */
  watch(path: string, eventNames: readonly string[]): Observable<RealtimeMessage> {
    return new Observable<RealtimeMessage>((subscriber) => {
      if (typeof EventSource === 'undefined') {
        subscriber.next({ kind: 'down' });
        return;
      }

      let source: EventSource | null = null;
      let retry: ReturnType<typeof setTimeout> | undefined;

      const connect = (): void => {
        const current = new EventSource(`${environment.apiBaseUrl}${path}`, {
          withCredentials: true,
        });
        source = current;
        current.onopen = () => subscriber.next({ kind: 'open' });
        current.onerror = () => {
          subscriber.next({ kind: 'down' });
          if (current.readyState === EventSource.CLOSED) {
            current.close();
            retry = setTimeout(connect, RECONNECT_MS);
          }
        };
        for (const name of eventNames) {
          current.addEventListener(name, (event) => {
            try {
              const data: unknown = JSON.parse((event as MessageEvent<string>).data);
              subscriber.next({ kind: 'event', name, data });
            } catch {
              // A payload that is not JSON is not for us.
            }
          });
        }
      };

      connect();
      return () => {
        clearTimeout(retry);
        source?.close();
      };
    });
  }
}
