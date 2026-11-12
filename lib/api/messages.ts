import "server-only";

import { createTranslator } from "next-intl";
import type {
  Locale,
  Messages,
  NamespaceKeys,
  NestedKeyOf,
} from "next-intl";

import ar from "@/messages/ar.json";
import en from "@/messages/en.json";

import { resolveLocale } from "./locale";

// Imported directly instead of via getTranslations(), because the request
// config throws in Route Handlers and Server Actions
const messages: Record<Locale, Messages> = { en, ar };

export async function getGenericErrorMessage(locale?: Locale): Promise<string> {
  return messages[locale ?? (await resolveLocale())].Api.genericError;
}

// getTranslations() replacement that also works in Route Handlers and
// Server Actions
export async function getServerTranslator<
  Namespace extends NamespaceKeys<Messages, NestedKeyOf<Messages>>,
>(namespace: Namespace, locale?: Locale) {
  const resolved = locale ?? (await resolveLocale());
  return createTranslator({
    locale: resolved,
    messages: messages[resolved],
    namespace,
  });
}
