import { HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthenticationService, PersonalTasksService } from '@daylo/web/shared/api-client';
import { provideAuthentication } from './auth-http';

describe('Angular built-in XSRF transport with the generated client', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideAuthentication(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    document.cookie = 'daylo_xsrf=first-proof; Path=/';
  });
  afterEach(() => {
    document.cookie = 'daylo_xsrf=; Path=/; Max-Age=0';
    http.verify();
  });

  it('calls generated mutations without a token argument and uses the latest cookie', () => {
    const api = TestBed.inject(PersonalTasksService);
    api.createPersonalTask({ title: 'Plan' }).subscribe();
    const create = http.expectOne('/api/tasks/personal');
    expect(create.request.headers.get('X-CSRF-Token')).toBe('first-proof');
    expect(create.request.body).toEqual({ title: 'Plan' });
    create.flush({});
    document.cookie = 'daylo_xsrf=second-proof; Path=/';
    api.editPersonalTask('task-id', { version: 1, title: 'Changed' }).subscribe();
    const edit = http.expectOne('/api/tasks/personal/task-id');
    expect(edit.request.headers.get('X-CSRF-Token')).toBe('second-proof');
    edit.flush({});
    api.completePersonalTask('task-id', { version: 2 }).subscribe();
    const complete = http.expectOne('/api/tasks/personal/task-id/complete');
    expect(complete.request.headers.get('X-CSRF-Token')).toBe('second-proof');
    complete.flush({});
    api.reopenPersonalTask('task-id', { version: 3 }).subscribe();
    const reopen = http.expectOne('/api/tasks/personal/task-id/reopen');
    expect(reopen.request.headers.get('X-CSRF-Token')).toBe('second-proof');
    reopen.flush({});
    api.deletePersonalTask('task-id', 4).subscribe();
    const remove = http.expectOne('/api/tasks/personal/task-id?version=4');
    expect(remove.request.headers.get('X-CSRF-Token')).toBe('second-proof');
    remove.flush(null);
    TestBed.inject(AuthenticationService).signOut().subscribe();
    const signOut = http.expectOne('/api/auth/sign-out');
    expect(signOut.request.headers.get('X-CSRF-Token')).toBe('second-proof');
    signOut.flush(null);
    http.expectNone('/api/auth/csrf');
  });

  it('does not attach proof on reads, HEAD, or cross-origin requests', () => {
    const client = TestBed.inject(HttpClient);
    for (const method of ['GET', 'HEAD']) {
      client.request(method, '/api/tasks/personal').subscribe();
      const read = http.expectOne('/api/tasks/personal');
      expect(read.request.headers.has('X-CSRF-Token')).toBe(false);
      read.flush(null);
    }
    client.post('https://external.example.test/api/tasks', {}).subscribe();
    const foreign = http.expectOne('https://external.example.test/api/tasks');
    expect(foreign.request.headers.has('X-CSRF-Token')).toBe(false);
    foreign.flush({});
  });

  it('does not invent proof when the readable cookie is absent', () => {
    document.cookie = 'daylo_xsrf=; Path=/; Max-Age=0';
    TestBed.inject(AuthenticationService).signOut().subscribe();
    const signOut = http.expectOne('/api/auth/sign-out');
    expect(signOut.request.headers.has('X-CSRF-Token')).toBe(false);
    signOut.flush(null);
    http.expectNone('/api/auth/csrf');
  });
});
