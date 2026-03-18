import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import Negotiator from "negotiator";
import { match } from "@formatjs/intl-localematcher";

const LOCALES = ["en", "pt-BR", "es", "fr", "zh", "hi", "ar"];
const DEFAULT = "en";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  let locale = cookieStore.get("NEXT_LOCALE")?.value;

  if (!locale || !LOCALES.includes(locale)) {
    const headerStore = await headers();
    const acceptLang = headerStore.get("accept-language") ?? "";
    const negotiator = new Negotiator({ headers: { "accept-language": acceptLang } });
    try {
      locale = match(negotiator.languages(), LOCALES, DEFAULT);
    } catch {
      locale = DEFAULT;
    }
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
