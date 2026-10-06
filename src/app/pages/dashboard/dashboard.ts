import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { DataService, fechaMedia } from '../../core/data.service';
import { IconComponent } from '../../shared/icon';
import { StatusBadgeComponent } from '../../shared/status-badge';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, IconComponent, StatusBadgeComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent {
  protected data = inject(DataService);
  protected auth = inject(AuthService);
  protected fecha = fechaMedia;
}
