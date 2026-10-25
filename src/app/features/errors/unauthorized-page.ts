import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-unauthorized-page',
  imports: [RouterLink],
  template: `
    <section class="card unauthorized" aria-labelledby="unauthorized-title">
      <span class="diamond" aria-hidden="true"></span>
      <h1 class="title-1" id="unauthorized-title">No autorizado</h1>
      <p class="lead">No tienes permisos para ver esta página con tus roles actuales.</p>
      <div class="actions">
        <a class="btn btn--primary" routerLink="/">Volver al inicio</a>
      </div>
    </section>
  `,
  styles: `
    .unauthorized {
      max-width: 560px;
    }
  `,
  host: { class: 'page-content' },
})
export class UnauthorizedPage {}
