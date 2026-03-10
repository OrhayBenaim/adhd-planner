# Security Issues — Medium & Low Priority

**Reference:** `/security_audit.md`

## Medium Severity

- [ ] **M1:** Deep link parameter validation — sanitize params from `adhd-planner://` URLs
- [ ] **M2:** Screenshot protection on sensitive screens (FLAG_SECURE on Android)
- [ ] **M3:** User-friendly error messages — replace raw error strings with generic messages
- [ ] **M4:** Certificate pinning — pin Convex API certificates
- [ ] **M5:** Validate JSON structure from OpenRouter API responses
- [ ] **M6:** Prompt injection mitigation — sanitize task titles before sending to AI
- [ ] **M7:** Sanitize API error responses to prevent data leaks
- [ ] **M8:** Remove or guard `console.error` in production builds

## Low Severity

- [ ] Network state checks before API calls
- [ ] Email format validation (client-side)
- [ ] Client-side rate limiting UI feedback
- [ ] Prevent invalid score values from being stored
- [ ] Remove dead code in AI module
- [ ] Remove plaintext user IDs from migration logs

## Notes

- None of these are blocking for Play Store submission
- Prioritize M6 (prompt injection) and M8 (console.error cleanup) for v1.0.1
- M4 (certificate pinning) can wait until there's a real threat model
