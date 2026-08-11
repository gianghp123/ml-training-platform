"use client"

import { Edges, Float, RoundedBox, Sparkles } from "@react-three/drei"
import { Canvas, useFrame } from "@react-three/fiber"
import { useEffect, useMemo, useRef } from "react"
import * as THREE from "three"

interface LandingSceneProps {
  active: boolean
  reducedQuality: boolean
}

interface PipelineModuleProps {
  accent: string
  position: [number, number, number]
  rotation?: [number, number, number]
  scale?: number
}

const MODULES: PipelineModuleProps[] = [
  {
    accent: "#d9a45f",
    position: [-4.35, 1.35, -0.4],
    rotation: [0.05, 0.28, -0.07],
    scale: 0.76,
  },
  {
    accent: "#9b8cf0",
    position: [-2.15, -0.45, 0.45],
    rotation: [-0.06, 0.12, 0.04],
    scale: 0.82,
  },
  {
    accent: "#7c9cff",
    position: [0, 1.1, 0.2],
    rotation: [0.02, -0.08, 0.02],
    scale: 1.02,
  },
  {
    accent: "#62c4d7",
    position: [2.3, -0.45, 0.35],
    rotation: [0.04, -0.18, -0.04],
    scale: 0.84,
  },
  {
    accent: "#58c5a0",
    position: [4.35, 1.15, -0.45],
    rotation: [-0.04, -0.3, 0.06],
    scale: 0.76,
  },
]

function getPortPosition(
  module: PipelineModuleProps,
  direction: "input" | "output"
) {
  const position = new THREE.Vector3(direction === "input" ? -1.12 : 1.12, 0, 0)
  const rotation = new THREE.Euler(...(module.rotation ?? [0, 0, 0]))

  return position
    .multiplyScalar(module.scale ?? 1)
    .applyEuler(rotation)
    .add(new THREE.Vector3(...module.position))
}

function PipelineModule({
  accent,
  position,
  rotation = [0, 0, 0],
  scale = 1,
}: PipelineModuleProps) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <RoundedBox args={[2.15, 1.08, 0.42]} radius={0.13} smoothness={5}>
        <meshPhysicalMaterial
          color="#111924"
          emissive={accent}
          emissiveIntensity={0.045}
          metalness={0.55}
          roughness={0.25}
          clearcoat={0.7}
          clearcoatRoughness={0.22}
        />
        <Edges color={accent} threshold={18} />
      </RoundedBox>

      <mesh position={[-0.83, 0.28, 0.24]}>
        <circleGeometry args={[0.13, 32]} />
        <meshBasicMaterial color={accent} toneMapped={false} />
      </mesh>
      <mesh position={[-0.5, 0.3, 0.235]}>
        <planeGeometry args={[0.42, 0.055]} />
        <meshBasicMaterial
          color={accent}
          transparent
          opacity={0.75}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[-0.2, -0.06, 0.235]}>
        <planeGeometry args={[1.15, 0.07]} />
        <meshBasicMaterial color="#6d7f98" transparent opacity={0.62} />
      </mesh>
      <mesh position={[-0.43, -0.28, 0.235]}>
        <planeGeometry args={[0.68, 0.045]} />
        <meshBasicMaterial color="#44536a" transparent opacity={0.78} />
      </mesh>

      <mesh position={[-1.12, 0, 0]}>
        <sphereGeometry args={[0.095, 20, 20]} />
        <meshBasicMaterial color={accent} toneMapped={false} />
      </mesh>
      <mesh position={[1.12, 0, 0]}>
        <sphereGeometry args={[0.095, 20, 20]} />
        <meshBasicMaterial color={accent} toneMapped={false} />
      </mesh>
    </group>
  )
}

function DataStream({
  start,
  end,
  color,
  offset,
}: {
  start: THREE.Vector3
  end: THREE.Vector3
  color: string
  offset: number
}) {
  const beadRef = useRef<THREE.Mesh>(null)
  const curve = useMemo(() => {
    const midpoint = start.clone().lerp(end, 0.5)
    midpoint.z += 0.55
    midpoint.y += start.y > end.y ? -0.24 : 0.24
    return new THREE.CatmullRomCurve3([start, midpoint, end])
  }, [end, start])

  useFrame(({ clock }) => {
    if (!beadRef.current) return
    const progress = (clock.elapsedTime * 0.22 + offset) % 1
    beadRef.current.position.copy(curve.getPointAt(progress))
  })

  return (
    <group>
      <mesh>
        <tubeGeometry args={[curve, 48, 0.018, 8, false]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.3}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={beadRef}>
        <sphereGeometry args={[0.075, 18, 18]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  )
}

function NeuralCore() {
  const coreRef = useRef<THREE.Group>(null)

  useFrame(({ clock }, delta) => {
    if (!coreRef.current) return
    coreRef.current.rotation.y += delta * 0.12
    coreRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.42) * 0.08
  })

  return (
    <group ref={coreRef} position={[0, 1.1, -0.1]}>
      <mesh scale={0.58}>
        <icosahedronGeometry args={[0.58, 2]} />
        <meshPhysicalMaterial
          color="#7c9cff"
          emissive="#4567dc"
          emissiveIntensity={0.55}
          metalness={0.28}
          roughness={0.18}
          transparent
          opacity={0.5}
          wireframe
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.62, 0.012, 8, 96]} />
        <meshBasicMaterial
          color="#62c4d7"
          transparent
          opacity={0.6}
          toneMapped={false}
        />
      </mesh>
      <pointLight color="#7c9cff" intensity={8} distance={4.5} decay={2.2} />
    </group>
  )
}

function SceneContent({ reducedQuality }: { reducedQuality: boolean }) {
  const rootRef = useRef<THREE.Group>(null)
  const pointerRef = useRef({ x: 0, y: 0 })
  const scrollRef = useRef(0)

  useEffect(() => {
    const updatePointer = (event: PointerEvent) => {
      pointerRef.current.x = event.clientX / window.innerWidth - 0.5
      pointerRef.current.y = event.clientY / window.innerHeight - 0.5
    }
    const updateScroll = () => {
      scrollRef.current = Math.min(
        window.scrollY / Math.max(window.innerHeight, 1),
        1
      )
    }
    window.addEventListener("pointermove", updatePointer, { passive: true })
    window.addEventListener("scroll", updateScroll, { passive: true })
    updateScroll()
    return () => {
      window.removeEventListener("pointermove", updatePointer)
      window.removeEventListener("scroll", updateScroll)
    }
  }, [])

  useFrame((_, delta) => {
    if (!rootRef.current) return
    const targetRotationY =
      pointerRef.current.x * 0.12 + scrollRef.current * 0.08
    const targetRotationX = pointerRef.current.y * 0.055
    rootRef.current.rotation.y = THREE.MathUtils.damp(
      rootRef.current.rotation.y,
      targetRotationY,
      3.2,
      delta
    )
    rootRef.current.rotation.x = THREE.MathUtils.damp(
      rootRef.current.rotation.x,
      targetRotationX,
      3.2,
      delta
    )
    rootRef.current.position.y = THREE.MathUtils.damp(
      rootRef.current.position.y,
      -scrollRef.current * 0.34,
      3,
      delta
    )
  })

  const streams = useMemo(
    () =>
      MODULES.slice(0, -1).map((module, index) => ({
        start: getPortPosition(module, "output"),
        end: getPortPosition(MODULES[index + 1], "input"),
      })),
    []
  )

  return (
    <Float speed={0.72} rotationIntensity={0.025} floatIntensity={0.1}>
      <group ref={rootRef} scale={0.92}>
        {MODULES.map((module) => (
          <PipelineModule key={module.accent} {...module} />
        ))}
        {streams.map(({ start, end }, index) => (
          <DataStream
            key={`${index}-${MODULES[index + 1].accent}`}
            start={start}
            end={end}
            color={MODULES[index + 1].accent}
            offset={index * 0.19}
          />
        ))}
        <NeuralCore />
        <Sparkles
          count={reducedQuality ? 36 : 72}
          scale={[11, 6.5, 4]}
          size={1.45}
          speed={0.18}
          opacity={0.38}
          color="#9db2ff"
        />
      </group>
    </Float>
  )
}

export function LandingScene({ active, reducedQuality }: LandingSceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 0.55, 10.7], fov: 45, near: 0.1, far: 50 }}
      dpr={reducedQuality ? 1 : [1, 1.5]}
      frameloop={active ? "always" : "demand"}
      gl={{
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      }}
      style={{ pointerEvents: "none" }}
    >
      <fog attach="fog" args={["#070a0f", 9.8, 18]} />
      <ambientLight intensity={0.85} />
      <directionalLight
        position={[2.5, 5, 5]}
        intensity={2.8}
        color="#dce5ff"
      />
      <pointLight
        position={[-5, -1, 3]}
        intensity={5}
        distance={10}
        color="#9b8cf0"
      />
      <pointLight
        position={[5, 2, 2]}
        intensity={4}
        distance={9}
        color="#58c5a0"
      />
      <SceneContent reducedQuality={reducedQuality} />
    </Canvas>
  )
}
