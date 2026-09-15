# KILLER-DUAL-CLOUD — compare receipt

Ticket: TICKET-KILLER-DUAL-CLOUD

| | Arm S | Arm B |
|--|--|--|
| bc | `bc-cd19bb4e` | `bc-12f1ecad` |
| Model | `cursor-grok-4.6-high` | `cursor-grok-4.6-high` |
| Window | Ticket 500k. Host stdin later **256000** (third fire) | Ticket 500k. Tokens MISS — writer died before stdin parse |
| PRs | **#55** survive/map · **#56** seat CLI (**prefer**) | **#57** writer fix + map · **#54 parked** (`--go`) |
| Harness | hooks YES + repertoire@0.2.0 | stripped hooks; repertoire not fastened |
| preCompact | **Y** (count=3) 09:30:38 / 09:30:49 / **10:12:45** | **Y** (probe 09:35:46 / 09:38:20) |
| Station at fire | writer ran | **FAIL** (`delegation-gate.js` missing at import); Path C PASS after lazy-load |
| Real usage | first fires tokens=**231344** window MISS; third fire tokens=**232105** window=**256000** | tokens **MISS** — JS died before stdin parse |
| Killer | usage receipt forbid chars÷4; survive + doctor CLI | mill `--go` (parked) · dist-miss writer on #57 |

Under pressure: both got host fire. S parsed stdin; B’s probe logged fire but the writer process died. Complementary: prefer **#56** for the seat CLI; park **#54**; keep **#57** if critic wants the dist-miss case. Merge after critic.

Next lever: cite host `context_window_size` on Station when present — **no FILL**. Do not relaunch either bc.
