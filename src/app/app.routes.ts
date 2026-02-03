import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: '',
    loadComponent: () => import('./layout').then(m => m.DefaultLayoutComponent),
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    data: {
      title: 'Inicio'
    },
    children: [
      {
        path: 'dashboard',
        loadChildren: () => import('./views/dashboard/routes').then((m) => m.routes)
      },
      {
        path: 'citas',
        loadComponent: () => import('./views/citas').then((m) => m.CitasComponent),
        data: {
          title: 'Citas'
        }
      },
      {
        path: 'sesiones',
        loadComponent: () => import('./views/sesiones').then((m) => m.SesionesComponent),
        data: {
          title: 'Sesiones'
        }
      },
      {
        path: 'usuarios',
        loadComponent: () => import('./views/usuarios/usuarios.component').then((m) => m.UsuariosComponent),
        data: {
          title: 'Usuarios'
        }
      },
      {
        path: 'finanzas',
        loadComponent: () => import('./views/finanzas').then((m) => m.FinanzasComponent),
        data: {
          title: 'Finanzas'
        }
      },
      {
        path: 'reclutamiento',
        loadComponent: () => import('./views/reclutamiento').then((m) => m.ReclutamientoComponent),
        data: {
          title: 'Reclutamiento'
        }
      },
      {
        path: 'perfil',
        loadComponent: () => import('./views/perfil').then((m) => m.PerfilComponent),
        data: {
          title: 'Perfil'
        }
      },
      {
        path: 'theme',
        loadChildren: () => import('./views/theme/routes').then((m) => m.routes)
      },
      {
        path: 'base',
        loadChildren: () => import('./views/base/routes').then((m) => m.routes)
      },
      {
        path: 'buttons',
        loadChildren: () => import('./views/buttons/routes').then((m) => m.routes)
      },
      {
        path: 'forms',
        loadChildren: () => import('./views/forms/routes').then((m) => m.routes)
      },
      {
        path: 'icons',
        loadChildren: () => import('./views/icons/routes').then((m) => m.routes)
      },
      {
        path: 'notifications',
        loadChildren: () => import('./views/notifications/routes').then((m) => m.routes)
      },
      {
        path: 'widgets',
        loadChildren: () => import('./views/widgets/routes').then((m) => m.routes)
      },
      {
        path: 'charts',
        loadChildren: () => import('./views/charts/routes').then((m) => m.routes)
      },
      {
        path: 'pages',
        loadChildren: () => import('./views/pages/routes').then((m) => m.routes)
      }
    ]
  },
  {
    path: '404',
    loadComponent: () => import('./views/pages/page404/page404.component').then(m => m.Page404Component),
    canActivate: [authGuard],
    data: {
      title: 'Page 404'
    }
  },
  {
    path: '500',
    loadComponent: () => import('./views/pages/page500/page500.component').then(m => m.Page500Component),
    canActivate: [authGuard],
    data: {
      title: 'Page 500'
    }
  },
  {
    path: 'login',
    loadComponent: () => import('./views/pages/login/login.component').then(m => m.LoginComponent),
    data: {
      title: 'Login Page'
    }
  },
  {
    path: 'register',
    loadComponent: () => import('./views/pages/register/register.component').then(m => m.RegisterComponent),
    canActivate: [authGuard],
    data: {
      title: 'Register Page'
    }
  },
  { path: '**', redirectTo: 'dashboard' }
];
