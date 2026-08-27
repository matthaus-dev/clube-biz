import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: { default: "clube-biz", template: "%s | clube-biz" },
  description: "Fidelidade simples para clientes e estabelecimentos.",
  openGraph: {
    title: "clube-biz — Fidelidade que aproxima",
    description: "Uma experiência simples e moderna para pontos, clientes e recompensas.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "clube-biz — Fidelidade que aproxima" }],
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "clube-biz — Fidelidade que aproxima",
    description: "Uma experiência simples e moderna para pontos, clientes e recompensas.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
        {children}
      </body>
    </html>
  );
}
