# Activity

`validActivity` checks one JSON object before it is appended. Required fields are `t_ct`, `seat`, `kind`, and `action`. Optional fields are `to`, `agent`, and `tag` (`tag` at most 80 characters). `seat` must match the caller. The schema is [activity.schema.json](activity.schema.json). Prompt lines and cloud-agent lines have their own schemas. The checker refuses unknown fields and values that carry free text.

`acceptLine` appends a passing object with `by` and `seq`.

`verifyInstallationToken` checks a seat's GitHub App installation token before that line is stored. The shape is `^ghs_[A-Za-z0-9._-]{20,1024}$`. The cache key is sha256 of the token. There is no static activity key.
