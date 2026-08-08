import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ContactMessage {
  name: string;
  email: string;
  message: string;
  /** Honeypot. Real users never fill this; bots usually do. */
  website?: string;
}

export interface ContactResponse {
  ok: boolean;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class ContactService {
  private readonly http = inject(HttpClient);

  send(message: ContactMessage): Observable<ContactResponse> {
    return this.http.post<ContactResponse>(environment.contactApiUrl, message);
  }
}
