"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  createTranslator,
  localeCookie,
  translateError,
  type Locale,
  type Translate,
} from "@/lib/i18n";

type I18nContext = {
  locale: Locale;
  t: Translate;
  errorText: (message: string) => string;
  setLocale: (locale: Locale) => void;
  pending: boolean;
};
const LocaleContext = createContext<I18nContext>({
  locale: "ru",
  t: createTranslator("ru"),
  errorText: (message) => message,
  setLocale: () => {},
  pending: false,
});

export function WikiLocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLanguage] = useState(initialLocale);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const t = useMemo(() => createTranslator(locale), [locale]);
  function setLocale(next: Locale) {
    document.cookie = `${localeCookie}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    document.documentElement.lang = next;
    setLanguage(next);
    // Refresh server-rendered copy while retaining client filters and editor state.
    startTransition(() => router.refresh());
  }
  return (
    <LocaleContext.Provider
      value={{
        locale,
        t,
        errorText: (message) => translateError(message, locale),
        setLocale,
        pending,
      }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export const useI18n = () => useContext(LocaleContext);

export function LanguageToggle() {
  const { locale, setLocale, pending } = useI18n();
  const label =
    locale === "ru" ? "Switch to English" : "Переключить на русский";
  return (
    <button
      type="button"
      className="language-toggle"
      title={label}
      aria-label={label}
      lang={locale === "ru" ? "en" : "ru"}
      disabled={pending}
      onClick={() => setLocale(locale === "ru" ? "en" : "ru")}
    >
      {locale === "ru" ? "EN" : "RU"}
    </button>
  );
}
