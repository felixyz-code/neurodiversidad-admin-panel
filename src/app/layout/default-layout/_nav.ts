import { INavData } from '@coreui/angular';

export const navItems: INavData[] = [
  {
    name: 'Dashboard',
    url: '/dashboard',
    iconComponent: { name: 'cil-speedometer' }
  },
  {
    name: 'Citas',
    url: '/citas',
    iconComponent: { name: 'cil-calendar' }
  },
  {
    name: 'Sesiones',
    url: '/sesiones',
    iconComponent: { name: 'cil-task' }
  },
  {
    name: 'Usuarios',
    url: '/usuarios',
    iconComponent: { name: 'cil-user' }
  },
  {
    name: 'Finanzas',
    url: '/finanzas',
    iconComponent: { name: 'cil-dollar' }
  },
  {
    name: 'Reclutamiento',
    url: '/reclutamiento',
    iconComponent: { name: 'cil-people' }
  }
];
