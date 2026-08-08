import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ContactService } from '../core/contact';

type Status = 'idle' | 'sending' | 'sent' | 'error';

@Component({
  selector: 'app-contact-form',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (status() === 'sent') {
      <p
        class="border-line bg-raised text-ink rounded-lg border p-6"
        role="status"
        aria-live="polite"
      >
        Thanks — your message is on its way. I'll reply to the address you gave.
      </p>
    } @else {
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="space-y-5">
        <div>
          <label for="name" class="text-ink block text-sm font-medium">Name</label>
          <input
            id="name"
            type="text"
            formControlName="name"
            autocomplete="name"
            [attr.aria-invalid]="showError('name') ? 'true' : null"
            [attr.aria-describedby]="showError('name') ? 'name-error' : null"
            class="border-line bg-surface text-ink focus:border-accent mt-2 w-full rounded-lg border px-3 py-2 text-sm outline-none"
          />
          @if (showError('name')) {
            <p id="name-error" class="mt-1.5 text-sm text-red-600 dark:text-red-400">
              Please enter your name.
            </p>
          }
        </div>

        <div>
          <label for="email" class="text-ink block text-sm font-medium">Email</label>
          <input
            id="email"
            type="email"
            formControlName="email"
            autocomplete="email"
            [attr.aria-invalid]="showError('email') ? 'true' : null"
            [attr.aria-describedby]="showError('email') ? 'email-error' : null"
            class="border-line bg-surface text-ink focus:border-accent mt-2 w-full rounded-lg border px-3 py-2 text-sm outline-none"
          />
          @if (showError('email')) {
            <p id="email-error" class="mt-1.5 text-sm text-red-600 dark:text-red-400">
              Please enter a valid email address so I can reply.
            </p>
          }
        </div>

        <div>
          <label for="message" class="text-ink block text-sm font-medium">Message</label>
          <textarea
            id="message"
            rows="5"
            formControlName="message"
            [attr.aria-invalid]="showError('message') ? 'true' : null"
            [attr.aria-describedby]="showError('message') ? 'message-error' : null"
            class="border-line bg-surface text-ink focus:border-accent mt-2 w-full resize-y rounded-lg border px-3 py-2 text-sm outline-none"
          ></textarea>
          @if (showError('message')) {
            <p id="message-error" class="mt-1.5 text-sm text-red-600 dark:text-red-400">
              Please include a message of at least 10 characters.
            </p>
          }
        </div>

        <!--
          Honeypot: hidden from users and from assistive tech, but present in the
          DOM for naive bots. The Lambda silently accepts and drops anything that
          fills it, so a bot gets no signal that it was caught.
        -->
        <div class="hidden" aria-hidden="true">
          <label for="website">Website</label>
          <input
            id="website"
            type="text"
            formControlName="website"
            tabindex="-1"
            autocomplete="off"
          />
        </div>

        <div class="flex items-center gap-4">
          <button
            type="submit"
            [disabled]="status() === 'sending'"
            class="bg-accent rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {{ status() === 'sending' ? 'Sending…' : 'Send message' }}
          </button>

          @if (status() === 'error') {
            <p class="text-sm text-red-600 dark:text-red-400" role="alert">
              {{ errorMessage() }}
            </p>
          }
        </div>
      </form>
    }
  `,
})
export class ContactForm {
  private readonly fb = inject(FormBuilder);
  private readonly contact = inject(ContactService);

  protected readonly status = signal<Status>('idle');
  protected readonly errorMessage = signal('');

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(200)]],
    message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(5000)]],
    website: [''],
  });

  protected showError(field: 'name' | 'email' | 'message'): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.dirty || control.touched);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.status.set('sending');
    this.contact.send(this.form.getRawValue()).subscribe({
      next: () => this.status.set('sent'),
      error: () => {
        this.status.set('error');
        this.errorMessage.set('Could not send. Please try again, or email me directly.');
      },
    });
  }
}
