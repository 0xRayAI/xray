/**
 * Mirrors pre-compact.js lessonSpeechForIntent — organ only, matched-signal filter.
 */
export function lessonLinesForIntent(organ, intent) {
  if (!intent) {
    return { matchedSignals: [], lessons: [], speech: [] };
  }
  const context = organ.buildRoutingContext(String(intent));
  const matched = new Set(Array.isArray(context.matchedSignals) ? context.matchedSignals : []);
  const lessons = [];
  const speech = [];
  for (const lesson of context.lessons ?? []) {
    if (!matched.has(lesson.name)) continue;
    const lines = [...(lesson.lines ?? [])].sort((a, b) => {
      const ta = Date.parse(String(a.at ?? '')) || 0;
      const tb = Date.parse(String(b.at ?? '')) || 0;
      return tb - ta;
    });
    for (const line of lines) {
      const text = String(line.text || '').trim().slice(0, 400);
      if (text.length === 0) continue;
      lessons.push(text);
      speech.push(`${lesson.name}: ${text}`);
      if (speech.length >= 4) {
        return { matchedSignals: [...matched], lessons, speech };
      }
    }
  }
  return { matchedSignals: [...matched], lessons, speech };
}
