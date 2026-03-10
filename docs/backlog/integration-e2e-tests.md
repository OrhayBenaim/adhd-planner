# Integration & E2E Tests

**Priority:** Medium

## Current State

- 2 unit test files exist: `moodLabels.test.ts`, `taskSplitter.test.ts`
- No integration tests
- No E2E tests
- No test coverage for critical paths

## What's Needed

### Unit Tests
- [ ] Auth flow (token storage, refresh, anonymous conversion)
- [ ] AI scoring logic (request building, response parsing, rate limiting)
- [ ] Task CRUD operations
- [ ] Gamification (XP calculation, level progression)
- [ ] Cost tracking accumulation

### Integration Tests
- [ ] Task creation → AI scoring → audit logging flow
- [ ] Anonymous → authenticated user migration
- [ ] Voice input → task creation flow

### E2E Tests
- [ ] Onboarding flow (all steps)
- [ ] Create task via text input
- [ ] Create task via voice input
- [ ] Complete task → XP gain → level up
- [ ] Settings changes persist

## Tools

- Consider Maestro or Detox for mobile E2E
- Jest for unit/integration
- Convex testing utilities for backend

## Notes

- Focus on critical paths first (task creation, auth)
- Voice input E2E is hard to automate — may need manual testing protocol
