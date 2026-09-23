---
"@gpc-cli/api": patch
"@gpc-cli/core": patch
---

The users client always sends `pageSize=-1`, the only value Google accepts, and ignores a caller-supplied page size (now deprecated) instead of sending a request Google rejects.
