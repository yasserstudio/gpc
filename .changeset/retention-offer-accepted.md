---
"@gpc-cli/api": minor
"@gpc-cli/core": minor
"@gpc-cli/cli": minor
---

Accepted retention offers: `rtdn decode` names notification type 21 `SUBSCRIPTION_PLAN_TRANSITION_UPDATED` (a plan transition was updated, for example when a subscriber accepts a retention offer) and, in table output, points at `gpc purchases subscription get`. That command's table now shows a `planTransition` row (state, target offer, expected time). API types add `PlanTransitionDetails`, `TransitionInfo` and `TransitionState` under `autoRenewingPlan`.
