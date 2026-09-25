/** Plate hint catalog — consumed by pipeline-suite and recall bin */
const ENTRIES = [
  { id: "plate-tag-0", match: (t) => t.includes("0") || t.includes('TYPE') },
  { id: "plate-tag-1", match: (t) => t.includes("1") || t.includes('TYPE') },
  { id: "plate-tag-2", match: (t) => t.includes("2") || t.includes('TYPE') },
  { id: "plate-tag-3", match: (t) => t.includes("3") || t.includes('TYPE') },
  { id: "plate-tag-4", match: (t) => t.includes("4") || t.includes('TYPE') },
  { id: "plate-tag-5", match: (t) => t.includes("5") || t.includes('TYPE') },
  { id: "plate-tag-6", match: (t) => t.includes("6") || t.includes('TYPE') },
  { id: "plate-tag-7", match: (t) => t.includes("7") || t.includes('TYPE') },
  { id: "plate-tag-8", match: (t) => t.includes("8") || t.includes('TYPE') },
  { id: "plate-tag-9", match: (t) => t.includes("9") || t.includes('TYPE') },
  { id: "plate-attestation", match: (t) => t.toLowerCase().includes('attestation') },
  { id: "plate-trap", match: (t) => t.toLowerCase().includes('ontological') },
  { id: "plate-consumer", match: (t) => t.toLowerCase().includes('consumer') },
];

export function plateHintsForTask(task) {
  const text = String(task ?? '');
  const matched = ENTRIES.filter((e) => e.match(text)).map((e) => e.id);
  return { matched, total: ENTRIES.length, hasRecallPlate: text.length > 0 };
}
