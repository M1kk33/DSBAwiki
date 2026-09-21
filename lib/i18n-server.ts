import { cookies } from "next/headers";
import { createTranslator, localeCookie, parseLocale } from "./i18n";

export async function getServerI18n() {
  const locale = parseLocale((await cookies()).get(localeCookie)?.value);
  return { locale, t: createTranslator(locale) };
}
