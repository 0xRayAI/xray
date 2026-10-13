import sys, json; sys.path.insert(0, sys.argv[1])
import inbox_pass, inbox
roles = json.load(open(sys.argv[1] + '/routing/inbox-roles.json'))
for label in ["Arch1: deep review ask on #262", "Gate B run please", "unrelated comment"]:
    ev = {"kind": "issue_comment", "label": label, "repo": "example-org/x", "number": 262, "t_ct": "2026-10-13T05:00:00-05:00", "id": label}
    out = inbox._direct(ev, roles)
    print(label, "->", sorted({l.get("seat") for l in out if l}))
