import { LANGS } from "../lib/i18n.js";
import { useI18n } from "../i18n.jsx";

// Header language switch: ONE icon-sized button (same size as its neighbours) that shows the current language code.
// Tapping it switches to the other language (there are only two), so no extra pill or menu clutters the header.
export default function LangSwitch() {
  const { lang, setLang, t } = useI18n();
  const next = LANGS[(LANGS.indexOf(lang) + 1) % LANGS.length];
  const label = t("lang.label") + ": " + t("lang." + lang) + " → " + t("lang." + next);
  return (
    <button
      type="button"
      onClick={() => setLang(next)}
      aria-label={label}
      title={label}
      className="icon-btn text-[0.75rem] font-semibold tracking-wide"
    >
      <span aria-hidden="true">{lang.toUpperCase()}</span>
    </button>
  );
}
