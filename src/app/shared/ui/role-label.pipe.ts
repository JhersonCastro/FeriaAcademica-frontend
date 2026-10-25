import { Pipe, PipeTransform } from '@angular/core';
import { roleLabel } from '../../core/models/labels';

@Pipe({ name: 'roleLabel' })
export class RoleLabelPipe implements PipeTransform {
  transform(role: string): string {
    return roleLabel(role);
  }
}
