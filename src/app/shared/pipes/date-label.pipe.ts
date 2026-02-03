import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'dateLabel',
  standalone: true
})
export class DateLabelPipe implements PipeTransform {
  transform(value?: string | null, style: 'short' | 'long' = 'short'): string {
    if (!value) {
      return '-';
    }
    const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    const date = dateOnlyMatch
      ? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
      : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    if (style === 'long') {
      return date.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: '2-digit' });
    }
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('es-MX', { month: 'long' });
    const monthTitle = month ? `${month.charAt(0).toUpperCase()}${month.slice(1)}` : month;
    const year = date.getFullYear();
    return `${day} ${monthTitle} ${year}`;
  }
}
