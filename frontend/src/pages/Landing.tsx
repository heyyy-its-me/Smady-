import { Hero } from "@/pages/landing/Hero";
import { LogoStrip } from "@/pages/landing/LogoStrip";
import { FeatureGrid } from "@/pages/landing/FeatureGrid";
import { HighlightBand } from "@/pages/landing/HighlightBand";
import { HowItWorks } from "@/pages/landing/HowItWorks";
import { FinalCTA } from "@/pages/landing/FinalCTA";
import { MarketingFooter } from "@/pages/landing/MarketingFooter";

export default function Landing() {
  return (
    <div className="overflow-x-hidden bg-bg" data-testid="landing-page">
      <Hero />
      <LogoStrip />
      <FeatureGrid />
      <HighlightBand />
      <HowItWorks />
      <FinalCTA />
      <MarketingFooter />
    </div>
  );
}
