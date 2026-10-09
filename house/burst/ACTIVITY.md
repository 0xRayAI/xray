# Activity

`validActivity` checks one JSON object before it is appended. Allowed fields are `t_ct`, `kind`, `action`, `to`, `agent`, and `tag`. The seat is supplied by the caller. The checker refuses unknown fields and values that carry free text.

`acceptLine` appends a passing object with `by` and `seq`.

`verifyInstallationToken` checks a seat's GitHub App installation token before that line is stored. The shape is `^ghs_[A-Za-z0-9._-]{20,1024}$`. The cache key is sha256 of the token. There is no static activity key.
