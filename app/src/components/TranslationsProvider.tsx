"use client";

import initTranslations from "@/i18n/initi18n";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";

export default function TranslationsProvider({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: string;
}) {
  const i18n = createInstance();

  initTranslations(locale, i18n);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
