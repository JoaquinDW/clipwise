import { useLayoutEffect, useMemo } from "react"
import * as THREE from "three"
import { useThree } from "@react-three/fiber"
import { Easing, interpolate, useCurrentFrame } from "remotion"
import { TIMING } from "../theme"
import { MasterScreen, ScanBeam } from "./MasterScreen"
import { ClipCards } from "./ClipCards"
import { ParticleField } from "./ParticleField"
import { createGlowTexture } from "./textures"

const CameraRig = () => {
  const frame = useCurrentFrame()
  const camera = useThree((s) => s.camera)

  // Dolly distance over the whole film
  const dist = interpolate(
    frame,
    [0, 120, 270, TIMING.splitStart + 60, TIMING.orbitStart, TIMING.orbitEnd, 720],
    [17, 11.2, 11.8, 12.5, 12.5, 12.5, 16],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    },
  )

  const y = interpolate(frame, [0, 120, 270, 450, 720], [2.4, 0.9, 0.4, 0.6, 1.4], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  })

  // Slow orbit during the showcase + constant micro-sway for a handheld feel
  const orbit = interpolate(frame, [TIMING.orbitStart, TIMING.orbitEnd], [-0.22, 0.22], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.quad),
  })
  const sway = Math.sin(frame * 0.008) * 0.018
  const angle = orbit + sway

  // Look slightly below center so the set sits high, keeping the lower third clear for titles
  const lookY = interpolate(frame, [0, 120], [0.8, -0.25], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  useLayoutEffect(() => {
    camera.position.set(Math.sin(angle) * dist, y, Math.cos(angle) * dist)
    camera.lookAt(0, lookY, 0)
  })

  return null
}

/** Big soft ambient glows behind the set. */
const Atmosphere = () => {
  const glow = useMemo(() => createGlowTexture(), [])
  return (
    <>
      <mesh position={[-5, 2.5, -6]} scale={[20, 20, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={glow}
          color="#FF3B5C"
          transparent
          opacity={0.16}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[6, -3, -8]} scale={[18, 18, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={glow}
          color="#FF8C00"
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </>
  )
}

export const Scene = () => {
  return (
    <>
      <fog attach="fog" args={["#050505", 18, 42]} />
      <ambientLight intensity={0.7} />
      <CameraRig />
      <Atmosphere />
      <ParticleField />
      <gridHelper args={[70, 56, "#1e1e1e", "#121212"]} position={[0, -4.6, 0]} />
      <MasterScreen />
      <ScanBeam />
      <ClipCards />
    </>
  )
}
