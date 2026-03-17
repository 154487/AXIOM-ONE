import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Axiom One",
  description: "Gestão financeira pessoal focada em clareza e construção de patrimônio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
