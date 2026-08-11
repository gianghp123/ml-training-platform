"use client"

import dynamic from "next/dynamic"
import { useEffect, useRef, useState } from "react"

import styles from "./landing.module.css"

const LandingScene = dynamic(
  () => import("./LandingScene").then((module) => module.LandingScene),
  {
    ssr: false,
    loading: () => <SceneFallback isLoading />,
  }
)

function SceneFallback({ isLoading = false }: { isLoading?: boolean }) {
  return (
    <div className={styles.sceneFallback} aria-hidden="true">
      <div className={styles.fallbackOrb} />
      <div className={styles.fallbackRingOne} />
      <div className={styles.fallbackRingTwo} />
      <div className={styles.fallbackNodeLeft} />
      <div className={styles.fallbackNodeRight} />
      <div className={styles.fallbackBeam} />
      {isLoading && (
        <span className={styles.sceneLoading}>Calibrating scene</span>
      )}
    </div>
  )
}

export function LandingSceneHost() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(true)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [reducedQuality, setReducedQuality] = useState(false)
  const [saveData, setSaveData] = useState(false)
  const [canRenderWebGl, setCanRenderWebGl] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    const qualityQuery = window.matchMedia(
      "(max-width: 767px), (pointer: coarse)"
    )
    const updateMotionPreference = () => setReducedMotion(mediaQuery.matches)
    const updateQualityPreference = () =>
      setReducedQuality(qualityQuery.matches)
    mediaQuery.addEventListener("change", updateMotionPreference)
    qualityQuery.addEventListener("change", updateQualityPreference)

    const frame = window.requestAnimationFrame(() => {
      updateMotionPreference()
      updateQualityPreference()
      const connection = (
        navigator as Navigator & { connection?: { saveData?: boolean } }
      ).connection
      setSaveData(Boolean(connection?.saveData))
      try {
        const canvas = document.createElement("canvas")
        const context = canvas.getContext("webgl2")
        setCanRenderWebGl(Boolean(context))
      } catch {
        setCanRenderWebGl(false)
      }
    })

    return () => {
      window.cancelAnimationFrame(frame)
      mediaQuery.removeEventListener("change", updateMotionPreference)
      qualityQuery.removeEventListener("change", updateQualityPreference)
    }
  }, [])

  useEffect(() => {
    const element = containerRef.current
    if (!element || typeof IntersectionObserver === "undefined") return

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { rootMargin: "160px", threshold: 0.02 }
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const shouldRenderScene = canRenderWebGl && !reducedMotion && !saveData

  return (
    <div
      ref={containerRef}
      className={styles.sceneHost}
      aria-hidden="true"
      data-scene-visible={isVisible ? "true" : "false"}
    >
      {shouldRenderScene ? (
        <LandingScene active={isVisible} reducedQuality={reducedQuality} />
      ) : (
        <SceneFallback />
      )}
    </div>
  )
}
