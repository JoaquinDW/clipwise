import { useMemo } from "react"
import * as THREE from "three"
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { TIMING } from "../theme"
import { createCardTexture, createGlowTexture, type CardSpec } from "./textures"

const CARD_W = 2.34
const CARD_H = 4.16 // 9:16

type CardData = CardSpec & {
  x: number
  rotY: number
  delay: number
  scale: number
  glowColor: string
}

const CARDS: CardData[] = [
  {
    colors: ["#1a0620", "#33103d", "#110418"],
    caption: "The biggest mistake most creators make...",
    score: "CLIP · 87%",
    viral: false,
    isCenter: false,
    x: -3.15,
    rotY: 0.36,
    delay: 10,
    scale: 1,
    glowColor: "#8b2fc9",
  },
  {
    colors: ["#200610", "#3d1020", "#140408"],
    caption: "I went from 0 to 100k in 90 days",
    score: "VIRAL · 94%",
    viral: true,
    isCenter: true,
    x: 0,
    rotY: 0,
    delay: 0,
    scale: 1.12,
    glowColor: "#FF3B5C",
  },
  {
    colors: ["#0e1a06", "#1e3510", "#090e04"],
    caption: "This strategy changed everything for me",
    score: "CLIP · 91%",
    viral: false,
    isCenter: false,
    x: 3.15,
    rotY: -0.36,
    delay: 20,
    scale: 1,
    glowColor: "#FF8C00",
  },
]

const Card = ({ data, index }: { data: CardData; index: number }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const texture = useMemo(() => createCardTexture(data), [data])
  const glow = useMemo(() => createGlowTexture(), [])

  // Fly out of the master screen with a springy overshoot
  const arrive = spring({
    frame: frame - TIMING.splitStart - data.delay,
    fps,
    config: { damping: 13, stiffness: 90, mass: 1 },
  })

  // Gentle float once arrived
  const float = Math.sin(frame * 0.04 + index * 2.1) * 0.06 * arrive

  // Outro fade + slow recede
  const fade = interpolate(frame, [TIMING.cardsFadeStart, TIMING.cardsFadeEnd], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })
  const recede = interpolate(frame, [TIMING.cardsFadeStart, 700], [0, -2], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  const x = THREE.MathUtils.lerp(data.x * 0.4, data.x, arrive)
  const y = THREE.MathUtils.lerp(0.5, 0.7, arrive) + float
  const z = THREE.MathUtils.lerp(0.2, 2.2, arrive) + recede
  const scale = THREE.MathUtils.lerp(0.35, data.scale, arrive)
  const rotY = THREE.MathUtils.lerp(0, data.rotY, arrive)

  if (arrive < 0.001) return null

  return (
    <group position={[x, y, z]} rotation={[0, rotY, 0]} scale={scale}>
      {/* Back glow */}
      <mesh position={[0, 0, -0.4]} scale={[7, 9, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={glow}
          color={data.glowColor}
          transparent
          opacity={(data.isCenter ? 0.5 : 0.3) * arrive * fade}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* Card */}
      <mesh>
        <planeGeometry args={[CARD_W, CARD_H]} />
        <meshBasicMaterial map={texture} transparent opacity={fade} />
      </mesh>
    </group>
  )
}

export const ClipCards = () => {
  const frame = useCurrentFrame()
  if (frame < TIMING.splitStart - 5) return null
  return (
    <group>
      {CARDS.map((card, i) => (
        <Card key={card.caption} data={card} index={i} />
      ))}
    </group>
  )
}
