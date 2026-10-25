import { DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** "Acceso institucional": identity panel on the left, access card on the right. */
@Component({
  selector: 'app-public-layout',
  imports: [RouterOutlet, DatePipe],
  templateUrl: './public-layout.html',
  styleUrl: './public-layout.css',
})
export class PublicLayout {
  protected readonly today = new Date();
}
