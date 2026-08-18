import Hero from './components/hero';
import BeforeAfter from './components/before-after';
import VideoShowcase from './components/video-showcase';
import Features from './components/features';
import Demo from './components/demo';
import Testimonials from './components/testimonials';
import Pricing from './components/pricing';
import Faq from './components/faq';

export default function Home() {
  return (
    <>
      {/* Before → After claims the first scroll: the source-to-clips transform
          is the product. The branded promo drops below Demo, where it plays the
          "watch the whole thing" role instead of competing with the hero. */}
      <Hero lang="en" />
      <BeforeAfter lang="en" />
      <Features lang="en" />
      <Demo lang="en" />
      <VideoShowcase lang="en" />
      <Testimonials lang="en" />
      <Pricing lang="en" />
      <Faq lang="en" />
    </>
  );
}
