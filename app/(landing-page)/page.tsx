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
      {/* Promise → "that's me" → proof of the output → how little it costs you
          → where the control stays yours → see it real → price → objections.
          Testimonials is the pain section, so it has to land before any of the
          selling; Before/After is the first proof the promise is real. */}
      <Hero lang="en" />
      <Testimonials lang="en" />
      <BeforeAfter lang="en" />
      <Demo lang="en" />
      <Features lang="en" />
      <VideoShowcase lang="en" />
      <Pricing lang="en" />
      <Faq lang="en" />
    </>
  );
}
