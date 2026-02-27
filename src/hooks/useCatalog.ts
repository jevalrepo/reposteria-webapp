import { useEffect, useState } from 'react'
import { loadCatalogFromSupabase } from '../services/catalogService'
import type { CatalogData } from '../types/catalog'

export function useCatalog() {
  const [catalog, setCatalog] = useState<CatalogData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function loadCatalog() {
      try {
        const data = await loadCatalogFromSupabase()
        if (mounted) setCatalog(data)
      } catch {
        if (mounted) setCatalog(null)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadCatalog().catch(() => {
      if (mounted) {
        setCatalog(null)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
    }
  }, [])

  return { catalog, loading }
}
