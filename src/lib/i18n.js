// Interface language (English / Turkish).
// The current language is kept in this module, so plain helpers (dates, repeat descriptions ...) can translate without
// React. React components subscribe through the hook in src/i18n.jsx, which re-renders them when the language changes.
// Default is English (so the tests and any non-browser use are stable); the browser language picks Turkish in the app.

export const LANGS = ["en", "tr"];
export const LANG_KEY = "task-lang-v1";
export const LOCALES = { en: "en-US", tr: "tr-TR" };

const en = {
  // App
  "app.title": "Tasks",
  "app.description": "A to-do list grouped by date, with Google sign-in and Supabase backup.",
  "app.today": "Today",
  "app.nothingPlanned": "Nothing planned",
  "app.allDone": "All done 🎉",
  "app.doneOf": "{done} of {total} done",
  "app.progress": "Today's progress",
  "app.noTasksDay": "No tasks on this day.",
  "app.allCompleted": "All tasks completed ✨",
  "app.noTasksYet": "No tasks yet. Add your first one below.",
  "app.noTasksFromToday": "No tasks for today or later.",
  "app.overdue": "Overdue",
  "app.overdueTasks": "Overdue tasks",
  "app.moveAll": "Move all to today",
  "app.undo": "Undo",
  "toast.recurringAdded": "Recurring task added",
  "toast.recurringLater": "Recurring task added · will appear on {date}",
  "toast.deleted": "Task deleted",
  "toast.ruleDeleted": "Recurring task deleted",
  "toast.moved_one": "{n} task moved to today",
  "toast.moved_other": "{n} tasks moved to today",

  // Language switch
  "lang.label": "Language",
  "lang.en": "English",
  "lang.tr": "Türkçe",

  // Common
  "common.close": "Close",
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.edit": "Edit",
  "common.save": "Save",
  "common.ok": "OK",
  "common.description": "Description",
  "common.descriptionOptional": "Description (optional)",
  "common.today": "Today",
  "common.tomorrow": "Tomorrow",
  "common.thisWeek": "This week",
  "common.nextWeek": "Next week",
  "common.weekN": "Week {n}",
  "common.yesterday": "Yesterday",
  "common.subtasks": "Subtasks",
  "common.markDone": "Mark as completed: ",
  "common.markUndone": "Mark as not completed: ",
  "common.removeTime": "Remove time",

  // Weekdays (short) and repeat descriptions
  "day.1": "Mon",
  "day.2": "Tue",
  "day.3": "Wed",
  "day.4": "Thu",
  "day.5": "Fri",
  "day.6": "Sat",
  "day.0": "Sun",
  "repeat.everyDay": "Every day",
  "repeat.everyWeekday": "Every weekday",
  "repeat.weekends": "Weekends",
  "repeat.every": "Every {day}",
  "repeat.times_one": "{n} time",
  "repeat.times_other": "{n} times",

  // Composer
  "composer.newTask": "New task",
  "composer.placeholder": "Add a task…",
  "composer.add": "Add task",
  "composer.pickDate": "Pick a date",
  "composer.setTime": "Set a time",
  "composer.repeat": "Repeat",
  "composer.details": "Details",
  "composer.reset": "Reset",
  "composer.startsOn": "Starts on {date}. ",
  "composer.onlyTwoDays": "Only shown for today and tomorrow; later days are added when they come up.",
  "time.pick": "Pick a time",
  "time.title": "Time",
  "time.hour": "Hour",
  "time.minute": "Minute",

  // Repeat picker
  "picker.days": "Repeat days",
  "picker.ends": "Ends",
  "picker.forever": "Forever",
  "picker.setNumber": "A set number",
  "picker.decrease": "Decrease",
  "picker.increase": "Increase",
  "picker.numberOfRepeats": "Number of repeats",
  "picker.times": "times",
  "picker.summaryEnds": " · {n} times, then ends",
  "picker.summaryForever": " · forever",
  "picker.pickOne": "Pick at least one day",

  // Subtasks
  "subs.titleEvery": "Subtasks (added to every occurrence)",
  "subs.add": "Add subtask",
  "subs.remove": "Remove subtask: {title}",
  "subs.name": "Subtask name",
  "subs.limit": "Subtask limit reached",

  // Edit dialog
  "edit.task": "Edit task",
  "edit.rule": "Edit recurring task",
  "edit.name": "Task name",
  "edit.noTime": "No time",
  "edit.date": "Date",
  "edit.time": "Time",
  "edit.ruleNote": "Changes apply from today on, to unfinished occurrences. Past and completed tasks stay as they are.",
  "edit.editRepeat": "Edit repeat",
  "edit.confirmDeletion": "Confirm deletion",
  "edit.deleteRule": "Delete this recurring task? Unfinished occurrences from today on will be deleted too.",
  "edit.deleteTask": "Delete this task?",
  "edit.yesDelete": "Yes, delete",

  // Task row
  "task.completed": "Completed",
  "task.details": "Details: {title}",
  "task.at": ", at {time}",
  "task.hasNote": "Has a note",
  "task.recurring": "Recurring task",
  "task.unstar": "Remove from starred tasks",
  "task.star": "Add to starred tasks",
  "task.starredTitle": "Starred task",
  "task.starTitle": "Star task",
  "task.confirmDeletion": "Confirm deletion: {title}",
  "task.deleteQ": "Delete?",

  // History
  "history.title": "History",
  "history.aria_one": "History ({n} day)",
  "history.aria_other": "History ({n} days)",
  "history.stats": "{done} of {total} tasks done · {days} {dayWord}",
  "history.day_one": "day",
  "history.day_other": "days",
  "history.empty": "No past days yet.",

  // Recurring list
  "rules.title": "Recurring tasks",
  "rules.button": "Recurring",
  "rules.aria": "Recurring tasks ({n})",
  "rules.count_one": "{n} task",
  "rules.count_other": "{n} tasks",
  "rules.ended": " · Ended",
  "rules.progress": " · {done}/{total} (last: {date})",

  // Cloud backup
  "sync.backUp": "Back up with Google",
  "sync.signInAgain": "Sign in again",
  "sync.ariaNeedsAuth": "Cloud backup: sign in again",
  "sync.ariaError": "Cloud backup: error",
  "sync.ariaSyncing": "Syncing",
  "sync.ariaDefault": "Cloud backup",
  "sync.errorStatus": "Sync error",
  "sync.expired": "Session expired. Sign in again to keep backing up.",
  "sync.googleAccount": "Google account",
  "sync.syncedAt": " · synced {time}",
  "sync.syncNow": "Sync now",
  "sync.tryAgain": "Try again",
  "sync.disconnect": "Disconnect",

  // Sync / server errors
  "err.offline": "No internet connection, will retry when it returns.",
  "err.unknown": "Unknown error",
  "err.signInStart": "Could not start sign-in",
  "err.unreachable": "Could not reach the server. Will retry when the connection returns.",
  "err.noTable": "Table '{table}' does not exist in Supabase. Run supabase/setup.sql in the SQL Editor.",
  "err.rls": "Access to the table was denied (RLS). Make sure you have run supabase/setup.sql.",
  "err.requestFailed": "Supabase request failed",
};

const tr = {
  // App
  "app.title": "Görevler",
  "app.description": "Tarihe göre gruplanmış yapılacaklar listesi; Google ile giriş ve Supabase yedekleme.",
  "app.today": "Bugün",
  "app.nothingPlanned": "Planlanmış bir şey yok",
  "app.allDone": "Hepsi tamam 🎉",
  "app.doneOf": "{total} görevden {done} tanesi tamam",
  "app.progress": "Bugünün ilerlemesi",
  "app.noTasksDay": "Bu gün için görev yok.",
  "app.allCompleted": "Tüm görevler tamamlandı ✨",
  "app.noTasksYet": "Henüz görev yok. İlk görevini aşağıdan ekle.",
  "app.noTasksFromToday": "Bugün veya sonrası için görev yok.",
  "app.overdue": "Gecikmiş",
  "app.overdueTasks": "Gecikmiş görevler",
  "app.moveAll": "Hepsini bugüne taşı",
  "app.undo": "Geri al",
  "toast.recurringAdded": "Tekrarlayan görev eklendi",
  "toast.recurringLater": "Tekrarlayan görev eklendi · {date} tarihinde görünecek",
  "toast.deleted": "Görev silindi",
  "toast.ruleDeleted": "Tekrarlayan görev silindi",
  "toast.moved_one": "{n} görev bugüne taşındı",
  "toast.moved_other": "{n} görev bugüne taşındı",

  // Language switch
  "lang.label": "Dil",
  "lang.en": "English",
  "lang.tr": "Türkçe",

  // Common
  "common.close": "Kapat",
  "common.cancel": "İptal",
  "common.delete": "Sil",
  "common.edit": "Düzenle",
  "common.save": "Kaydet",
  "common.ok": "Tamam",
  "common.description": "Açıklama",
  "common.descriptionOptional": "Açıklama (isteğe bağlı)",
  "common.today": "Bugün",
  "common.tomorrow": "Yarın",
  "common.thisWeek": "Bu hafta",
  "common.nextWeek": "Gelecek hafta",
  "common.weekN": "{n}. hafta",
  "common.yesterday": "Dün",
  "common.subtasks": "Alt görevler",
  "common.markDone": "Tamamlandı olarak işaretle: ",
  "common.markUndone": "Tamamlanmadı olarak işaretle: ",
  "common.removeTime": "Saati kaldır",

  // Weekdays (short) and repeat descriptions
  "day.1": "Pzt",
  "day.2": "Sal",
  "day.3": "Çar",
  "day.4": "Per",
  "day.5": "Cum",
  "day.6": "Cmt",
  "day.0": "Paz",
  "repeat.everyDay": "Her gün",
  "repeat.everyWeekday": "Hafta içi her gün",
  "repeat.weekends": "Hafta sonları",
  "repeat.every": "Her {day}",
  "repeat.times_one": "{n} kez",
  "repeat.times_other": "{n} kez",

  // Composer
  "composer.newTask": "Yeni görev",
  "composer.placeholder": "Görev ekle…",
  "composer.add": "Görevi ekle",
  "composer.pickDate": "Tarih seç",
  "composer.setTime": "Saat belirle",
  "composer.repeat": "Tekrarla",
  "composer.details": "Ayrıntılar",
  "composer.reset": "Sıfırla",
  "composer.startsOn": "{date} tarihinde başlar. ",
  "composer.onlyTwoDays": "Yalnızca bugün ve yarın için gösterilir; sonraki günler sırası geldiğinde eklenir.",
  "time.pick": "Saat seç",
  "time.title": "Saat",
  "time.hour": "Saat",
  "time.minute": "Dakika",

  // Repeat picker
  "picker.days": "Tekrar günleri",
  "picker.ends": "Bitiş",
  "picker.forever": "Süresiz",
  "picker.setNumber": "Belirli sayıda",
  "picker.decrease": "Azalt",
  "picker.increase": "Artır",
  "picker.numberOfRepeats": "Tekrar sayısı",
  "picker.times": "kez",
  "picker.summaryEnds": " · {n} kez, sonra biter",
  "picker.summaryForever": " · süresiz",
  "picker.pickOne": "En az bir gün seç",

  // Subtasks
  "subs.titleEvery": "Alt görevler (her tekrara eklenir)",
  "subs.add": "Alt görev ekle",
  "subs.remove": "Alt görevi kaldır: {title}",
  "subs.name": "Alt görev adı",
  "subs.limit": "Alt görev sınırına ulaşıldı",

  // Edit dialog
  "edit.task": "Görevi düzenle",
  "edit.rule": "Tekrarlayan görevi düzenle",
  "edit.name": "Görev adı",
  "edit.noTime": "Saat yok",
  "edit.date": "Tarih",
  "edit.time": "Saat",
  "edit.ruleNote": "Değişiklikler bugünden itibaren, tamamlanmamış tekrarlara uygulanır. Geçmiş ve tamamlanmış görevler olduğu gibi kalır.",
  "edit.editRepeat": "Tekrarı düzenle",
  "edit.confirmDeletion": "Silmeyi onayla",
  "edit.deleteRule": "Bu tekrarlayan görev silinsin mi? Bugünden itibaren tamamlanmamış tekrarlar da silinecek.",
  "edit.deleteTask": "Bu görev silinsin mi?",
  "edit.yesDelete": "Evet, sil",

  // Task row
  "task.completed": "Tamamlanan",
  "task.details": "Ayrıntılar: {title}",
  "task.at": ", saat {time}",
  "task.hasNote": "Notu var",
  "task.recurring": "Tekrarlayan görev",
  "task.unstar": "Yıldızlı görevlerden kaldır",
  "task.star": "Yıldızlı görevlere ekle",
  "task.starredTitle": "Yıldızlı görev",
  "task.starTitle": "Göreve yıldız ver",
  "task.confirmDeletion": "Silmeyi onayla: {title}",
  "task.deleteQ": "Silinsin mi?",

  // History
  "history.title": "Geçmiş",
  "history.aria_one": "Geçmiş ({n} gün)",
  "history.aria_other": "Geçmiş ({n} gün)",
  "history.stats": "{total} görevin {done} tanesi tamam · {days} {dayWord}",
  "history.day_one": "gün",
  "history.day_other": "gün",
  "history.empty": "Henüz geçmiş gün yok.",

  // Recurring list
  "rules.title": "Tekrarlayan görevler",
  "rules.button": "Tekrarlayan",
  "rules.aria": "Tekrarlayan görevler ({n})",
  "rules.count_one": "{n} görev",
  "rules.count_other": "{n} görev",
  "rules.ended": " · Bitti",
  "rules.progress": " · {done}/{total} (son: {date})",

  // Cloud backup
  "sync.backUp": "Google ile yedekle",
  "sync.signInAgain": "Tekrar giriş yap",
  "sync.ariaNeedsAuth": "Bulut yedekleme: tekrar giriş yap",
  "sync.ariaError": "Bulut yedekleme: hata",
  "sync.ariaSyncing": "Eşitleniyor",
  "sync.ariaDefault": "Bulut yedekleme",
  "sync.errorStatus": "Eşitleme hatası",
  "sync.expired": "Oturum süresi doldu. Yedeklemeye devam etmek için tekrar giriş yap.",
  "sync.googleAccount": "Google hesabı",
  "sync.syncedAt": " · {time} eşitlendi",
  "sync.syncNow": "Şimdi eşitle",
  "sync.tryAgain": "Tekrar dene",
  "sync.disconnect": "Bağlantıyı kes",

  // Sync / server errors
  "err.offline": "İnternet bağlantısı yok, bağlantı gelince yeniden denenecek.",
  "err.unknown": "Bilinmeyen hata",
  "err.signInStart": "Giriş başlatılamadı",
  "err.unreachable": "Sunucuya ulaşılamadı. Bağlantı gelince yeniden denenecek.",
  "err.noTable": "'{table}' tablosu Supabase'de yok. SQL Editor'de supabase/setup.sql dosyasını çalıştır.",
  "err.rls": "Tabloya erişim reddedildi (RLS). supabase/setup.sql dosyasını çalıştırdığından emin ol.",
  "err.requestFailed": "Supabase isteği başarısız oldu",
};

export const DICTS = { en, tr };

let current = "en";

export const isLang = (v) => LANGS.includes(v);
export const getLang = () => current;
export const setLang = (lang) => {
  if (isLang(lang)) current = lang;
  return current;
};
export const getLocale = (lang = current) => LOCALES[lang] || LOCALES.en;

// Saved choice first, then the browser language (Turkish for "tr", English for everything else)
export function detectLang() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (isLang(saved)) return saved;
  } catch {}
  const nav = typeof navigator !== "undefined" ? navigator.languages?.[0] || navigator.language || "" : "";
  return String(nav).toLowerCase().startsWith("tr") ? "tr" : "en";
}

export function saveLang(lang) {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {}
}

const fill = (str, params) =>
  params ? str.replace(/\{(\w+)\}/g, (m, k) => (params[k] === undefined ? m : String(params[k]))) : str;

// t("key", { name }) -> text in the current language (falls back to English, then to the key itself)
export function t(key, params) {
  return fill(DICTS[current]?.[key] ?? en[key] ?? key, params);
}

// Plural-aware: tp("toast.moved", 3, { ... }) picks "toast.moved_one" / "toast.moved_other"; {n} is filled in
export function tp(key, n, params) {
  const form = new Intl.PluralRules(getLocale()).select(n) === "one" ? "_one" : "_other";
  return t(key + form, { n, ...params });
}
