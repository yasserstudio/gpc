---
"@gpc-cli/core": patch
---

feat: preflight and verify checklist track Google Play's July 15, 2026 policy update. The `READ_CALL_LOG` permission finding now notes that account verification via phone call is no longer an accepted use case and points to the Digital Credentials API (or SMS Retriever API) instead. The developer-verification advisory (`policy-developer-verification`) and `gpc verify checklist` add the mandate that every app on your account must be registered in Play Console, since unregistered apps risk removal from Google Play.
