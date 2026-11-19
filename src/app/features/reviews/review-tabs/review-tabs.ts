import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/** Sub-tabs of "Revisar trabajos": the works waiting for a decision and the ones already approved. */
@Component({
  selector: 'app-review-tabs',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="subtabs" aria-label="Revisar trabajos">
      <a
        class="subtabs__link"
        routerLink="/reviews"
        routerLinkActive="subtabs__link--active"
        [routerLinkActiveOptions]="{ exact: true }"
        ariaCurrentWhenActive="page"
        >Pendientes</a
      >
      <a
        class="subtabs__link"
        routerLink="/reviews/approved"
        routerLinkActive="subtabs__link--active"
        ariaCurrentWhenActive="page"
        >Aprobados</a
      >
    </nav>
  `,
})
export class ReviewTabs {}
