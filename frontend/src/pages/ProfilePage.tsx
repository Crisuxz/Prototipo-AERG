import { UserIcon } from '../components/icons'

export function ProfilePage() {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900">Perfil</h2>
      <p className="mt-1 text-sm text-gray-600">Informacion de tu cuenta de docente.</p>

      <div className="mt-6 max-w-md rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
            <UserIcon className="h-7 w-7" />
          </span>
          <div>
            <p className="font-semibold text-gray-900">Docente</p>
            <p className="text-sm text-gray-500">Asistente de Evaluacion IA</p>
          </div>
        </div>
      </div>
    </div>
  )
}
