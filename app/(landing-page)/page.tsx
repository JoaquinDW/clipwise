import Landing from './components/landing';

// Static, refreshed every few minutes so the seats-left count stays close to
// real. The checkout route re-reads the tier at click time either way.
export const revalidate = 300;

export default function Home() {
  return <Landing lang="en" />;
}
