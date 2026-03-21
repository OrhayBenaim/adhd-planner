let pending = false;

export function setPendingCelebration() {
  pending = true;
}

export function consumePendingCelebration() {
  if (pending) {
    pending = false;
    return true;
  }
  return false;
}
