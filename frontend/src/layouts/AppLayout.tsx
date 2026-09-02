import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/evaluar', label: 'Evaluar trabajo' },
  { to: '/rubricas', label: 'Rubricas' },
  { to: '/historial', label: 'Historial' },
]

export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      <aside className="w-60 shrink-0 border-r border-gray-200 bg-white p-4">
        <h1 className="mb-6 text-lg font-semibold">Asistente de Evaluacion</h1>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded px-3 py-2 text-sm font-medium ${
                  isActive ? 'bg-purple-100 text-purple-800' : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  )
}
