import { NavLink, Outlet } from 'react-router-dom'

import {
  BrainIcon,
  ClockIcon,
  FileUpIcon,
  GridIcon,
  HomeIcon,
  LogOutIcon,
  UserIcon,
} from '../components/icons'

const navItems = [
  { to: '/', label: 'Inicio', end: true, icon: HomeIcon },
  { to: '/evaluar', label: 'Evaluar trabajo', icon: FileUpIcon },
  { to: '/rubricas', label: 'Rubricas', icon: GridIcon },
  { to: '/historial', label: 'Historial', icon: ClockIcon },
  { to: '/perfil', label: 'Perfil', icon: UserIcon },
]

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-100 text-gray-900 lg:flex-row">
      <aside className="flex shrink-0 flex-col bg-gray-900 px-4 py-3 text-gray-300 lg:w-64 lg:py-6">
        <div className="mb-3 flex items-center gap-3 px-2 lg:mb-8">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <BrainIcon className="h-5 w-5" />
          </span>
          <span className="text-sm font-semibold leading-tight text-white">
            Asistente de
            <br />
            Evaluacion IA
          </span>
        </div>

        <nav className="flex gap-1 overflow-x-auto lg:flex-1 lg:flex-col">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          className="hidden items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white lg:flex"
        >
          <LogOutIcon className="h-5 w-5 shrink-0" />
          Cerrar sesion
        </button>
      </aside>
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  )
}
