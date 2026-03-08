import { WithSpringConfig, WithTimingConfig } from "react-native-reanimated";

export const SPRING_DEFAULT: WithSpringConfig = {
  damping: 20,
  stiffness: 300,
};

export const SPRING_BOUNCY: WithSpringConfig = {
  damping: 20,
  stiffness: 300,
};

export const SPRING_XP_BAR: WithSpringConfig = {
  damping: 20,
  stiffness: 120,
};

export const TIMING_FAST: WithTimingConfig = { duration: 150 };
export const TIMING_NORMAL: WithTimingConfig = { duration: 250 };
export const TIMING_SLOW: WithTimingConfig = { duration: 400 };
