import { Easing, WithSpringConfig } from "react-native-reanimated";

export const SPRING_BOUNCY: WithSpringConfig = {
  damping: 20,
  stiffness: 300,
};

/** Strong ease-out for things that enter or answer a tap. */
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
