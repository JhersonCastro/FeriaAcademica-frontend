import { Component, computed, input } from '@angular/core';
import { userStatusLabel } from '../../../core/models/labels';
import { UserStatus } from '../../../core/models/user';

const STATUS_VARIANTS: Record<UserStatus, string> = {
  Active: 'chip--success',
  Pending: 'chip--info',
  Inactive: 'chip--neutral',
};

@Component({
  selector: 'app-status-chip',
  template: `<span class="chip" [class]="variant()">{{ label() }}</span>`,
})
export class StatusChip {
  readonly status = input.required<UserStatus>();

  protected readonly label = computed(() => userStatusLabel(this.status()));
  protected readonly variant = computed(() => STATUS_VARIANTS[this.status()] ?? 'chip--neutral');
}
