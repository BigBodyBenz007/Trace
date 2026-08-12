const MONTHS = Object.freeze([
  ["January", "Jan"],
  ["February", "Feb"],
  ["March", "Mar"],
  ["April", "Apr"],
  ["May", "May"],
  ["June", "Jun"],
  ["July", "Jul"],
  ["August", "Aug"],
  ["September", "Sep"],
  ["October", "Oct"],
  ["November", "Nov"],
  ["December", "Dec"],
]);

function normalize(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function localDateParts(dateValue) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateValue || ""));
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
  return { year, month, day, paddedMonth: match[2], paddedDay: match[3] };
}

export function getMemoryDateSearchTokens(dateValue) {
  const parts = localDateParts(dateValue);
  if (!parts) return [];
  const { year, month, day, paddedMonth, paddedDay } = parts;
  const [fullMonth, shortMonth] = MONTHS[month - 1];
  return [
    fullMonth,
    shortMonth,
    String(year),
    `${fullMonth} ${year}`,
    `${shortMonth} ${year}`,
    `${fullMonth} ${day}`,
    `${shortMonth} ${day}`,
    `${fullMonth} ${day} ${year}`,
    `${fullMonth} ${day}, ${year}`,
    `${shortMonth} ${day} ${year}`,
    `${shortMonth} ${day}, ${year}`,
    `${month}/${day}/${year}`,
    `${paddedMonth}/${paddedDay}/${year}`,
    `${year}-${paddedMonth}-${paddedDay}`,
  ];
}

export function matchesMemorySearch(memory, query) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return true;
  const textValues = [
    memory?.title,
    memory?.description,
    memory?.body,
    ...(Array.isArray(memory?.categories) ? memory.categories : []),
    ...(Array.isArray(memory?.tags) ? memory.tags : []),
    ...getMemoryDateSearchTokens(memory?.date),
  ];
  return normalize(textValues.join(" ")).includes(normalizedQuery);
}
