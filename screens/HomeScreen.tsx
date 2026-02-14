import { StatusBar } from "expo-status-bar";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Switch,
  Modal,
  TouchableOpacity,
  Platform,
  NativeModules,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useFocusEffect } from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import PreferencesModal from "../components/PreferencesModal";
import SubscriptionModal from "../components/SubscriptionModal";
import {
  getUserData,
  JWTPayload,
  getUserSubscriptionFromStorage,
  getUserPreferencesFromStorage,
  setUserPreferences,
  setUserSubscription,
  userService,
  plansService,
  breakpointsService,
  AlarmPatterns,
  BreakpointTechnique,
} from "../services";

interface AlarmItem {
  id: string;
  time: string;
  label: string;
  enabled: boolean;
}

const fallbackTimes = ["9:00 AM", "11:00 AM", "1:00 PM", "3:00 PM", "5:00 PM"];

const NOTIFICATION_MAP_KEY = "alarm_notification_map";
const GLOBAL_ALARM_OFF_KEY = "global_alarm_off_until";
const { AlarmScheduler } = NativeModules as {
  AlarmScheduler?: {
    scheduleDailyAlarm: (
      hour: number,
      minute: number,
      id: number,
      label: string,
      timeText: string
    ) => void;
    cancelAlarm: (id: number) => void;
    canScheduleExactAlarms: () => Promise<boolean>;
    requestExactAlarmPermission: () => void;
  };
};

export default function HomeScreen() {
  const [alarms, setAlarms] = useState<AlarmItem[]>([]);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [userData, setUserData] = useState<JWTPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notificationsReady, setNotificationsReady] = useState(false);
  const [globalOffUntil, setGlobalOffUntil] = useState<string | null>(null);
  const [showGlobalOffPicker, setShowGlobalOffPicker] = useState(false);
  const [offDaysCount, setOffDaysCount] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const alarmsRef = useRef<AlarmItem[]>([]);
  const notificationMapRef = useRef<Record<string, string>>({});
  const visibleAlarms = useMemo(() => {
    const seen = new Set<string>();
    return alarms.filter((alarm) => {
      const key = `${alarm.time}|${alarm.label}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [alarms]);
  const useNativeAlarm =
    Platform.OS === "android" &&
    typeof AlarmScheduler?.scheduleDailyAlarm === "function";

  const toDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getLocalDateKey = () => toDateKey(new Date());

  const isGlobalOffToday = Boolean(
    globalOffUntil && getLocalDateKey() <= globalOffUntil
  );
  const firstName = useMemo(() => {
    const fullName = (userData?.name || "").trim();
    if (!fullName) return "there";
    return fullName.split(/\s+/)[0];
  }, [userData?.name]);

  const addDays = (date: Date, days: number) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  };

  const getAlarmRequestId = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i += 1) {
      hash = (hash * 31 + id.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  };

  const shouldShowExpiryModal = (expireDate?: string, tier?: string) => {
    const normalizedTier = (tier || "").toLowerCase();
    if (normalizedTier !== "premium") return false;
    if (!expireDate) return false;
    const exp = new Date(expireDate);
    const expMs = exp.getTime();
    if (Number.isNaN(expMs)) return false;
    const nowMs = Date.now();
    const diffMs = expMs - nowMs;
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    if (diffMs <= weekMs && diffMs >= 0) return true;
    const expDay = new Date(expMs).toDateString();
    const nowDay = new Date(nowMs).toDateString();
    return expDay === nowDay;
  };

  const parseAlarmTime = (
    time: string
  ): { hour: number; minute: number } | null => {
    const amPmMatch = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (amPmMatch) {
      const hour = Number(amPmMatch[1]);
      const minute = Number(amPmMatch[2]);
      if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
      const meridiem = amPmMatch[3].toUpperCase();
      let hours24 = hour % 12;
      if (meridiem === "PM") hours24 += 12;
      return { hour: hours24, minute };
    }
    const twentyFourMatch = time.match(/^(\d{1,2}):(\d{2})$/);
    if (!twentyFourMatch) return null;
    const hour = Number(twentyFourMatch[1]);
    const minute = Number(twentyFourMatch[2]);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return { hour, minute };
  };

  const loadGlobalOffUntil = async () => {
    const stored = await AsyncStorage.getItem(GLOBAL_ALARM_OFF_KEY);
    const today = getLocalDateKey();
    if (stored && stored >= today) {
      setGlobalOffUntil(stored);
      return;
    }
    if (stored) {
      await AsyncStorage.removeItem(GLOBAL_ALARM_OFF_KEY);
    }
    setGlobalOffUntil(null);
  };

  const setGlobalOffUntilDate = async (untilDate: Date | null) => {
    if (!untilDate) {
      await AsyncStorage.removeItem(GLOBAL_ALARM_OFF_KEY);
      setGlobalOffUntil(null);
      await syncNotifications();
      return;
    }
    const untilKey = toDateKey(untilDate);
    await AsyncStorage.setItem(GLOBAL_ALARM_OFF_KEY, untilKey);
    setGlobalOffUntil(untilKey);
    await cancelAllScheduled();
  };

  const loadNotificationMap = async () => {
    if (useNativeAlarm) return;
    const raw = await AsyncStorage.getItem(NOTIFICATION_MAP_KEY);
    if (!raw) {
      notificationMapRef.current = {};
      return;
    }
    try {
      const parsed = JSON.parse(raw) as Record<string, string>;
      notificationMapRef.current = parsed || {};
    } catch {
      notificationMapRef.current = {};
    }
  };

  const saveNotificationMap = async () => {
    if (useNativeAlarm) return;
    await AsyncStorage.setItem(
      NOTIFICATION_MAP_KEY,
      JSON.stringify(notificationMapRef.current)
    );
  };

  const cancelAllScheduled = async () => {
    if (useNativeAlarm) {
      for (const alarm of alarmsRef.current) {
        AlarmScheduler?.cancelAlarm(getAlarmRequestId(alarm.id));
      }
      return;
    }
    const ids = Object.values(notificationMapRef.current);
    for (const id of ids) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
    notificationMapRef.current = {};
    await saveNotificationMap();
  };

  const cancelAlarm = async (id: string) => {
    if (useNativeAlarm) {
      AlarmScheduler?.cancelAlarm(getAlarmRequestId(id));
      return;
    }
    const existing = notificationMapRef.current[id];
    if (existing) {
      await Notifications.cancelScheduledNotificationAsync(existing);
      delete notificationMapRef.current[id];
      await saveNotificationMap();
    }
  };

  const scheduleAlarm = async (alarm: AlarmItem) => {
    if (useNativeAlarm) {
      const trigger = parseAlarmTime(alarm.time);
      if (!trigger) return;
      AlarmScheduler?.scheduleDailyAlarm(
        trigger.hour,
        trigger.minute,
        getAlarmRequestId(alarm.id),
        alarm.label,
        alarm.time
      );
      return;
    }
    await cancelAlarm(alarm.id);
    const trigger = parseAlarmTime(alarm.time);
    if (!trigger) return;
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Alarm",
        body: `${alarm.label} • ${alarm.time}`,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour: trigger.hour,
        minute: trigger.minute,
        repeats: true,
      },
    });
    notificationMapRef.current[alarm.id] = notificationId;
    await saveNotificationMap();
  };

  useEffect(() => {
    alarmsRef.current = visibleAlarms;
  }, [visibleAlarms]);

  useEffect(() => {
    let active = true;
    if (useNativeAlarm) {
      (async () => {
        await loadGlobalOffUntil();
        const canSchedule = await AlarmScheduler?.canScheduleExactAlarms();
        if (!active) return;
        if (!canSchedule) {
          AlarmScheduler?.requestExactAlarmPermission();
          setNotificationsReady(false);
          return;
        }
        setNotificationsReady(true);
      })();
      return () => {
        active = false;
      };
    }
    (async () => {
      const permission = await Notifications.requestPermissionsAsync();
      if (!permission.granted) return;
      await loadGlobalOffUntil();
      await loadNotificationMap();
      if (!active) return;
      setNotificationsReady(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  const syncNotifications = useCallback(async () => {
    await cancelAllScheduled();
    if (isGlobalOffToday) return;
    for (const alarm of alarmsRef.current) {
      if (alarm.enabled) {
        await scheduleAlarm(alarm);
      }
    }
  }, [isGlobalOffToday]);

  useEffect(() => {
    if (!notificationsReady) return;
    let active = true;
    (async () => {
      if (!active) return;
      await syncNotifications();
    })();
    return () => {
      active = false;
    };
  }, [notificationsReady, alarms, syncNotifications]);

  const mapAlarmPatternsToAlarms = (
    patterns?: AlarmPatterns[],
    idPrefix = "alarm"
  ): AlarmItem[] | null => {
    if (!Array.isArray(patterns)) return null;
    const mapped: AlarmItem[] = [];
    patterns.forEach((pattern, index) => {
      const stop = pattern?.stop_time;
      if (stop?.alarm_time) {
        mapped.push({
          id: `${idPrefix}-stop-${index + 1}`,
          time: stop.alarm_time,
          label: stop.label || "Break",
          enabled: true,
        });
        return;
      }
      const start = pattern?.start_time;
      if (start?.alarm_time) {
        mapped.push({
          id: `${idPrefix}-start-${index + 1}`,
          time: start.alarm_time,
          label: start.label || "Start",
          enabled: true,
        });
      }
    });
    return mapped.length ? mapped : null;
  };

  const mapTechniquesToAlarms = (
    techniques?: BreakpointTechnique[]
  ): AlarmItem[] | null => {
    if (!Array.isArray(techniques) || techniques.length === 0) return null;
    const parsedAlarms: AlarmItem[] = [];
    for (const [techIndex, tech] of techniques.entries()) {
      const raw = (tech.techniques || "").trim();
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw) as {
          alarm_patterns?: AlarmPatterns[];
        };
        const patterns = Array.isArray(parsed)
          ? (parsed as unknown as AlarmPatterns[])
          : parsed?.alarm_patterns;
        const prefix = tech.uuid || `tech-${techIndex + 1}`;
        const mapped = mapAlarmPatternsToAlarms(patterns, prefix);
        if (mapped) {
          parsedAlarms.push(...mapped);
          continue;
        }
      } catch {
      }
      const timeMatch = raw.match(
        /(\d{1,2}:\d{2}\s*(AM|PM)?|\b\d{1,2}:\d{2}\b)/i
      );
      parsedAlarms.push({
        id: tech.uuid || `tech-${techIndex + 1}-${parsedAlarms.length + 1}`,
        time: timeMatch?.[0] || fallbackTimes[parsedAlarms.length % fallbackTimes.length],
        label: raw,
        enabled: tech.is_active ?? true,
      });
    }
    if (parsedAlarms.length === 0) return null;
    return parsedAlarms;
  };

  useFocusEffect(
    useCallback(() => {
      return undefined;
    }, [])
  );

  // Runs every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const checkModals = async () => {
        setIsLoading(true);
        await loadGlobalOffUntil();
        console.log("Screen focused - gating using googleAuth-stored subscription and preference");

        try {
          // Step 1: Load user data from AsyncStorage
          const data = await getUserData();
          if (!isActive) return;

          setUserData(data);
          console.log("User data loaded:", data?.uuid);

          if (data?.uuid) {
            try {
              const [preferences, currentPlan] = await Promise.all([
                userService.getUserPreferences(data.uuid),
                plansService.getCurrentPlan(data.uuid),
              ]);
              if (!isActive) return;

              const prefVal = preferences?.preference;
              if (prefVal && prefVal.trim() !== "") {
                await setUserPreferences({
                  preference: prefVal,
                  uuid: preferences?.uuid ?? null,
                });
              } else {
                await setUserPreferences(null);
              }

              const planType = (currentPlan?.plan_type || "").trim();
              if (planType) {
                const normalized = planType.toLowerCase();
                await setUserSubscription({
                  is_active: normalized === "premium",
                  tier: planType,
                  expire_date: currentPlan?.end_date || "",
                });
              } else {
                await setUserSubscription(null);
              }
            } catch (refreshError) {
              console.log("Failed to refresh plan or preferences:", refreshError);
            }
          }

          if (data?.uuid) {
            let applied = false;
            try {
              const techniques = await breakpointsService.getTechniques(
                data.uuid
              );
              if (!isActive) return;
              const mappedTechniques = mapTechniquesToAlarms(techniques);
              if (mappedTechniques) {
                setAlarms(mappedTechniques);
                applied = true;
              }
            } catch (techniquesError) {
              console.log("Failed to load techniques:", techniquesError);
            }

            if (!applied) {
              try {
                const generated = await breakpointsService.generate(data.uuid);
                if (!isActive) return;
                const mapped = mapAlarmPatternsToAlarms(
                  generated?.alarm_patterns
                );
                if (mapped) {
                  setAlarms(mapped);
                }
              } catch (generateError) {
                console.log("Failed to generate alarm schedule:", generateError);
              }
            }
          }

          // Plan gating first from stored subscription
          const storedSub = await getUserSubscriptionFromStorage();
          const isNilSubscription = storedSub === null;
          const needsSubscription =
            isNilSubscription ||
            !storedSub ||
            !(storedSub.tier || "").trim() ||
            shouldShowExpiryModal(storedSub.expire_date, storedSub.tier);
          setShowSubscriptionModal(needsSubscription);

          // Preference gating second from stored preference
          const storedPrefs = await getUserPreferencesFromStorage();
          const needsPreferences =
            !storedPrefs?.preference ||
            storedPrefs.preference.trim() === "";
          setShowPreferencesModal(needsSubscription ? false : needsPreferences);
        } catch (error) {
          if (!isActive) return;
          console.error("Error checking modals:", error);
          // On error, default to plan first then preference
          setShowSubscriptionModal(true);
          setShowPreferencesModal(false);
        } finally {
          if (isActive) {
            setIsLoading(false);
          }
        }
      };

      checkModals();

      // Cleanup function - runs when screen loses focus
      return () => {
        isActive = false;
      };
    }, [])
  );

  const handlePreferencesComplete = () => {
    setShowPreferencesModal(false);
  };
  const handleSubscriptionComplete = async () => {
    setShowSubscriptionModal(false);
    const storedPrefs = await getUserPreferencesFromStorage();
    const needsPreferences =
      !storedPrefs?.preference || storedPrefs.preference.trim() === "";
    setShowPreferencesModal(needsPreferences);
  };

  const toggleAlarm = (id: string) => {
    const current = alarmsRef.current.find((alarm) => alarm.id === id);
    if (!current) return;
    const nextEnabled = !current.enabled;
    setAlarms((prevAlarms) =>
      prevAlarms.map((alarm) =>
        alarm.id === id ? { ...alarm, enabled: nextEnabled } : alarm
      )
    );
  };

  const openGlobalOffPicker = () => {
    setOffDaysCount(1);
    setShowGlobalOffPicker(true);
  };

  const handleGlobalOffCancel = () => {
    setShowGlobalOffPicker(false);
  };

  const handleGlobalOffConfirm = async () => {
    await setGlobalOffUntilDate(addDays(new Date(), offDaysCount));
    setShowGlobalOffPicker(false);
  };

  const toggleGlobalAlarms = async () => {
    if (isGlobalOffToday) {
      await setGlobalOffUntilDate(null);
      return;
    }
    openGlobalOffPicker();
  };

  const handleGenerateAlarms = async () => {
    if (!userData?.uuid || isGenerating) return;
    setIsGenerating(true);
    try {
      const generated = await breakpointsService.generate(userData.uuid);
      const mapped = mapAlarmPatternsToAlarms(
        generated?.alarm_patterns,
        userData.uuid
      );
      if (mapped) {
        setAlarms(mapped);
      }
    } catch (error) {
      console.log("Failed to generate alarm schedule:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar style="light" />

        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.greeting}>{`Hi, ${firstName}`}</Text>
            <Text style={styles.subtitle}>Here is your break time alarms.</Text>
          </View>
          <View style={styles.globalSwitchWrapper}>
            <Switch
              value={!isGlobalOffToday}
              onValueChange={toggleGlobalAlarms}
              trackColor={{ false: "#3a3a3a", true: "#f58220" }}
              thumbColor={!isGlobalOffToday ? "#fff" : "#888"}
              ios_backgroundColor="#3a3a3a"
            />
          </View>
        </View>

        {visibleAlarms.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Generate Alarms</Text>
              <Text style={styles.emptySubtitle}>No Alarms Generated Yet</Text>
              <TouchableOpacity
                style={[
                  styles.emptyButton,
                  isGenerating && styles.emptyButtonDisabled,
                ]}
                onPress={handleGenerateAlarms}
                disabled={isGenerating || !userData?.uuid}
              >
                <Text style={styles.emptyButtonText}>
                  {isGenerating ? "Generating..." : "Generate"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <ScrollView
            style={styles.alarmList}
            contentContainerStyle={styles.alarmListContent}
            showsVerticalScrollIndicator={false}
          >
            {visibleAlarms.map((alarm) => (
              <View key={alarm.id} style={styles.alarmItem}>
                <View style={styles.alarmInfo}>
                  <Text style={styles.alarmTime}>{alarm.time}</Text>
                  <Text style={styles.alarmLabel}>{alarm.label}</Text>
                </View>
                <View style={styles.alarmSwitchWrapper}>
                  <Switch
                    value={alarm.enabled && !isGlobalOffToday}
                    onValueChange={() => toggleAlarm(alarm.id)}
                    disabled={isGlobalOffToday}
                    trackColor={{ false: "#3a3a3a", true: "#f58220" }}
                    thumbColor={
                      alarm.enabled && !isGlobalOffToday ? "#fff" : "#888"
                    }
                    ios_backgroundColor="#3a3a3a"
                  />
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>

      <Modal visible={showGlobalOffPicker} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Turn Off Alarms</Text>
            <Text style={styles.modalSubtitle}>
              Choose how many days to pause
            </Text>
            <View style={styles.dayCountRow}>
              <TouchableOpacity
                style={styles.dayCountButton}
                onPress={() => setOffDaysCount((prev) => Math.max(1, prev - 1))}
              >
                <Text style={styles.dayCountButtonText}>-</Text>
              </TouchableOpacity>
              <View style={styles.dayCountValue}>
                <Text style={styles.dayCountValueText}>
                  {offDaysCount} {offDaysCount === 1 ? "day" : "days"}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.dayCountButton}
                onPress={() => setOffDaysCount((prev) => prev + 1)}
              >
                <Text style={styles.dayCountButtonText}>+</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleGlobalOffCancel}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleGlobalOffConfirm}
              >
                <Text style={styles.modalButtonPrimaryText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Subscription Modal then Preferences Modal */}
      <SubscriptionModal
        visible={showSubscriptionModal}
        onComplete={handleSubscriptionComplete}
      />
      <PreferencesModal
        visible={showPreferencesModal}
        onComplete={handlePreferencesComplete}
        allowClose={false}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  headerRow: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerText: {
    flex: 1,
    paddingRight: 12,
  },
  globalSwitchWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  greeting: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#f58220",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
  },
  alarmList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  alarmListContent: {
    paddingBottom: 20,
  },
  emptyState: {
    flex: 1,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCard: {
    width: "100%",
    backgroundColor: "#2a2a2a",
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#f58220",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#fff",
    marginBottom: 18,
  },
  emptyButton: {
    backgroundColor: "#f58220",
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 22,
  },
  emptyButtonDisabled: {
    opacity: 0.6,
  },
  emptyButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  alarmItem: {
    backgroundColor: "#2a2a2a",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  alarmSwitchWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  alarmInfo: {
    flex: 1,
  },
  alarmTime: {
    fontSize: 20,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 2,
  },
  alarmLabel: {
    fontSize: 14,
    color: "#888",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalContainer: {
    width: "100%",
    backgroundColor: "#2a2a2a",
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#aaa",
    marginBottom: 16,
  },
  dayCountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  dayCountButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#3a3a3a",
    alignItems: "center",
    justifyContent: "center",
  },
  dayCountButtonText: {
    fontSize: 20,
    color: "#fff",
    fontWeight: "600",
  },
  dayCountValue: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#1f1f1f",
    alignItems: "center",
  },
  dayCountValueText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
  modalActions: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#3a3a3a",
    alignItems: "center",
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  modalButtonPrimary: {
    backgroundColor: "#f58220",
    borderColor: "#f58220",
  },
  modalButtonPrimaryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
