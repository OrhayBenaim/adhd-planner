# Push Notification Sending

**Priority:** High
**Depends on:** Push token registration (done in v1.0.0)

## What's Needed

- [ ] Implement notification scheduling logic in Convex (cron or scheduled function)
- [ ] Task reminder notifications (e.g., 30min before due time)
- [ ] Daily planning reminder (configurable time from user preferences)
- [ ] Streak/gamification notifications (maintain engagement)
- [ ] Notification preferences UI — let users choose which types they receive
- [ ] Handle token expiration/refresh
- [ ] Batch sending for efficiency
- [ ] Test on physical devices (emulator push is unreliable)

## Architecture

- Use Expo Push API (`expo-server-sdk` in Convex action)
- Convex cron checks for upcoming tasks and sends reminders
- Respect `notificationsEnabled` flag in userPreferences
- Store notification history for debugging

## Notes

- Push tokens are already being registered in v1.0.0
- Expo push tokens work for both Android and iOS
- No FCM/APNs setup needed — Expo handles the routing
