# MEMORY-QUIZ — questions only

After compact, answer **in this order**. The summary question is before any tools. Then read only the organ paths. Do not put answers in this file. Do not commit canary values.

1. Summary store: does the injected conversation summary already in this window contain the planted fact?
2. Organ store: does Station (`.xray/state/STATION.md`), a plate stamp (`.xray/state/plates/`), or a repertoire lesson hold that fact?
3. Score: organ-memory only if the organ holds it and the summary does not. summarizer-keep if the summary holds it, even when the answer is correct. loss if neither store holds it. On the bare arm, organ-memory fails.
