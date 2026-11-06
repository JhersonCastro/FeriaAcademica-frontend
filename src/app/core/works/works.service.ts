import { HttpClient, HttpEventType } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, filter, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ARTIFACT_TYPE_CODES,
  AddLinkArtifactRequest,
  AddedArtifact,
  ArtifactTypeName,
  AssignedWorkDto,
  CreateWorkRequest,
  MyWorkDto,
  ReviewDecision,
  UploadProgress,
  WorkDto,
} from '../models/work';

/** The author's side of a work: follow its status and feedback, and replace it before review. */
@Injectable({ providedIn: 'root' })
export class WorksService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/works`;

  mine(): Observable<MyWorkDto[]> {
    return this.http.get<MyWorkDto[]>(`${this.baseUrl}/mine`);
  }

  /** 404 when the work does not exist or the signed-in user is not its author. */
  get(workId: string): Observable<WorkDto> {
    return this.http.get<WorkDto>(this.workUrl(workId));
  }

  /** Adds a new version of an artifact as a link. Only while the work is a draft. */
  addLink(workId: string, request: AddLinkArtifactRequest): Observable<AddedArtifact> {
    return this.http.post<AddedArtifact>(`${this.workUrl(workId)}/artifacts`, {
      type: ARTIFACT_TYPE_CODES[request.type],
      linkUrl: request.linkUrl,
    });
  }

  /** Creates a draft work; the backend answers with its id. Needs the author's participation. */
  create(request: CreateWorkRequest): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(this.baseUrl, request);
  }

  /**
   * Uploads a file as a new version of the artifact of that type (multipart). Emits the upload
   * percentage and finally the created artifact. Only while the work is a draft.
   */
  uploadFile(workId: string, type: ArtifactTypeName, file: File): Observable<UploadProgress> {
    const body = new FormData();
    body.append('type', type);
    body.append('file', file, file.name);
    return this.http
      .post<AddedArtifact>(`${this.workUrl(workId)}/artifacts/file`, body, {
        observe: 'events',
        reportProgress: true,
      })
      .pipe(
        filter(
          (event) => event.type === HttpEventType.UploadProgress || event.type === HttpEventType.Response,
        ),
        map((event): UploadProgress => {
          if (event.type === HttpEventType.Response) {
            return { kind: 'done', artifact: event.body as AddedArtifact };
          }
          const total = 'total' in event && event.total ? event.total : file.size;
          return {
            kind: 'progress',
            percent: Math.min(100, Math.round((event.loaded / total) * 100)),
          };
        }),
      );
  }

  submit(workId: string): Observable<void> {
    return this.http.post<void>(`${this.workUrl(workId)}/submit`, null);
  }

  /**
   * A submitted work that nobody opened yet goes back to draft (to replace it), only before the
   * deadline. Careful: withdrawing a draft cancels the work.
   */
  withdraw(workId: string): Observable<void> {
    return this.http.post<void>(`${this.workUrl(workId)}/withdraw`, null);
  }

  private workUrl(workId: string): string {
    return `${this.baseUrl}/${encodeURIComponent(workId)}`;
  }
}

/** The reviewer's side: what is waiting, opening a work and recording the decision. */
@Injectable({ providedIn: 'root' })
export class ReviewsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/reviews`;

  assigned(): Observable<AssignedWorkDto[]> {
    return this.http.get<AssignedWorkDto[]>(`${this.baseUrl}/assigned`);
  }

  /** Submitted -> InReview. After this the author can no longer withdraw the work. */
  start(workId: string): Observable<void> {
    return this.http.post<void>(`${this.reviewUrl(workId)}/start`, null);
  }

  /** Feedback is required unless the decision is `Approved`. */
  decide(workId: string, decision: ReviewDecision, feedback: string | null): Observable<void> {
    return this.http.post<void>(`${this.reviewUrl(workId)}/decision`, { decision, feedback });
  }

  private reviewUrl(workId: string): string {
    return `${this.baseUrl}/${encodeURIComponent(workId)}`;
  }
}
