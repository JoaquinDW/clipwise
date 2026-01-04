import Hero from './components/hero';
import Benefits from './components/benefits';
import Features from './components/features';
import UseCases from './components/use-cases';
import Faq from './components/faq';
import Pricing from './components/pricing';
import Newsletter from './components/newsletter';

export default function Home() {
  return (
    <>
      <Hero />
      <Benefits />
      <Features />
      <UseCases />
      <Pricing />
      <Faq />
      <Newsletter />
    </>
  );
}
