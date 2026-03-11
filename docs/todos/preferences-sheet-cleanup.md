# PreferencesSheet Cleanup

**File:** `apps/mobile/src/components/sheets/PreferencesSheet.tsx`

**Source:** react-doctor v0.0.30 scan (98/100, 3 warnings all in this file)

## Warnings

### 1. `no-cascading-set-state` (line 38)
3 setState calls in a single useEffect. Replace with `useReducer` or derive state.

### 2. `no-effect-event-handler` (line 38)
useEffect simulating an event handler. Move conditional logic into an actual event handler (onClick, onChange, onSubmit).

### 3. `rn-no-legacy-expo-packages` (line 3)
`@expo/vector-icons` is deprecated — migrate to `expo-symbols` or `expo-image`. Note: this affects the entire project, not just this file.
