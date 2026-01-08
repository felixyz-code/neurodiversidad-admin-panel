import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ChartData, ChartOptions } from 'chart.js';
import { ChartjsComponent } from '@coreui/angular-chartjs';
import { ColComponent, RowComponent, TemplateIdDirective, WidgetStatAComponent } from '@coreui/angular';

@Component({
  selector: 'app-widgets-dropdown',
  templateUrl: './widgets-dropdown.component.html',
  imports: [CommonModule, RowComponent, ColComponent, WidgetStatAComponent, TemplateIdDirective, ChartjsComponent]
})
export class WidgetsDropdownComponent {

  readonly weekLabels = ['Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo', 'Lunes'];
  readonly monthLabels = ['Ago', 'Sep', 'Oct', 'Nov', 'Dic', 'Ene'];

  readonly citasHoy = 10;
  readonly sesionesHoy = 5;
  readonly usuariosHoy = 15;
  readonly ingresosMes = 5000;

  readonly lineChartOptions: ChartOptions<'line'> = {
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { display: false },
      y: { display: false, suggestedMin: 0 }
    },
    elements: {
      line: { borderWidth: 2, tension: 0.4 },
      point: { radius: 3, hitRadius: 10, hoverRadius: 4 }
    }
  };

  readonly barChartOptions: ChartOptions<'bar'> = {
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { display: false }, beginAtZero: true }
    }
  };

  readonly citasChart: ChartData<'line'> = {
    labels: this.weekLabels,
    datasets: [{
      label: 'Citas',
      data: [6, 7, 5, 8, 9, 7, this.citasHoy],
      backgroundColor: 'rgba(255,255,255,.2)',
      borderColor: 'rgba(255,255,255,.85)',
      pointBackgroundColor: '#ffffff',
      fill: true
    }]
  };

  readonly usuariosChart: ChartData<'line'> = {
    labels: this.weekLabels,
    datasets: [{
      label: 'Sesiones de usuario',
      data: [9, 11, 10, 12, 13, 14, this.usuariosHoy],
      backgroundColor: 'rgba(255,255,255,.2)',
      borderColor: 'rgba(255,255,255,.85)',
      pointBackgroundColor: '#ffffff',
      fill: true
    }]
  };

  readonly ingresosChart: ChartData<'bar'> = {
    labels: this.monthLabels,
    datasets: [{
      label: 'Ingresos por mes',
      data: [3200, 3600, 4100, 3800, 4500, this.ingresosMes],
      backgroundColor: 'rgba(255,255,255,.65)',
      borderColor: 'rgba(255,255,255,.9)',
      borderWidth: 1
    }]
  };

  readonly sesionesChart: ChartData<'line'> = {
    labels: this.weekLabels,
    datasets: [{
      label: 'Sesiones',
      data: [2, 3, 3, 4, 6, 4, this.sesionesHoy],
      backgroundColor: 'rgba(255,255,255,.2)',
      borderColor: 'rgba(255,255,255,.85)',
      pointBackgroundColor: '#ffffff',
      fill: true
    }]
  };
}
