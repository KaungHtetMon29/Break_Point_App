import { StatusBar } from "expo-status-bar";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography, spacing, commonStyles } from "../theme";
import { useGoogleAuth } from "../hooks/useGoogleAuth";
import { ProfileScreenNavigationProp } from "../types/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import PreferencesModal from "../components/PreferencesModal";
import {
  getUserData,
  getUserPreferencesFromStorage,
  setUserPreferences,
  getBreakpointPrefUuidFromStorage,
  setBreakpointPrefUuid,
  JWTPayload,
  StoredPreferences,
  getUserSubscriptionFromStorage,
  StoredSubscription,
  breakpointsService,
  userService,
  setBreakpointData,
  setBreakpointGenerateData,
} from "../services";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BREAKPOINT_PREF_UUID_KEY = "breakpoint_pref_uuid";

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

type ProfileScreenProps = {
  navigation: ProfileScreenNavigationProp;
};

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { signOut, user } = useGoogleAuth();
  const [jwtUser, setJwtUser] = useState<JWTPayload | null>(null);
  const [prefs, setPrefs] = useState<StoredPreferences | null>(null);
  const [prefData, setPrefData] = useState<PreferenceData | null>(null);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [subscription, setSubscription] = useState<StoredSubscription | null>(null);
  const [breakpointPrefUuid, setBreakpointPrefUuidState] = useState<string | null>(
    null
  );
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate("Home");
  };

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const ud = await getUserData();
          const sp = await getUserPreferencesFromStorage();
          const sub = await getUserSubscriptionFromStorage();
          if (!active) return;
          setJwtUser(ud);
          setPrefs(sp);
          setSubscription(sub);
          if (ud?.uuid) {
            try {
              const storedPrefUuid = await getBreakpointPrefUuidFromStorage();
              if (storedPrefUuid && active) {
                setBreakpointPrefUuidState(storedPrefUuid);
              }
            } catch {
            }
            try {
              const latestPrefs = await userService.getUserPreferences(ud.uuid);
              if (!active) return;
              const prefVal = latestPrefs?.preference;
              if (prefVal && prefVal.trim() !== "") {
                const updatedPrefs = {
                  preference: prefVal,
                  uuid: latestPrefs?.uuid ?? sp?.uuid ?? null,
                };
                await setUserPreferences(updatedPrefs);
                setPrefs(updatedPrefs);
              } else {
                await setUserPreferences(null);
                setPrefs(null);
              }
            } catch {
            }

            try {
              const techniques = await breakpointsService.getTechniques(ud.uuid);
              if (!active) return;
              const currentPrefUuid = prefs?.uuid ?? sp?.uuid ?? null;
              const matched = techniques.find(
                (tech) => tech.pref_uuid && tech.pref_uuid === currentPrefUuid
              );
              const prefUuid = matched?.pref_uuid || techniques[0]?.pref_uuid || null;
              if (prefUuid) {
                setBreakpointPrefUuidState(prefUuid);
                await setBreakpointPrefUuid(prefUuid);
              }
              const breakpointData = matched || techniques[0] || null;
              if (breakpointData) {
                await setBreakpointData({
                  uuid: breakpointData.uuid,
                  pref_uuid: breakpointData.pref_uuid ?? null,
                  is_active: breakpointData.is_active,
                  techniques: breakpointData.techniques,
                });
              }
            } catch {
              if (!active) return;
            }
          } else {
            setBreakpointPrefUuidState(null);
          }
        } catch {
          if (!active) return;
          setJwtUser(null);
          setPrefs(null);
          setSubscription(null);
          setBreakpointPrefUuidState(null);
        }
      })();

      return () => {
        active = false;
      };
    }, [])
  );

  const displayName = useMemo(
    () => user?.name ?? jwtUser?.name ?? "Unknown",
    [user?.name, jwtUser?.name]
  );
  const displayEmail = useMemo(
    () => user?.email ?? jwtUser?.email ?? "",
    [user?.email, jwtUser?.email]
  );
  const hasPrefs = !!prefData;
  const mapBreakMethodName = (id?: string) => {
    const v = (id || "").toLowerCase();
    if (v === "promodoro") return "Pomodoro Technique";
    if (v === "52-17") return "52-17 Method";
    if (v === "90-mins") return "90-Minute Work Blocks";
    return "";
  };
  const isPremium = useMemo(
    () => (subscription?.tier || "").toLowerCase() === "premium",
    [subscription?.tier]
  );
  const isGenerateEnabled = useMemo(() => {
    const prefUuid = prefs?.uuid ?? null;
    const bpUuid = breakpointPrefUuid ?? null;
    if (!prefUuid) return false;
    if (!bpUuid) return true;
    return prefUuid !== bpUuid;
  }, [prefs?.uuid, breakpointPrefUuid]);

  useEffect(() => {
    if (prefs?.preference) {
      try {
        const parsed = JSON.parse(prefs.preference) as PreferenceData;
        setPrefData(parsed);
      } catch {
        setPrefData(null);
      }
    } else {
      setPrefData(null);
    }
  }, [prefs]);

  async function handleSignOut() {
    await signOut();
    await AsyncStorage.multiRemove([
      "user_preferences",
      "user_data",
      "auth_token",
      BREAKPOINT_PREF_UUID_KEY,
    ]);
    navigation.getParent()?.navigate("Login");
  }

  const handleGenerate = async () => {
    if (!jwtUser?.uuid || !isGenerateEnabled || isGenerating) return;
    setIsGenerating(true);
    try {
      const generated = await breakpointsService.generate(jwtUser.uuid);
      await setBreakpointGenerateData(generated || null);
      const prefUuid = generated?.pref_uuid || prefs?.uuid || null;
      setBreakpointPrefUuidState(prefUuid);
      await setBreakpointPrefUuid(prefUuid);
      const techniques = await breakpointsService.getTechniques(jwtUser.uuid);
      const matched = techniques.find(
        (tech) => tech.pref_uuid && tech.pref_uuid === prefUuid
      );
      const breakpointData = matched || techniques[0] || null;
      if (breakpointData) {
        await setBreakpointData({
          uuid: breakpointData.uuid,
          pref_uuid: breakpointData.pref_uuid ?? null,
          is_active: breakpointData.is_active,
          techniques: breakpointData.techniques,
        });
      }
    } catch {
    } finally {
      setIsGenerating(false);
    }
  };


  const handlePreferenceHistory = () => {
    navigation.getParent()?.navigate("PreferenceHistory");
  };
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={handleGoBack}>
          <Ionicons
            name="chevron-back"
            size={24}
            color={colors.textPrimary}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            {user?.picture ? (
              <Image source={{ uri: user.picture }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={60} color={colors.textMuted} />
            )}
          </View>
        </View>

        {/* Name */}
        <View style={styles.nameSection}>
          <Text style={styles.userName}>{displayName}</Text>
          <TouchableOpacity style={styles.editButton}>
            <Ionicons name="create-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.tierBadgeRow}>
          <View
            style={[
              styles.tierBadge,
              isPremium
                ? styles.tierBadgePremium
                : styles.tierBadgeFree,
            ]}
          >
            <Text
              style={[
                styles.tierBadgeText,
                isPremium
                  ? styles.tierBadgeTextPremium
                  : styles.tierBadgeTextFree,
              ]}
            >
              {isPremium ? "Premium" : "Free Tier"}
            </Text>
          </View>
        </View>

        {/* Email */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Email</Text>
          <Text style={styles.sectionValue}>{displayEmail}</Text>
          <View style={styles.divider} />
        </View>

        {/* Personal Preferences */}
        <View style={styles.section}>
          <View style={styles.preferencesHeaderRow}>
            <Text style={styles.sectionTitle}>Personal Preferences</Text>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setShowPreferencesModal(true)}
            >
              <Ionicons name="create-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
          {!hasPrefs ? (
            <View style={styles.centerNotice}>
              <Text style={commonStyles.bodyTextSecondary}>
                No preferences yet
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.preferencesRow}>
                <View style={styles.preferenceItem}>
                  <Text style={styles.preferenceLabel}>Age Range</Text>
                  <Text style={styles.preferenceValue}>{prefData?.age}</Text>
                </View>
                <View style={styles.preferenceItem}>
                  <Text style={styles.preferenceLabel}>Weight</Text>
                  <Text style={styles.preferenceValue}>{prefData?.weight}</Text>
                </View>
                <View style={styles.preferenceItem}>
                  <Text style={styles.preferenceLabel}>Height</Text>
                  <Text style={styles.preferenceValue}>{prefData?.height}</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Career Type</Text>
                <Text style={styles.sectionValue}>
                  {prefData?.career_type}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Work Hours</Text>
                <View style={styles.workHoursRow}>
                  <View style={styles.workHoursItem}>
                    <Text style={styles.workHoursLabel}>Clock-In Time</Text>
                    <Text style={styles.workHoursValue}>
                      {prefData?.working_hour["clock-in_time"]}
                    </Text>
                  </View>
                  <View style={styles.workHoursItem}>
                    <Text style={styles.workHoursLabel}>Clock-Out Time</Text>
                    <Text style={styles.workHoursValue}>
                      {prefData?.working_hour["clock-out_time"]}
                    </Text>
                  </View>
                </View>
                <View style={styles.breakDurationSection}>
                  <Text style={styles.breakDurationLabel}>Break Duration</Text>
                  <Text style={styles.breakDurationValue}>
                    {prefData?.working_hour["break_time"]}
                  </Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Health Conditions</Text>
                <Text style={styles.healthConditionsText}>
                  {prefData?.health_condition}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Selected Break Method</Text>
                <Text style={styles.sectionValue}>
                  {mapBreakMethodName(prefData?.break_method)}
                </Text>
              </View>
            </>
          )}
        </View>
        <TouchableOpacity
          style={styles.historyButton}
          onPress={handlePreferenceHistory}
        >
          <View style={styles.historyIcon}>
            <Ionicons name="time-outline" size={20} color={colors.primary} />
          </View>
          <Text style={styles.historyText}>Preference History</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>
        {hasPrefs && (
          <View style={styles.generateSection}>
            <Text style={styles.generateText}>
              You Have Updated The Preference{"\n"}Regenerate The Alarm Schedules
            </Text>
            <TouchableOpacity
              style={[
                styles.generateButton,
                (!isGenerateEnabled || isGenerating) &&
                  styles.generateButtonDisabled,
              ]}
              onPress={handleGenerate}
              disabled={!isGenerateEnabled || isGenerating}
            >
              <Text style={styles.generateButtonText}>
                {isGenerating ? "Generating..." : "Generate"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      <PreferencesModal
        visible={showPreferencesModal}
        initialData={prefData}
        allowClose
        onClose={() => setShowPreferencesModal(false)}
        onComplete={async (updated) => {
          if (updated) {
            setPrefs(updated);
          }
          if (jwtUser?.uuid) {
            try {
              const latestPrefs = await userService.getUserPreferences(
                jwtUser.uuid
              );
              const prefVal = latestPrefs?.preference;
              if (prefVal && prefVal.trim() !== "") {
                const refreshedPrefs = {
                  preference: prefVal,
                  uuid: latestPrefs?.uuid ?? null,
                };
                await setUserPreferences(refreshedPrefs);
                setPrefs(refreshedPrefs);
              } else {
                await setUserPreferences(null);
                setPrefs(null);
              }
            } catch {
              const sp = await getUserPreferencesFromStorage();
              setPrefs(sp);
            }
          } else {
            const sp = await getUserPreferencesFromStorage();
            setPrefs(sp);
          }
          setShowPreferencesModal(false);
        }}
      />
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
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing["3xl"],
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: spacing.base,
  },
  avatar: {
    ...commonStyles.avatarLarge,
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  nameSection: {
    ...commonStyles.flexRow,
    justifyContent: "center",
    marginBottom: spacing.base,
    gap: spacing.sm,
  },
  userName: {
    fontSize: typography.fontSize["3xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  editButton: {
    padding: spacing.xs,
  },
  preferencesHeaderRow: {
    ...commonStyles.flexRowBetween,
    alignItems: "center",
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...commonStyles.title,
    marginBottom: spacing.sm,
  },
  sectionValue: {
    ...commonStyles.bodyText,
  },
  divider: {
    ...commonStyles.divider,
    marginTop: spacing.base,
  },
  preferencesRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    gap: spacing["3xl"],
  },
  preferenceItem: {
    minWidth: 70,
  },
  preferenceLabel: {
    ...commonStyles.label,
    marginBottom: spacing.xs,
  },
  preferenceValue: {
    ...commonStyles.bodyText,
  },
  workHoursRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    gap: 60,
    marginBottom: spacing.base,
  },
  workHoursItem: {},
  workHoursLabel: {
    ...commonStyles.label,
    marginBottom: spacing.xs,
  },
  workHoursValue: {
    ...commonStyles.bodyText,
  },
  breakDurationSection: {
    marginBottom: spacing.sm,
  },
  breakDurationLabel: {
    ...commonStyles.label,
    marginBottom: spacing.xs,
  },
  breakDurationValue: {
    ...commonStyles.bodyText,
  },
  healthConditionsText: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  centerNotice: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.base,
  },
  generateSection: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  generateText: {
    textAlign: "center",
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.base,
  },
  historyButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.backgroundLighter,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  historyIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.backgroundLighter,
    alignItems: "center",
    justifyContent: "center",
  },
  historyText: {
    flex: 1,
    fontSize: typography.fontSize.md,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.semibold,
  },
  generateButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing["3xl"],
    borderRadius: 24,
  },
  generateButtonDisabled: {
    opacity: 0.5,
  },
  generateButtonText: {
    color: "#fff",
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  tierBadgeRow: {
    alignItems: "center",
    marginBottom: spacing.base,
  },
  tierBadge: {
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  tierBadgePremium: {
    backgroundColor: colors.primary,
  },
  tierBadgeFree: {
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: "transparent",
  },
  tierBadgeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  tierBadgeTextPremium: {
    color: "#fff",
  },
  tierBadgeTextFree: {
    color: colors.primary,
  },
});
