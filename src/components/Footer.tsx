import { Link } from "react-router-dom";
import { Download, Instagram, Twitter, Mail } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card/50">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Download className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-display text-xl font-bold text-foreground">
                Cria<span className="text-gradient">Hub</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground">
              A biblioteca premium de arquivos criativos para designers e profissionais de marketing.
            </p>
            <div className="flex gap-3">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-display font-semibold text-foreground">Plataforma</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link to="/biblioteca" className="hover:text-primary transition-colors">Biblioteca</Link>
              <Link to="/planos" className="hover:text-primary transition-colors">Planos</Link>
              <Link to="/novidades" className="hover:text-primary transition-colors">Novidades</Link>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-display font-semibold text-foreground">Categorias</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link to="/biblioteca?cat=social-media" className="hover:text-primary transition-colors">Social Media</Link>
              <Link to="/biblioteca?cat=marketing" className="hover:text-primary transition-colors">Marketing Digital</Link>
              <Link to="/biblioteca?cat=mockups" className="hover:text-primary transition-colors">Mockups</Link>
              <Link to="/biblioteca?cat=templates" className="hover:text-primary transition-colors">Templates</Link>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-display font-semibold text-foreground">Legal</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link to="/termos" className="hover:text-primary transition-colors">Termos de Uso</Link>
              <Link to="/privacidade" className="hover:text-primary transition-colors">Política de Privacidade</Link>
              <Link to="/contato" className="hover:text-primary transition-colors">Contato</Link>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} CriaHub. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
