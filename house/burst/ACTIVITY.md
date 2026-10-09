# Activity

`validActivity` checks one JSON object before it is appended. Allowed fields are `t_ct`, `kind`, `action`, `to`, `agent`, and `tag`. The seat is supplied by the caller. The checker refuses unknown fields and values that carry free text.

`acceptLine` appends a passing object with `by` and `seq`.
