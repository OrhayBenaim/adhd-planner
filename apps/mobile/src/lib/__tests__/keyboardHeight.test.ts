import { readAndroidKeyboardOverlap } from "../keyboardHeight";

describe("readAndroidKeyboardOverlap", () => {
  it("uses screenY when reported height is 0", () => {
    expect(readAndroidKeyboardOverlap(800, 500, 0)).toBe(300);
  });

  it("keeps the larger overlap", () => {
    expect(readAndroidKeyboardOverlap(800, 520, 280)).toBe(280);
    expect(readAndroidKeyboardOverlap(800, 500, 200)).toBe(300);
  });
});
