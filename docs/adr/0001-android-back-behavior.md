# Android back: stack for routes, custom only on roots

Expo Router already pops stack screens on Android back. We do not reimplement that. Custom back handling lives only on root screens (Home and first onboarding Welcome): dismiss the most recent dismissible surface one back-step at a time; when nothing remains, arm exit (~2s) with a small toast, then exit on a second back. Bottom sheets and overlays do not get free hardware-back support from their libraries, so those need explicit handling. In-app chevrons are not migrated onto this handler in the first change.
