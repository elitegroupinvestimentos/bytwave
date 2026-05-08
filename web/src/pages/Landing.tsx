import { Navbar } from '../components/Navbar';
import { Hero, FixedWaveArt } from '../components/Hero';
import { PinnedScroll } from '../components/PinnedScroll';
import { FeatureCards } from '../components/FeatureCards';
import { Footer } from '../components/Footer';

export default function Landing() {
  return (
    <main className="min-h-screen bg-background">
      <div className="relative">
        {/* Navbar absoluto sobreposto ao Hero */}
        <div className="absolute top-0 left-0 right-0 z-30">
          <Navbar />
        </div>

        {/* Wave art FIXA no canto sup. direito (desktop) */}
        <FixedWaveArt />

        <Hero />
        <PinnedScroll />
        <FeatureCards />
        <Footer />
      </div>
    </main>
  );
}
