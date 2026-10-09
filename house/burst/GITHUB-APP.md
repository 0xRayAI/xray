# Per-seat GitHub App

`mintPlan` builds the access-token request for one seat from config: app id, installation id, permissions, and repository names. It does not read a key and it does not print a token.

`permissionDrift` lists returned permissions that were not requested at that level. An empty permission map is drift. The caller discards the token when the list is not empty.
