import { useEffect, useRef } from 'react'
import { useReducedMotion } from './useReducedMotion'

/** Scrolls the window back to the top whenever `key` changes — for route/step/tab
 * transitions, so a newly shown view doesn't inherit the previous view's scroll
 * position. Skips the initial mount (nothing to reset from yet) and scrolls
 * instantly rather than smoothly when the user has requested reduced motion. */
export function useScrollToTopOnChange(key: unknown): void {
  const reducedMotion = useReducedMotion()
  const reducedMotionRef = useRef(reducedMotion)
  reducedMotionRef.current = reducedMotion

  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    window.scrollTo({ top: 0, behavior: reducedMotionRef.current ? 'auto' : 'smooth' })
    // Intentionally depends only on `key` — reducedMotion is read fresh via the ref
    // above so a mid-session preference change doesn't itself trigger a scroll.
  }, [key])
}
