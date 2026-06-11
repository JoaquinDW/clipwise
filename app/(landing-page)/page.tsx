import Hero from './components/hero';
import VideoShowcase from './components/video-showcase';
import Features from './components/features';
import Demo from './components/demo';
import Testimonials from './components/testimonials';
import Waitlist from './components/waitlist';
import Faq from './components/faq';

export default function Home() {
  return (
    <>
      <Hero lang="en" />
      <VideoShowcase lang="en" />
      <Features lang="en" />
      <Demo lang="en" />
      <Testimonials lang="en" />
      <Waitlist lang="en" />
      <Faq lang="en" />
    </>
  );
}
