export function parseDateOnlyLocal(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) return null;
  return date;
}

export function formatDateOnly(value, locale = "en-US") {
  const date = parseDateOnlyLocal(value);
  return date?.toLocaleDateString(locale, {
    month: "long",
    day: "numeric",
    year: "numeric",
  }) || "";
}
