// src/app/layout.tsx

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { Providers } from "../components/Providers";
import { cookies } from "next/headers";
import { defaultLocale, type Locale, locales } from "../i18n/config";
import { getDictionary } from "../i18n/dictionaries";
import { LanguageProvider } from "../i18n/LanguageProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Real Estate TV",
  description: "The premier video-first platform for real estate properties.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // الحصول على لغة المستخدم من الكوكيز
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value as Locale;
  
  // التحقق من أن اللغة مدعومة وإلا استخدام اللغة الافتراضية
  const locale = cookieLocale && locales.includes(cookieLocale) ? cookieLocale : defaultLocale;
  const dict = await getDictionary(locale);
  const fallbackDictionary = await getDictionary(defaultLocale);

  // تحديد اتجاه الصفحة بناءً على اللغة
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} className="dark">
      <body className={`${inter.className} bg-[#0f0f0f] text-[#f1f1f1]`}>
        <LanguageProvider locale={locale} dictionary={dict} fallbackDictionary={fallbackDictionary}>
          <Providers>
            <Header />
            <div className="flex min-w-0 flex-row pt-16 overflow-x-hidden">
              <Sidebar />
              <main className="flex-1 min-h-[calc(100vh-64px)] min-w-0 bg-[#0f0f0f] pb-[calc(4rem+env(safe-area-inset-bottom,0px))] xl:pb-0 xl:ps-64">
                <div className="max-w-screen-2xl mx-auto w-full min-w-0 px-2.5 sm:px-4 md:px-6 lg:px-8 xl:px-10">
                  {children}
                </div>
              </main>
            </div>
          </Providers>
        </LanguageProvider>
      </body>
    </html>
  );
}