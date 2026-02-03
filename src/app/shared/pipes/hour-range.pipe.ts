import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'hourRange',
  standalone: true
})
export class HourRangePipe implements PipeTransform {
  transform(start?: string | null, end?: string | null): string {
    if (!start && !end) {
      return '-';
    }
    if (start && end) {
      return `${start} - ${end}`;
    }
    return start ?? end ?? '-';
  }
}
