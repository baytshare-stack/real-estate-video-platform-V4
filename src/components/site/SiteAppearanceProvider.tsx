"use client";

import * as React from "react";
import {
  type SiteAppearanceDTO,
  DEFAULT_SITE_APPEARANCE,
  appearanceToCssVars,
  googleFontHref,
} from "@/lib/site-appearance-shared";

const SiteAppearanceContext = React.createContext<SiteAppearanceDTO>(DEFAULT_SITE_APPEARANCE);

export function useSiteAppearance(): SiteAppearanceDTO {
  return React.useContext(SiteAppearanceContext);
}

export function SiteAppearanceProvider({
  initial,
  children,
}: {
  initial: SiteAppearanceDTO;
  children: React.ReactNode;
}) {
  React.useLayoutEffect(() => {
    const root = document.documentElement;
    const vars = appearanceToCssVars(initial);
    for (const [k, val] of Object.entries(vars)) {
      root.style.setProperty(k, val);
    }
    root.style.fontSize = vars["--site-font-size-base"] ?? "16px";

    const href = googleFontHref([initial.fontBodyKey, initial.fontHeadingKey]);
    let link = document.getElementById("site-google-fonts") as HTMLLinkElement | null;
    if (href) {
      if (!link) {
        link = document.createElement("link");
        link.id = "site-google-fonts";
        link.rel = "stylesheet";
        document.head.appendChild(link);
      }
      link.href = href;
    } else if (link?.parentNode) {
      link.parentNode.removeChild(link);
    }
  }, [initial]);

  return (
    <SiteAppearanceContext.Provider value={initial}>{children}</SiteAppearanceContext.Provider>
  );
}
