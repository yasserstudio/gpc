---
"@gpc-cli/core": minor
"@gpc-cli/cli": minor
---

New `policy-local-network-declaration` preflight advisory (info). When an app targeting Android 17 (API 37) or higher requests `ACCESS_LOCAL_NETWORK`, preflight reminds you that Google Play requires a Play Console declaration for it from August 25, 2027, and allows it only when device pickers are insufficient. Apps targeting API 36 or lower get no finding.
