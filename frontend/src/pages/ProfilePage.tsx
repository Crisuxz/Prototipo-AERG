import { UserIcon } from '../components/icons'
import { usePageTitle } from '../hooks/usePageTitle'

export function ProfilePage() {
  usePageTitle('Perfil')
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Perfil</h1>
      <p className="mt-1 text-sm text-gray-600">Información de tu cuenta de docente.</p>

      <div className="mt-6 max-w-md rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
            <UserIcon className="h-7 w-7" />
          </span>
          <div>
            <p className="font-semibold text-gray-900">Docente</p>
            <p className="text-sm text-gray-600">Asistente de Evaluación IA</p>
          </div>
        </div>
      </div>
    </div>
  )
}
