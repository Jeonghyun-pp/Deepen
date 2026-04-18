"use client"

import { useEffect, useState } from "react"
import type { GraphData } from "../_data/types"
import { apiResponseToGraphData } from "@/lib/graph/mappers"

export type LoadState = "loading" | "ready" | "error"

export function useInitialGraph() {
  const [data, setData] = useState<GraphData>({ nodes: [], edges: [] })
  const [state, setState] = useState<LoadState>("loading")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/graph/current", {
          credentials: "include",
        })
        if (!res.ok) {
          if (res.status === 401) {
            window.location.href =
              "/login?redirect=" + encodeURIComponent(window.location.pathname)
            return
          }
          throw new Error(`HTTP ${res.status}`)
        }
        const raw = await res.json()
        if (cancelled) return
        setData(apiResponseToGraphData(raw))
        setState("ready")
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : String(e))
        setState("error")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return { data, state, error }
}
