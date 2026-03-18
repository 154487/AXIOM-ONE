import type { Metadata } from "next";
import "./globals.css";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { cookies } from "next/headers";

export const metadata: Metadata = {
  title: "Axiom One",
  description: "Gestão financeira pessoal focada em clareza e construção de patrimônio",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const cookieStore = await cookies();
  const theme = cookieStore.get("AXIOM_THEME")?.value ?? "dark";

  return (
    <html lang={locale} className={theme === "light" ? "" : "dark"}>
      <body className="antialiased">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
