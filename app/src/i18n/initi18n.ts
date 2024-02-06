import i18n, { createInstance } from "i18next";
import { initReactI18next } from "react-i18next/initReactI18next";
import de from "./translations/de.json";
import en from "./translations/en.json";

const resources = {
  en: {
    default: en,
  },
  de: {
    default: de,
  },
};

export default async function initTranslations(
  locale: string,
  i18nInstance?: typeof i18n
) {
  const localI18nInstance = i18nInstance ?? createInstance();
  localI18nInstance.use(initReactI18next).init({
    resources,
    fallbackLng: "en",
    lng: locale,
    ns: ["default"],
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });
  return {
    i18n: localI18nInstance,
    t: localI18nInstance.t,
  };
}

export const i18nConfig = {
  locales: Object.keys(resources),
  defaultLocale: "en",
};
