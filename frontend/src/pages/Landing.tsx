import { Hero } from "@/pages/landing/Hero";
import { StatStrip } from "@/pages/landing/StatStrip";
import { LogoStrip } from "@/pages/landing/LogoStrip";
import { HowItWorks } from "@/pages/landing/HowItWorks";
import { FeatureGrid } from "@/pages/landing/FeatureGrid";
import { PointOfView } from "@/pages/landing/PointOfView";
import { FinalCTA } from "@/pages/landing/FinalCTA";
import { MarketingFooter } from "@/pages/landing/MarketingFooter";

export default function Landing() {
  return (
    <div className="overflow-x-hidden" style={{ background: "#FFF8F1" }} data-testid="landing-page">
      <Hero />
      <StatStrip />
      <LogoStrip />
      <HowItWorks />
      <FeatureGrid />
      <PointOfView />
      <FinalCTA />
      <MarketingFooter />
    </div>
  );
}
