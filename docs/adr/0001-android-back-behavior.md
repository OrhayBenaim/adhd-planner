# Android back: stack for routes, custom only on roots

Expo Router already pops stack screens on Android back. RN `Modal` overlays (survey invite/form) dismiss via `onRequestClose`. Custom handling lives only on root screens (Home, first Welcome), with one focus-gated `BackHandler` each (`useAndroidRootBack`):

1. If a dismissible surface is open (sheet, tour, Welcome sign-in) → close it.
2. Otherwise → arm exit (~2s toast); second back exits the app.

`@gorhom/bottom-sheet` does not handle hardware back; closing the open sheet is enough. In-app chevrons still handle sheet-internal steps.
