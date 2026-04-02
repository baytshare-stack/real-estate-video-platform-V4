"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useTranslation } from "@/i18n/LanguageProvider";
import { prefixWithLocale } from "@/i18n/routing";

export type LocaleLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
};

export default function LocaleLink({ href, ...rest }: LocaleLinkProps) {
  const { locale } = useTranslation();
  if (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("//") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href.startsWith("#")
  ) {
    return <Link href={href} {...rest} />;
  }
  const path = href.startsWith("/") ? href : `/${href}`;
  return <Link href={prefixWithLocale(locale, path)} {...rest} />;
}
