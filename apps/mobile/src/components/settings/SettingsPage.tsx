import { useCallback, type ReactNode } from "react";
import { BackHandler, ScrollView, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { SvgXml } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { AppPressable } from "../AppPressable";
import { homeArtwork } from "../../../assets/home/artwork";
import { FloatingDog } from "../mascot/FloatingDog";
import { useWaveReveal } from "../../hooks/useWaveReveal";
import { settingsColors as colors, settingsStyles as styles } from "./theme";

interface Props {
  /** Parent section shown top-left; the root screen passes its own name instead. */
  parent?: string;
  screenName?: string;
  title?: string;
  explanation?: string;
  /** Small print under the content explaining when changes are kept. */
  note?: string;
  /** Root settings screen only: run the wave down on open and up on close. */
  animated?: boolean;
  onLeave?: () => void;
  children?: ReactNode;
}

/**
 * The blue, wave-bottomed surface every settings screen sits on, with the
 * header and back control the whole section shares.
 */
export function SettingsPage({ parent, screenName, title, explanation, note, animated = false, onLeave, children }: Props) {
  const { onLayout, surfaceStyle, contentStyle, close } = useWaveReveal(animated);

  const leave = useCallback(() => {
    onLeave?.();
    close();
  }, [onLeave, close]);

  // Android back has to run the same exit, or the wave would never come up.
  useFocusEffect(useCallback(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      leave();
      return true;
    });
    return () => sub.remove();
  }, [leave]));

  return (
    <View style={{ flex: 1 }} onLayout={animated ? onLayout : undefined}>
      <Animated.View style={[
        animated ? [surfaceStyle, { position: "absolute", left: 0, right: 0, top: 0 }] : { flex: 1 },
        { backgroundColor: colors.blue, overflow: "hidden" },
      ]}>
        <Animated.View style={[animated ? contentStyle : null, { flex: 1 }]}>
          <View style={{ paddingHorizontal: 24, minHeight: 44, flexDirection: "row",
            alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            {screenName
              ? <Text accessibilityRole="header" style={styles.screenName}>{screenName}</Text>
              : <Text accessibilityRole="header" style={styles.parent}>{parent}</Text>}
            <AppPressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={4}
              onPress={leave} style={styles.back}>
              <Ionicons name="arrow-back" size={24} color={colors.primary} />
            </AppPressable>
          </View>
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 80, gap: 24 }}>
            {(title || explanation) && <View style={{ gap: 12 }}>
              {title ? <Text accessibilityRole="header" style={styles.title}>{title}</Text> : null}
              {explanation ? <Text style={styles.explanation}>{explanation}</Text> : null}
            </View>}
            {children}
            {note ? <Text style={styles.caption}>{note}</Text> : null}
          </ScrollView>
        </Animated.View>
        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 20 }}>
          <SvgXml xml={homeArtwork.wave} width="100%" height={20} />
        </View>
        <FloatingDog right={47} bottom={-12} />
      </Animated.View>
    </View>
  );
}
