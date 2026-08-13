---
"@gpc-cli/api": patch
---

Stop reporting incomplete Play Console "App content" declarations as a service account permission failure (GH #101).

Play returns a plain 403 when a declaration is incomplete, and its text often contains the word "permissions" — the Foreground Service gate reads "...uses any Foreground Service permissions". GPC matched a bare `permission` substring, so it replaced Google's explanation with "The service account does not have permission for this operation" and pointed at Users and permissions in the Console. The credentials were never the problem, and no permission change could fix it.

These 403s now return a new `API_DECLARATION_REQUIRED` code that quotes Google's own message verbatim and points at Policy → App content. The insufficient-permissions branch now matches explicit denial phrasing only, so OAuth scope failures also keep their original message instead of being reported as a Play Console permission problem. Genuine permission denials are unchanged.
