import type { AppLocale } from "./i18n/routing";
import type messages from "./messages/en.json";

// Type-safe locales and message keys for next-intl. English is the source.
declare module "next-intl" {
  interface AppConfig {
    Locale: AppLocale;
    Messages: typeof messages;
  }
}
