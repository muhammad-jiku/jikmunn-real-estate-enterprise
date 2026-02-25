'use client';

import CallToActionSection from '@/components/landing/CallToActionSection';
import DiscoverSection from '@/components/landing/DiscoverSection';
import FeaturedPropertiesSection from '@/components/landing/FeaturedPropertiesSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import FooterSection from '@/components/landing/FooterSection';
import HeroSection from '@/components/landing/HeroSection';

const Landing = () => {
  return (
    <div>
      <HeroSection />
      <FeaturesSection />
      <FeaturedPropertiesSection />
      <DiscoverSection />
      <CallToActionSection />
      <FooterSection />
    </div>
  );
};

export default Landing;
