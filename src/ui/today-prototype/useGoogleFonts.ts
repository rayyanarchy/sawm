// PROTOTYPE (#38): production would self-host its fonts.
import { useEffect } from 'react'

export function useGoogleFonts(href: string) {
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    document.head.append(link)
    return () => link.remove()
  }, [href])
}
