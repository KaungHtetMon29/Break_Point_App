import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colors, commonStyles, spacing, typography } from "../theme";
import {
  getUserData,
  PreferenceHistoryItem,
  setBreakpointData,
  setBreakpointPrefUuid,
  setUserPreferences,
  userService,
} from "../services";
import { PreferenceHistoryScreenNavigationProp } from "../types/navigation";

interface PreferenceData {
  age: string;
  weight: string;
  height: string;
  career_type: string;
  working_hour: {
    "clock-in_time": string;
    "clock-out_time": string;
    "break_time": string;
  };
  health_condition: string;
  break_method: string;
}

type PreferenceHistoryScreenProps = {
  navigation: PreferenceHistoryScreenNavigationProp;
};

export default function PreferenceHistoryScreen({
  navigation,
}: PreferenceHistoryScreenProps) {
  const [items, setItems] = useState<PreferenceHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        setIsLoading(true);
        setError(null);
        try {
          const user = await getUserData();
          if (!user?.uuid) {
            if (!active) return;
            setItems([]);
            return;
          }
          const history = await userService.getPreferenceHistory(user.uuid);
          if (!active) return;
          setItems(Array.isArray(history) ? history : []);
        } catch {
          if (!active) return;
          setError("Failed to load preference history");
          setItems([]);
        } finally {
          if (active) {
            setIsLoading(false);
          }
        }
      })();
      return () => {
        active = false;
      };
    }, [])
  );

  const ordered = useMemo(() => items.slice().reverse(), [items]);

  const mapBreakMethodName = (id?: string) => {
    const v = (id || "").toLowerCase();
    if (v === "promodoro") return "Pomodoro Technique";
    if (v === "52-17") return "52-17 Method";
    if (v === "90-mins") return "90-Minute Work Blocks";
    return id || "";
  };

  const handleReusePreference = async (preferenceUuid?: string) => {
    if (!preferenceUuid) return;
    setError(null);
    try {
      const response = await userService.chooseUserPreference(preferenceUuid);
      const pref = response?.preference;
      if (pref?.preference) {
        await setUserPreferences({
          preference: pref.preference,
          uuid: pref.uuid ?? null,
        });
        await setBreakpointPrefUuid(pref.uuid ?? null);
      } else {
        await setUserPreferences(null);
        await setBreakpointPrefUuid(null);
      }
      if (response?.breakpoint) {
        await setBreakpointData(response.breakpoint);
      } else {
        await setBreakpointData(null);
      }
      navigation.goBack();
    } catch {
      setError("Failed to reuse preference");
    }
  };

  const confirmReusePreference = (preferenceUuid?: string) => {
    if (!preferenceUuid) return;
    Alert.alert(
      "Reuse preference",
      "Do you want to reuse this preference?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reuse",
          onPress: () => {
            handleReusePreference(preferenceUuid);
          },
        },
      ]
    );
  };

  const parsePreference = (raw: string) => {
    try {
      return JSON.parse(raw) as PreferenceData;
    } catch {
      return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={navigation.goBack}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Preference History</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.centerNotice}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.centerNotice}>
            <Text style={commonStyles.bodyTextSecondary}>{error}</Text>
          </View>
        ) : ordered.length === 0 ? (
          <View style={styles.centerNotice}>
            <Text style={commonStyles.bodyTextSecondary}>
              No preference history yet
            </Text>
          </View>
        ) : (
          ordered.map((item, index) => {
            const parsed = parsePreference(item.preference);
            const title = `Preference #${index + 1}`;
            if (!parsed) {
              return (
                <TouchableOpacity
                  key={item.uuid}
                  onPress={() => confirmReusePreference(item.uuid)}
                >
                  <View
                    style={[
                      styles.card,
                      item.is_active && styles.cardActive,
                    ]}
                  >
                    <Text style={styles.cardTitle}>{title}</Text>
                    <Text style={styles.cardSubtitle}>Raw Preference</Text>
                    <Text style={styles.rawText}>{item.preference}</Text>
                  </View>
                </TouchableOpacity>
              );
            }
            const workHours = `${parsed.working_hour?.["clock-in_time"] || "-"} - ${
              parsed.working_hour?.["clock-out_time"] || "-"
            }`;
            return (
              <TouchableOpacity
                key={item.uuid}
                onPress={() => confirmReusePreference(item.uuid)}
              >
                <View
                  style={[styles.card, item.is_active && styles.cardActive]}
                >
                  <Text style={styles.cardTitle}>{title}</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Career</Text>
                    <Text style={styles.detailValue}>{parsed.career_type}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Age</Text>
                    <Text style={styles.detailValue}>{parsed.age}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Weight</Text>
                    <Text style={styles.detailValue}>{parsed.weight}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Height</Text>
                    <Text style={styles.detailValue}>{parsed.height}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Work Hours</Text>
                    <Text style={styles.detailValue}>{workHours}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Break Time</Text>
                    <Text style={styles.detailValue}>
                      {parsed.working_hour?.["break_time"] || "-"}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Break Method</Text>
                    <Text style={styles.detailValue}>
                      {mapBreakMethodName(parsed.break_method)}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Health</Text>
                    <Text style={styles.detailValue}>
                      {parsed.health_condition || "-"}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    ...commonStyles.screenContainer,
  },
  header: {
    ...commonStyles.flexRowBetween,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  headerButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: 24,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing["3xl"],
  },
  centerNotice: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing["2xl"],
  },
  card: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: colors.backgroundLighter,
  },
  cardActive: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  cardTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  cardSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  rawText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  detailLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
  },
  detailValue: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    maxWidth: "70%",
    textAlign: "right",
  },
});
