import { useEffect, useState } from "react";
import { Dimensions, Keyboard, Platform, type KeyboardEvent } from "react-native";
import { readAndroidKeyboardOverlap } from "../lib/keyboardHeight";

function readKeyboardHeight(event: KeyboardEvent): number {
  const { height, screenY } = event.endCoordinates;
  if (Platform.OS !== "android") return height;
  return readAndroidKeyboardOverlap(Dimensions.get("window").height, screenY, height);
}

/** Visible keyboard height in px; 0 when closed. */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const onShow = (event: KeyboardEvent) => {
      setHeight(readKeyboardHeight(event));
    };
    const onHide = () => setHeight(0);

    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return height;
}
