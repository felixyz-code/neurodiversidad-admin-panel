import { Component } from '@angular/core';

import { WidgetsDropdownComponent } from '../widgets/widgets-dropdown/widgets-dropdown.component';

@Component({
  templateUrl: 'dashboard.component.html',
  styleUrls: ['dashboard.component.scss'],
  imports: [WidgetsDropdownComponent]
})
export class DashboardComponent {}
