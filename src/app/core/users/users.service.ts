import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AssignEventRoleRequest,
  CreateUserRequest,
  CreatedResource,
  PagedResult,
  UpdateProfileRequest,
  UpdateUserRequest,
  UserDto,
  UserListItem,
  UserListQuery,
} from '../models/user';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api`;

  updateMyProfile(request: UpdateProfileRequest): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/users/me`, request);
  }

  list(query: UserListQuery): Observable<PagedResult<UserListItem>> {
    let params = new HttpParams().set('page', query.page).set('pageSize', query.pageSize);
    if (query.search.trim()) {
      params = params.set('search', query.search.trim());
    }
    if (query.role) {
      params = params.set('role', query.role);
    }
    if (query.status) {
      params = params.set('status', query.status);
    }
    return this.http.get<PagedResult<UserListItem>>(`${this.baseUrl}/users`, { params });
  }

  get(id: string): Observable<UserDto> {
    return this.http.get<UserDto>(`${this.baseUrl}/users/${encodeURIComponent(id)}`);
  }

  create(request: CreateUserRequest): Observable<CreatedResource> {
    return this.http.post<CreatedResource>(`${this.baseUrl}/users`, request);
  }

  update(id: string, request: UpdateUserRequest): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/users/${encodeURIComponent(id)}`, request);
  }

  activate(id: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/users/${encodeURIComponent(id)}/activate`, {});
  }

  deactivate(id: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/users/${encodeURIComponent(id)}/deactivate`, {});
  }

  assignEventRole(eventId: string, request: AssignEventRoleRequest): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/events/${encodeURIComponent(eventId)}/roles`,
      request,
    );
  }
}
