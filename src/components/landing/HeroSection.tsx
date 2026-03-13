import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Download, Layers, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-creative.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="absolute inset-0 opacity-20">
        <img src={heroImage} alt="" className="w-full h-full object-cover" />
      </div>
      <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full bg-primary/10 blur-[120px] animate-pulse-glow" />
      <div className="absolute bottom-1/4 left-1/4 w-64 h-64 rounded-full bg-primary/5 blur-[80px] animate-pulse-glow" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">+1.000 arquivos criativos prontos</span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6"
          >
            Seus designs prontos,{" "}
            <span className="text-gradient">editáveis</span> e{" "}
            <span className="text-gradient">profissionais</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl"
          >
            Acesse uma biblioteca premium de templates, mockups e arquivos criativos. 
            Baixe, edite e publique em minutos. Feito para social media, designers e marketers.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Link to="/planos">
              <Button size="lg" className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow text-base px-8">
                Começar agora
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link to="/biblioteca">
              <Button size="lg" variant="outline" className="text-base px-8 border-border hover:bg-secondary">
                Explorar biblioteca
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex items-center gap-8 mt-12 text-sm text-muted-foreground"
          >
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-primary" />
              <span>Downloads ilimitados</span>
            </div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              <span>PSD, AI, SVG, PNG</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <span>Novos toda semana</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
