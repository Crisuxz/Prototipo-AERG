import { useEffect } from 'react'

/** Titulo del documento por pantalla: lo anuncian los lectores de pantalla y aparece en la pestana. */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · AERG`
  }, [title])
}
