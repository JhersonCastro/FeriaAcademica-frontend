import { Component, input } from '@angular/core';

export type IconName = 'grid' | 'calendar' | 'users' | 'award' | 'building' | 'search' | 'plus' | 'chevron-right'
  | 'chevron-down' | 'arrow-left' | 'download' | 'send' | 'eye' | 'eye-off' | 'check' | 'x' | 'clock' | 'pin' | 'menu' | 'logout' | 'google'
  | 'info' | 'file' | 'trash' | 'presentation';

@Component({
  selector: 'app-icon',
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      @switch (name()) {
        @case ('grid') { <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/> }
        @case ('calendar') { <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/> }
        @case ('users') { <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/> }
        @case ('award') { <circle cx="12" cy="8" r="6"/><path d="M15.5 13.5 17 22l-5-3-5 3 1.5-8.5"/> }
        @case ('building') { <rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/> }
        @case ('search') { <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/> }
        @case ('plus') { <path d="M5 12h14M12 5v14"/> }
        @case ('chevron-right') { <path d="m9 18 6-6-6-6"/> }
        @case ('chevron-down') { <path d="m6 9 6 6 6-6"/> }
        @case ('arrow-left') { <path d="m12 19-7-7 7-7M19 12H5"/> }
        @case ('download') { <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/> }
        @case ('send') { <path d="m22 2-7 20-4-9-9-4zM22 2 11 13"/> }
        @case ('eye') { <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/> }
        @case ('eye-off') { <path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-6.5 0-10-7-10-7a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 5c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22"/> }
        @case ('check') { <path d="M20 6 9 17l-5-5"/> }
        @case ('x') { <path d="M18 6 6 18M6 6l12 12"/> }
        @case ('clock') { <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/> }
        @case ('pin') { <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/> }
        @case ('menu') { <path d="M3 6h18M3 12h18M3 18h18"/> }
        @case ('logout') { <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/> }
        @case ('info') { <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/> }
        @case ('file') { <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/> }
        @case ('trash') { <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/> }
        @case ('presentation') { <path d="M2 3h20v13H2zM12 16v5M8 21h8"/> }
        @case ('google') { <circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/> }
      }
    </svg>`,
  host: { class: 'inline-flex shrink-0' },
})
export class IconComponent {
  name = input.required<IconName>();
  size = input(18);
}
