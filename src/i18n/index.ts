import { en } from "./en";
import { ja } from "./ja";
import type { LanguageCode } from "../types";

export const dictionaries = {
  ja,
  en,
};

export function getDictionary(language: LanguageCode) {
  return dictionaries[language];
}
