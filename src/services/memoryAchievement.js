const NEGATIVE_OR_INCOMPLETE = [
  /\b(?:broke|broken|died|failed|lost|missed)\b/,
  /\b(?:won't|will not|can't|cannot|didn't|did not)\s+(?:finish|complete|graduate|run|earn|achieve)\b/,
  /\b(?:until|by)\s+(?:tomorrow|next\s+(?:week|month|year))\b/,
];

const ORDINARY_FIRST = /\bfirst\s+(?:thing|stop|store|time today)\b/;
const OTHER_PERSON = /\b(?:proud of my|my (?:son|daughter|friend|brother|sister|partner) (?:won|finished|graduated|earned|completed))\b/;

function includes(text, pattern) {
  return pattern.test(text);
}

export function detectMemoryAchievement(memory = {}) {
  const text = `${memory.title || ""} ${memory.description || ""}`
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  const signals = [];
  let score = 0;

  if (!text || NEGATIVE_OR_INCOMPLETE.some((pattern) => includes(text, pattern))) {
    return {
      isLikelyAchievement: false,
      confidence: "none",
      signals: ["negative-or-incomplete-context"],
      reason: "The Memory describes a negative or unfinished event.",
    };
  }

  if (ORDINARY_FIRST.test(text)) {
    return {
      isLikelyAchievement: false,
      confidence: "none",
      signals: ["ordinary-sequence-language"],
      reason: "First is used as sequence language rather than an accomplishment.",
    };
  }

  if (/\b(?:personal best|personal record|new pr|pb)\b/.test(text)) {
    score += 5;
    signals.push("explicit-personal-best");
  }
  if (/\b(?:graduated|earned (?:my |a )?(?:degree|diploma|certification)|became certified)\b/.test(text)) {
    score += 4;
    signals.push("education-milestone");
  }
  if (/\b(?:finished|completed|ran)\b/.test(text)) {
    score += 2;
    signals.push("completion-language");
  }
  if (/\b(?:first|first-ever)\b/.test(text)) {
    score += 1;
    signals.push("first-time-language");
  }
  if (/\b(?:marathon|half marathon|5k|10k|triathlon|race|degree|certification|book|novel)\b/.test(text)) {
    score += 2;
    signals.push("meaningful-goal-context");
  }
  if (/\b(?:promoted|promotion|launched|published|graduated)\b/.test(text)) {
    score += 2;
    signals.push("explicit-milestone-language");
  }
  if (/\bafter\s+(?:\w+\s+){0,5}(?:years?|months?|weeks?|training|classes)\b/.test(text)) {
    score += 2;
    signals.push("sustained-effort-context");
  }
  if (/\b\d+\s+(?:years?|months?|days?)\s+(?:sober|clean|of sobriety)\b/.test(text)) {
    score += 5;
    signals.push("sobriety-milestone");
  }
  if (/\b(?:proud of myself|i(?:'m| am) proud|i did it|accomplished|achieved)\b/.test(text)) {
    score += 2;
    signals.push("personal-accomplishment-language");
  }
  if ((memory.categories || []).some((category) => /milestone|school|work|fitness/i.test(category))) {
    score += 1;
    signals.push("supporting-category");
  }
  if (OTHER_PERSON.test(text)) {
    score -= 3;
    signals.push("other-person-context");
  }

  const confidence = score >= 4 ? "high" : score >= 2 ? "medium" : "none";
  return {
    isLikelyAchievement: confidence === "high",
    confidence,
    signals,
    reason:
      confidence === "high"
        ? "Multiple contextual signals describe a completed accomplishment or milestone."
        : confidence === "medium"
          ? "Some achievement context is present, but not enough for a suggestion."
          : "No strong accomplishment context was found.",
  };
}
