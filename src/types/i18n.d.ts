import type en from "../../messages/en.json";

// Augments next-intl's own types so useTranslations()/getTranslations() are
// fully typed against en.json's shape everywhere in the app -- an unknown
// or misspelled namespace/key is a compile error rather than a silent
// missing-translation fallback at runtime.
declare module "next-intl" {
  interface AppConfig {
    Messages: typeof en;
  }
}
