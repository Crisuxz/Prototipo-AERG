import { useCallback, useEffect, useRef } from 'react'
import { useBlocker } from 'react-router-dom'

/**
 * Evita perder cambios sin guardar: bloquea la navegacion interna (el llamador muestra la
 * confirmacion con `blocker`) y activa el aviso nativo al cerrar o recargar la pestana.
 * `allowNavigation` permite una navegacion intencional justo despues de guardar.
 */
export function useUnsavedChanges(dirty: boolean) {
  const dirtyRef = useRef(dirty)
  useEffect(() => {
    dirtyRef.current = dirty
  }, [dirty])

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirtyRef.current && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    if (!dirty) return
    const handler = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const allowNavigation = useCallback(() => {
    dirtyRef.current = false
  }, [])

  return { blocker, allowNavigation }
}
