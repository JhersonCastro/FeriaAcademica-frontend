import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AttendanceService } from './attendance.service';

const EVENT_ID = 'a63bf327-3596-4738-a133-7dbd0cd58d0f';
const TOKEN = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AttendanceService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('registers with an empty POST', () => {
    service.register(EVENT_ID).subscribe();
    const req = http.expectOne(`/api/events/${EVENT_ID}/registrations`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
  });

  it('reads my registration', () => {
    service.myRegistration(EVENT_ID).subscribe();
    expect(http.expectOne(`/api/events/${EVENT_ID}/registrations/me`).request.method).toBe('GET');
  });

  it('sends the scanned text untouched as qrToken', () => {
    service.scan(EVENT_ID, TOKEN).subscribe();
    const req = http.expectOne(`/api/events/${EVENT_ID}/attendance/scan`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ qrToken: TOKEN });
  });

  it('reads the attendance summary', () => {
    service.summary(EVENT_ID).subscribe();
    expect(http.expectOne(`/api/events/${EVENT_ID}/attendance/summary`).request.method).toBe('GET');
  });
});
