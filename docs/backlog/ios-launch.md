# iOS Launch

**Priority:** High (after Android validation)
**Depends on:** Android launch learnings

## What's Needed

- [ ] Apple Developer Account ($99/year)
- [ ] App Store Connect setup
- [ ] EAS build profile for iOS (`eas.json` ios section)
- [ ] iOS provisioning profiles & certificates
- [ ] App Store screenshots (iPhone, iPad if supporting tablets)
- [ ] App Store review guidelines compliance check
- [ ] Apple privacy nutrition labels (App Privacy section)
- [ ] TestFlight beta testing round
- [ ] Submit for App Store review (expect 1-3 day review cycle)

## Notes

- Apple Sign-in secrets will already be set up (blocking item for Android launch)
- Privacy policy will already exist
- Sentry + PostHog will already be integrated
- Main extra work is Apple-specific store assets and review process
- iPad support is currently enabled in app.json — verify tablet layout works
