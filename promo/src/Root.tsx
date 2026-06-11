import { Composition, Still } from "remotion"
import { MomentreelPromo } from "./MomentreelPromo"
import { DURATION_IN_FRAMES, FPS } from "./theme"
import { Avatar, BannerReddit, BannerX, OgImage, PostSquare, PostStory } from "./brand/Stills"

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="MomentreelPromo"
        component={MomentreelPromo}
        durationInFrames={DURATION_IN_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Still id="Avatar" component={Avatar} width={1000} height={1000} />
      <Still id="BannerX" component={BannerX} width={1500} height={500} />
      <Still id="BannerReddit" component={BannerReddit} width={1920} height={576} />
      <Still id="OgImage" component={OgImage} width={1200} height={630} />
      <Still id="PostSquare" component={PostSquare} width={1080} height={1080} />
      <Still id="PostStory" component={PostStory} width={1080} height={1920} />
    </>
  )
}
