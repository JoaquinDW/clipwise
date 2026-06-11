// Temporary visual-QA page: renders the below-fold sections without the
// 100vh hero so a headless screenshot can capture them. Safe to delete.
import VideoShowcase from '../components/video-showcase';
import Features from '../components/features';
import Demo from '../components/demo';
import Testimonials from '../components/testimonials';
import Waitlist from '../components/waitlist';

export default function SectionsPreview() {
  return (
    <>
      <VideoShowcase lang="en" />
      <Features lang="en" />
      <Demo lang="en" />
      <Testimonials lang="en" />
      <Waitlist lang="en" />
    </>
  );
}
