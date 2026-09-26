import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { AboutSection } from "@/features/restaurant/components/AboutSection";
import { BookingCTA } from "@/features/restaurant/components/BookingCTA";
import { FeatureHighlights } from "@/features/restaurant/components/FeatureHighlights";
import { HeroSection } from "@/features/restaurant/components/HeroSection";
import { MenuPreview } from "@/features/restaurant/components/MenuPreview";
import { Testimonials } from "@/features/restaurant/components/Testimonials";

const HomePage = () => (
  <>
    <a href="#main-content" className="skip-link">Skip to content</a>
    <Navbar />
    <main id="main-content">
      <HeroSection />
      <FeatureHighlights />
      <AboutSection />
      <MenuPreview />
      <Testimonials />
      <BookingCTA />
    </main>
    <Footer />
  </>
);

export default HomePage;
