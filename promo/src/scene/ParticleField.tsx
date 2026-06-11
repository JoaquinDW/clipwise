import { useMemo } from "react"
import * as THREE from "three"
import { random, useCurrentFrame } from "remotion"

const COUNT = 550
const PALETTE = ["#FF3B5C", "#FF8C00", "#777777", "#555555"]

export const ParticleField = () => {
  const frame = useCurrentFrame()

  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3)
    const colors = new Float32Array(COUNT * 3)
    const c = new THREE.Color()
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (random(`px-${i}`) - 0.5) * 44
      positions[i * 3 + 1] = (random(`py-${i}`) - 0.5) * 22
      positions[i * 3 + 2] = (random(`pz-${i}`) - 0.5) * 30 - 6
      c.set(PALETTE[Math.floor(random(`pc-${i}`) * PALETTE.length)])
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }
    return { positions, colors }
  }, [])

  return (
    <points rotation={[0, frame * 0.0005, 0]} position={[0, Math.sin(frame * 0.01) * 0.2, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.07}
        vertexColors
        transparent
        opacity={0.75}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}
