import english from "./locales/en.json";

export type Locale = "ru" | "en";
export const localeCookie = "dsba-wiki-locale";
export const dateLocale = { ru: "ru-RU", en: "en-GB" } as const;
export function formatResourceCount(count: number, locale: Locale) {
  const plural = new Intl.PluralRules(locale).select(count);
  const noun =
    locale === "en"
      ? plural === "one" ? "resource" : "resources"
      : ({ one: "материал", few: "материала", many: "материалов", other: "материала" } as Record<string, string>)[plural] ?? "материалов";
  return `${new Intl.NumberFormat(locale).format(count)} ${noun}`;
}
export const parseLocale = (value?: string): Locale =>
  value === "en" ? "en" : "ru";
export const requestLocale = (request: Request): Locale =>
  parseLocale(
    request.headers
      .get("cookie")
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${localeCookie}=`))
      ?.slice(localeCookie.length + 1),
  );
const messages: Record<string, string> = english;
const translationFor = (key: string) =>
  Object.hasOwn(messages, key) ? messages[key] : undefined;

export type Translate = (
  message: string | TemplateStringsArray,
  ...values: unknown[]
) => string;

/** UI copy only: course titles, resource bodies and attribution are never translated. */
export function createTranslator(locale: Locale): Translate {
  return (message, ...values) => {
    const key =
      typeof message === "string"
        ? message
        : message.reduce(
            (text, part, index) =>
              text + (index ? `{${index - 1}}` : "") + part,
            "",
          );
    const template = locale === "en" ? (translationFor(key) ?? key) : key;
    return template.replace(/\{(\d+)\}/g, (placeholder, index) =>
      Number(index) < values.length
        ? String(values[Number(index)])
        : placeholder,
    );
  };
}

// API errors keep canonical Russian messages so a language change can re-render them.
const errorPatterns = Object.entries(messages)
  .filter(([key]) => /\{\d+\}/.test(key))
  .map(([key, translation]) => ({
    pattern: new RegExp(
      "^" +
        key
          .split(/\{\d+\}/)
          .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
          .join("(.*?)") +
        "$",
    ),
    translation,
  }));

export function translateError(
  message: string,
  locale: Locale,
  depth = 0,
): string {
  if (locale === "ru") return message;
  const translation = translationFor(message);
  if (translation) return translation;
  if (depth > 3) return message;
  if (message.includes("; "))
    return message
      .split("; ")
      .map((part) => translateError(part, locale, depth + 1))
      .join("; ");
  for (const { pattern, translation } of errorPatterns) {
    const match = message.match(pattern);
    if (match)
      return translation.replace(/\{(\d+)\}/g, (_, index) =>
        translateError(match[Number(index) + 1], locale, depth + 1),
      );
  }
  return message;
}
