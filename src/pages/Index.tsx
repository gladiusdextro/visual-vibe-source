import Layout from "@/components/Layout";
import HeroSection from "@/components/landing/HeroSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import CategoriesSection from "@/components/landing/CategoriesSection";
import PricingSection from "@/components/landing/PricingSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import CTASection from "@/components/landing/CTASection";

const Index = () => {
  return (
    <Layout>
      <HeroSection />
      <HowItWorksSection />
      <CategoriesSection />
      <PricingSection />
      <TestimonialsSection />
      <CTASection />
    </Layout>
  );
};

export default Index;
