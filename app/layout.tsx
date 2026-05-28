import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ParaRadar Pro — Tendances Parapharmacie",
    template: "%s — ParaRadar Pro",
  },
  description:
    "L'intelligence des tendances parapharmacie pour pharmaciens & e-commerce : détectez les produits qui montent avant vos concurrents.",
  openGraph: {
    title: "ParaRadar Pro — Tendances Parapharmacie",
    description:
      "Détectez les produits parapharmacie qui montent avant vos concurrents grâce à l'analyse multi-sources (Google Trends, TikTok, Amazon, Instagram).",
    locale: "fr_FR",
    type: "website",
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
