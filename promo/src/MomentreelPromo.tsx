import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion"
import { ThreeCanvas } from "@remotion/three"
import { Scene } from "./scene/Scene"
import { Overlays } from "./overlays/Titles"
import { COLORS, DURATION_IN_FRAMES } from "./theme"

export const MomentreelPromo = () => {
  const { width, height } = useVideoConfig()
  const frame = useCurrentFrame()

  const fadeIn = interpolate(frame, [0, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })
  const fadeOut = interpolate(frame, [DURATION_IN_FRAMES - 24, DURATION_IN_FRAMES - 2], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      <ThreeCanvas
        width={width}
        height={height}
        camera={{ fov: 38, near: 0.1, far: 100, position: [0, 2.4, 17] }}
      >
        <Scene />
      </ThreeCanvas>
      <Overlays />
      {/* Global fade in/out */}
      <AbsoluteFill
        style={{ background: "#000", opacity: 1 - fadeIn * fadeOut, pointerEvents: "none" }}
      />
    </AbsoluteFill>
  )
}
