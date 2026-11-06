import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { detectLang, getLocale, saveLang, setLang, t, tp } from "./lib/i18n.js";

const Ctx = createContext(null);

// Holds the interface language. The language is set in lib/i18n.js *before* the state changes, so every component that
// re-renders because of it already reads the new texts.
export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => setLang(detectLang()));

  const change = useCallback((next) => {
    setLang(next);
    saveLang(next);
    setLangState(next);
  }, []);

  // Page language (correct upper-casing of "i"/"İ", screen readers, hyphenation), title and description
  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = t("app.title");
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", t("app.description"));
  }, [lang]);

  const value = useMemo(() => ({ lang, locale: getLocale(lang), setLang: change, t, tp }), [lang, change]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// Components call this to read texts; they re-render when the language changes (also inside React.memo)
export function useI18n() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useI18n must be used inside <LangProvider>");
  return v;
}
