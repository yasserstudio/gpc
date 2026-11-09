---
"@gpc-cli/cli": patch
---

`HTTPS_PROXY` / `HTTP_PROXY` now work on Node 26. Node 26's built-in `fetch` stopped reading the proxy setting GPC installed, so on Node 26 Google Play API requests, and their OAuth tokens, went direct even with a proxy configured. Node 22 and 24 were not affected, and neither was the standalone binary. Two related `NO_PROXY` changes: an empty lowercase `no_proxy=` no longer hides a set `NO_PROXY`, and a `NO_PROXY` domain now also covers its subdomains (`NO_PROXY=googleapis.com` sends `androidpublisher.googleapis.com` direct). The minimum Node version is now 20.18.1.
