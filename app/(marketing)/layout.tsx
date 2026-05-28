import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-emerald-600 to-blue-600 text-white">
              🔥
            </span>
            <span>ParaRadar Pro</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm md:flex">
            <Link href="/pricing" className="text-muted-foreground hover:text-foreground">
              Tarifs
            </Link>
            <Link href="/methodology" className="text-muted-foreground hover:text-foreground">
              Méthodologie
            </Link>
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
              Dashboard
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Connexion</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/register">Essai gratuit</Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-12 text-sm text-muted-foreground">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="mb-3 font-semibold text-foreground">ParaRadar Pro</div>
              <p>Intelligence des tendances parapharmacie pour pharmaciens & e-commerce.</p>
            </div>
            <div>
              <div className="mb-3 font-semibold text-foreground">Produit</div>
              <ul className="space-y-2">
                <li>
                  <Link href="/pricing" className="hover:text-foreground">
                    Tarifs
                  </Link>
                </li>
                <li>
                  <Link href="/methodology" className="hover:text-foreground">
                    Méthodologie
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="hover:text-foreground">
                    Dashboard
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <div className="mb-3 font-semibold text-foreground">Ressources</div>
              <ul className="space-y-2">
                <li>
                  <Link href="/newsletter" className="hover:text-foreground">
                    Newsletter
                  </Link>
                </li>
                <li>
                  <a
                    href="mailto:contact@pararadar.pro"
                    className="hover:text-foreground"
                  >
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <div className="mb-3 font-semibold text-foreground">Légal</div>
              <ul className="space-y-2">
                <li>
                  <Link href="/legal/terms" className="hover:text-foreground">
                    CGU
                  </Link>
                </li>
                <li>
                  <Link href="/legal/privacy" className="hover:text-foreground">
                    Confidentialité
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t pt-6 text-xs">
            © {new Date().getFullYear()} ParaRadar Pro · Tous droits réservés
          </div>
        </div>
      </footer>
    </div>
  );
}
