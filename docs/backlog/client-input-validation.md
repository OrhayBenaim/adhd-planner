# Client-Side Input Validation

**Priority:** Medium
**Security ref:** H2 from security audit

## What's Needed

- [ ] Task title validation — max length, no empty strings, trim whitespace
- [ ] Task description validation — max length
- [ ] User preference fields — validate against expected ranges/formats
- [ ] Email format validation on auth screens
- [ ] Show inline validation errors in UI (not just server rejection)
- [ ] Consider using zod for shared validation schemas between client and server

## Notes

- Server-side validation (H3) is being added in v1.0.0
- Client-side validation is UX improvement — prevents round-trip to server for obvious errors
- Keep validation rules in sync between client and Convex schema
