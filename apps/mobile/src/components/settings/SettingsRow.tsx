import { Children, Fragment, type ReactNode } from "react";
import { Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppPressable } from "../AppPressable";
import { settingsColors as colors, settingsStyles as styles } from "./theme";

function ProBadge() {
  return (
    <View style={{ backgroundColor: colors.selected, borderRadius: 999, paddingHorizontal: 5, paddingVertical: 2 }}>
      <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 10, lineHeight: 12, color: colors.primary }}>PRO</Text>
    </View>
  );
}

interface RowProps {
  label: string;
  description?: string;
  pro?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  /** Navigation row. */
  onPress?: () => void;
  /** Switch row — pass both. */
  value?: boolean;
  onValueChange?: (next: boolean) => void;
}

/**
 * One row of a settings group: navigation rows open a detail screen, switch
 * rows flip a setting in place. Compact (no description) rows stay 52px tall.
 */
export function SettingsRow({ label, description, pro, destructive, disabled, onPress, value, onValueChange }: RowProps) {
  const isSwitch = onValueChange !== undefined;
  const body = (
    <View style={{ minHeight: description ? 64 : 52, paddingHorizontal: 16, paddingVertical: 8,
      flexDirection: "row", alignItems: "center", gap: 12, opacity: disabled ? 0.5 : 1 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 16, lineHeight: 22,
            color: destructive ? colors.danger : colors.ink }}>{label}</Text>
          {pro && <ProBadge />}
        </View>
        {description ? <Text style={styles.caption}>{description}</Text> : null}
      </View>
      {isSwitch
        ? <Switch value={value} onValueChange={onValueChange} disabled={disabled}
            trackColor={{ false: colors.border, true: colors.primary }}
            ios_backgroundColor={colors.border} thumbColor={colors.white} />
        : onPress && <Ionicons name="chevron-forward" size={20} color={colors.body} />}
    </View>
  );

  if (!onPress || isSwitch) return body;
  return (
    <AppPressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress}>
      {body}
    </AppPressable>
  );
}

/** White card grouping rows, with a hairline between each pair. */
export function SettingsGroup({ children }: { children: ReactNode }) {
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.group}>
      {rows.map((row, i) => (
        <Fragment key={i}>
          {i > 0 && <View style={styles.divider} />}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

/** Labelled group of rows on the root settings screen. */
export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <SettingsGroup>{children}</SettingsGroup>
    </View>
  );
}
