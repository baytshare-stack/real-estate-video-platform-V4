import { Inter } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { Providers } from "../components/Providers";
import { defaultLocale, languages, locales, type Locale } from "../i18n/config";
import { LOCALE_HEADER } from "../i18n/routing";

const inter = Inter({ subsets: ["latin"] });

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerStore = await headers();
  const fromHeader = headerStore.get(LOCALE_HEADER) as Locale | null;
  const locale =
    fromHeader && locales.includes(fromHeader) ? fromHeader : defaultLocale;
  const dir = languages[locale]?.dir ?? "ltr";

  return (
    <html lang={locale} dir={dir} className="dark" suppressHydrationWarning>
      <body className={`${inter.className} bg-[#0f0f0f] text-[#f1f1f1]`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
