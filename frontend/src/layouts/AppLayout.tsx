import { useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

import {
  BrainIcon,
  ClockIcon,
  FileUpIcon,
  GridIcon,
  HomeIcon,
  UserIcon,
} from '../components/icons'

const navItems = [
  { to: '/', label: 'Inicio', end: true, icon: HomeIcon },
  { to: '/evaluar', label: 'Evaluar trabajo', icon: FileUpIcon },
  { to: '/rubricas', label: 'Rúbricas', icon: GridIcon },
  { to: '/historial', label: 'Historial', icon: ClockIcon },
  { to: '/perfil', label: 'Perfil', icon: UserIcon },
]

export function AppLayout() {
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const previousPath = useRef(pathname)

  // En una SPA el foco se queda en el enlace pulsado; se lleva al contenido nuevo para que
  // teclado y lectores de pantalla empiecen desde el inicio de la pantalla.
  useEffect(() => {
    // Se compara con la ruta anterior (y no con un "primer render") porque StrictMode
    // ejecuta los efectos dos veces al montar.
    if (previousPath.current === pathname) return
    previousPath.current = pathname
    mainRef.current?.focus()
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col bg-gray-100 text-gray-900 lg:flex-row">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-indigo-700 focus:shadow-lg"
      >
        Saltar al contenido
      </a>
      <aside className="flex shrink-0 flex-col bg-gray-900 px-4 py-3 text-gray-300 lg:w-64 lg:py-6">
        <div className="mb-3 flex items-center gap-3 px-2 lg:mb-8">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <BrainIcon className="h-5 w-5" />
          </span>
          <span className="text-sm font-semibold leading-tight text-white">
            Asistente de
            <br />
            Evaluación IA
          </span>
        </div>

        <nav aria-label="Principal" className="flex flex-wrap gap-1 lg:flex-1 lg:flex-col lg:flex-nowrap">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-indigo-300 ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main id="contenido" ref={mainRef} tabIndex={-1} className="min-w-0 flex-1 p-4 focus:outline-none sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  )
}
