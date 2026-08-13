TypeScript monorepo: `apps/mobile` (Expo), `apps/convex` (backend), `packages/types`.


---

Figma workflow

**Skill (use proactively for any Figma / design↔code work):** `.agents/skills/figma-workflow/SKILL.md`

**Frame map:** [`FIGMA.md`](./FIGMA.md) — which frames map to which flows.

- In progress (research / experimental): https://www.figma.com/design/uEKUhrvteSOfw9kRknd9I6/ADHD?node-id=71-12
- Production (implemented in the app): https://www.figma.com/design/uEKUhrvteSOfw9kRknd9I6/ADHD?node-id=71-13

ANY CHANGES SHOULD FIRST BE PERFORMED IN THE "in progress" PAGE AND ONLY AFTER APPROVED SHOULD BE MOVED TO "Production" PAGE

WHEN A DESIGN IS APPROVED, MOVING IT TO PRODUCTION ALSO ADD COMMENTS ON THE CHANGES MADE, SOME TIME A REPLACE IS NESSCARY THAN A SIMPLE MOVE

WHEN PRODUCTION DESIGN IS IMPLEMENTED, REMOVE THE COMMENTS THAT WHERE IMPLEMENTED
---

Design and code relationship

Code and design should always be in sync, if a UI change is implemented in code it should be synced over to figma and vise versa, MUST FOLLOW FIGMA WORKFLOW.


---

# Hard rules

- When the user asking questions or surfacing a bug dont run to implement or fix the bug, first have a conversation and research about it.

- Issues from /to-tickets should always be created on a spec issues that was generated from /to-spec

- Dont over engineer, always look at work and see if can this be simplified. gaching over engineering before implementing cost less than catching after implementing
