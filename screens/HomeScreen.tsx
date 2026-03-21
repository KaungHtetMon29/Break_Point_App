import { StatusBar } from "expo-status-bar";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  FlatList,
  Switch,
  Modal,
  TouchableOpacity,
  TextInput,
  Platform,
  NativeModules,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import PreferencesModal from "../components/PreferencesModal";
import SubscriptionModal from "../components/SubscriptionModal";
import {
  getUserData,
  JWTPayload,
  getAuthToken,
  getUserSubscriptionFromStorage,
  getUserPreferencesFromStorage,
  getBreakpointPrefUuidFromStorage,
  getBreakpointGenerateData,
  setUserPreferences,
  setUserSubscription,
  setBreakpointGenerateData,
  userService,
  plansService,
  breakpointsService,
  AlarmPatterns,
  BreakpointTechnique,
} from "../services";
import { API_URL } from "../config/api";

interface AlarmItem {
  id: string;
  time: string;
  label: string;
  enabled: boolean;
}

// HARDCODED ALARM
const HARDCODED_ALARMS: AlarmItem[] = [
  { id: "hardcoded-1", time: "12:40", label: "Start work", enabled: true },
  { id: "hardcoded-2", time: "12:50", label: "Take a break", enabled: true },
  { id: "hardcoded-3", time: "13:00", label: "Lunch break", enabled: true },
];

const fallbackTimes = ["9:00 AM", "11:00 AM", "1:00 PM", "3:00 PM", "5:00 PM"];

const NOTIFICATION_MAP_KEY = "alarm_notification_map";
const NATIVE_ALARM_MAP_KEY = "native_alarm_map";
const NATIVE_ALARM_HISTORY_KEY = "native_alarm_history";
const GLOBAL_ALARM_OFF_KEY = "global_alarm_off_until";
const ALARM_OVERRIDES_KEY = "alarm_overrides";
const LOCAL_OVERRIDE_SCHEDULE_ID = "__local_schedule__";
const ALARM_CHANNEL_ID = "alarm-channel";
const DEFAULT_WORKING_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const DAY_ORDER = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_TO_WEEKDAY: Record<string, number> = {
  Sun: 1,
  Mon: 2,
  Tue: 3,
  Wed: 4,
  Thu: 5,
  Fri: 6,
  Sat: 7,
};
const { AlarmScheduler } = NativeModules as {
  AlarmScheduler?: {
    scheduleDailyAlarm: (
      hour: number,
      minute: number,
      id: number,
      label: string,
      timeText: string,
      apiBaseUrl: string,
      authToken: string,
      prefUuid: string
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [draftAlarms, setDraftAlarms] = useState<AlarmItem[]>([]);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [activeTimeAlarmId, setActiveTimeAlarmId] = useState<string | null>(
    null
  );
  const [timePickerValue, setTimePickerValue] = useState(new Date());
  const [offDaysCount, setOffDaysCount] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [workingDays, setWorkingDays] = useState<string[]>(DEFAULT_WORKING_DAYS);
  const [useNativeScheduler, setUseNativeScheduler] = useState(true);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentSubmitting, setConsentSubmitting] = useState(false);
  const [consentAcknowledged, setConsentAcknowledged] = useState(false);
  const [activeScheduleId, setActiveScheduleId] = useState<string | null>(null);
  const notificationMapRef = useRef<Record<string, string>>({});
  const renderedAlarms = useMemo(() => {
    const seen = new Set<string>();
    return alarms.filter((alarm) => {
      const key = `${alarm.time}|${alarm.label}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [alarms]);
  const useNativeCandidate = useMemo(
    () =>
      Platform.OS === "android" &&
      typeof AlarmScheduler?.scheduleDailyAlarm === "function",
    []
  );
  const useNativeAlarm = useMemo(
    () => useNativeCandidate && useNativeScheduler,
    [useNativeCandidate, useNativeScheduler]
  );

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

  const normalizeWorkingDays = (days?: string[] | null) => {
    if (!Array.isArray(days)) return DEFAULT_WORKING_DAYS;
    const normalized = days.filter((day) => DAY_TO_WEEKDAY[day]);
    return normalized.length ? normalized : DEFAULT_WORKING_DAYS;
  };

  const parsePreferenceValue = (value?: string | null) => {
    if (!value || value.trim() === "") return null;
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return null;
    }
  };

  const valueHasContent = (value: unknown): boolean => {
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.trim() !== "";
    if (typeof value === "number") return !Number.isNaN(value);
    if (typeof value === "boolean") return true;
    if (Array.isArray(value)) {
      return value.some((entry) => valueHasContent(entry));
    }
    if (typeof value === "object") {
      return Object.values(value as Record<string, unknown>).some((entry) =>
        valueHasContent(entry)
      );
    }
    return false;
  };

  const hasPreferenceData = (value?: string | null) => {
    const parsed = parsePreferenceValue(value);
    if (!parsed) return false;
    return valueHasContent(parsed);
  };
  const applyWorkingDaysFromPreference = useCallback(
    (value?: string | null) => {
      const parsed = parsePreferenceValue(value);
      if (parsed && hasPreferenceData(value)) {
        const parsedPreference = parsed as { working_days?: string[] };
        setWorkingDays(normalizeWorkingDays(parsedPreference.working_days));
        return;
      }
      setWorkingDays(DEFAULT_WORKING_DAYS);
    },
    []
  );

  const updatePreferenceGate = (
    needsSubscription: boolean,
    needsPreferences: boolean
  ) => {
    if (needsSubscription) {
      setShowSubscriptionModal(true);
      setShowConsentModal(false);
      setShowPreferencesModal(false);
      return;
    }
    setShowSubscriptionModal(false);
    if (needsPreferences) {
      if (consentAcknowledged) {
        setShowConsentModal(false);
        setShowPreferencesModal(true);
      } else {
        setShowConsentModal(true);
        setShowPreferencesModal(false);
      }
      return;
    }
    setShowConsentModal(false);
    setShowPreferencesModal(false);
  };

  const ensureAlarmChannel = async () => {
    if (Platform.OS !== "android") return;
    await Notifications.setNotificationChannelAsync(ALARM_CHANNEL_ID, {
      name: "Alarms",
      importance: Notifications.AndroidImportance.MAX,
      sound: "default",
      vibrationPattern: [0, 500, 500, 500],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  };

  const getTodayDayId = () => DAY_ORDER[new Date().getDay()];

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

  const formatAlarmTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const getPickerDateForTime = (time: string) => {
    const parsed = parseAlarmTime(time);
    const next = new Date();
    if (!parsed) {
      next.setHours(9, 0, 0, 0);
      return next;
    }
    next.setHours(parsed.hour, parsed.minute, 0, 0);
    return next;
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
    await cancelAllScheduled(renderedAlarms);
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

  const loadAlarmOverrides = async (): Promise<{
    schedule_id: string | null;
    alarms: AlarmItem[];
  } | null> => {
    const raw = await AsyncStorage.getItem(ALARM_OVERRIDES_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as { schedule_id: string | null; alarms: AlarmItem[] };
    } catch {
      return null;
    }
  };

  const saveAlarmOverrides = async (
    scheduleId: string | null,
    alarmsToSave: AlarmItem[]
  ) => {
    await AsyncStorage.setItem(
      ALARM_OVERRIDES_KEY,
      JSON.stringify({
        schedule_id: scheduleId || LOCAL_OVERRIDE_SCHEDULE_ID,
        alarms: alarmsToSave,
      })
    );
  };

  const clearAlarmOverrides = async () => {
    await AsyncStorage.removeItem(ALARM_OVERRIDES_KEY);
  };

  const applyAlarmOverrides = async (
    scheduleId: string | null,
    baseAlarms: AlarmItem[] | null
  ): Promise<AlarmItem[] | null> => {
    if (!baseAlarms) return baseAlarms;
    const stored = await loadAlarmOverrides();
    if (!stored) return baseAlarms;
    const hasMatchingSchedule =
      !!scheduleId && stored.schedule_id === scheduleId;
    const hasLocalOverride =
      stored.schedule_id === LOCAL_OVERRIDE_SCHEDULE_ID;
    if (!hasMatchingSchedule && !hasLocalOverride) return baseAlarms;
    if (!Array.isArray(stored.alarms) || stored.alarms.length === 0) {
      return baseAlarms;
    }
    return stored.alarms;
  };

  const getScheduleId = async (): Promise<string | null> => {
    if (activeScheduleId) return activeScheduleId;
    const storedGenerated = await getBreakpointGenerateData();
    return storedGenerated?.uuid || null;
  };

  const loadNativeAlarmMap = async () => {
    const raw = await AsyncStorage.getItem(NATIVE_ALARM_MAP_KEY);
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw) as Record<string, boolean>;
      return parsed || {};
    } catch {
      return {};
    }
  };

  const saveNativeAlarmMap = async (map: Record<string, boolean>) => {
    await AsyncStorage.setItem(NATIVE_ALARM_MAP_KEY, JSON.stringify(map));
  };

  const loadNativeAlarmHistory = async () => {
    const raw = await AsyncStorage.getItem(NATIVE_ALARM_HISTORY_KEY);
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw) as Record<string, boolean>;
      return parsed || {};
    } catch {
      return {};
    }
  };

  const saveNativeAlarmHistory = async (history: Record<string, boolean>) => {
    await AsyncStorage.setItem(
      NATIVE_ALARM_HISTORY_KEY,
      JSON.stringify(history)
    );
  };

  const cancelAllScheduled = async (alarmsToCancel: AlarmItem[]) => {
    if (useNativeAlarm) {
      const map = await loadNativeAlarmMap();
      const history = await loadNativeAlarmHistory();
      const ids = new Set<string>([
        ...Object.keys(map),
        ...Object.keys(history),
        ...alarmsToCancel.map((alarm) => alarm.id),
      ]);
      for (const id of ids) {
        AlarmScheduler?.cancelAlarm(getAlarmRequestId(id));
      }
      await saveNativeAlarmMap({});
      await saveNativeAlarmHistory({});
      return;
    }
    await Notifications.cancelAllScheduledNotificationsAsync();
    notificationMapRef.current = {};
    await saveNotificationMap();
  };

  const cancelAlarm = async (id: string) => {
    if (useNativeAlarm) {
      AlarmScheduler?.cancelAlarm(getAlarmRequestId(id));
      const map = await loadNativeAlarmMap();
      const history = await loadNativeAlarmHistory();
      if (map[id]) {
        delete map[id];
        await saveNativeAlarmMap(map);
      }
      if (history[id]) {
        delete history[id];
        await saveNativeAlarmHistory(history);
      }
      return;
    }
    const entries = Object.entries(notificationMapRef.current);
    let changed = false;
    for (const [key, value] of entries) {
      if (key === id || key.startsWith(`${id}|`)) {
        await Notifications.cancelScheduledNotificationAsync(value);
        delete notificationMapRef.current[key];
        changed = true;
      }
    }
    if (changed) {
      await saveNotificationMap();
    }
  };

  const scheduleAlarm = async (alarm: AlarmItem) => {
    if (useNativeAlarm) {
      const trigger = parseAlarmTime(alarm.time);
      if (!trigger) return;
      const [authToken, prefUuid] = await Promise.all([
        getAuthToken(),
        getBreakpointPrefUuidFromStorage(),
      ]);
      AlarmScheduler?.cancelAlarm(getAlarmRequestId(alarm.id));
      AlarmScheduler?.scheduleDailyAlarm(
        trigger.hour,
        trigger.minute,
        getAlarmRequestId(alarm.id),
        alarm.label,
        alarm.time,
        API_URL,
        authToken || "",
        prefUuid || ""
      );
      const map = await loadNativeAlarmMap();
      const history = await loadNativeAlarmHistory();
      map[alarm.id] = true;
      await saveNativeAlarmMap(map);
      history[alarm.id] = true;
      await saveNativeAlarmHistory(history);
      return;
    }
    await cancelAlarm(alarm.id);
    await ensureAlarmChannel();
    const trigger = parseAlarmTime(alarm.time);
    if (!trigger) return;
    const scheduledDays = normalizeWorkingDays(workingDays);
    for (const day of scheduledDays) {
      const weekday = DAY_TO_WEEKDAY[day];
      if (!weekday) continue;
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
          weekday,
          repeats: true,
          channelId: ALARM_CHANNEL_ID,
        },
      });
      notificationMapRef.current[`${alarm.id}|${day}`] = notificationId;
    }
    await saveNotificationMap();
  };

  useEffect(() => {
    let active = true;
    setNotificationsReady(false);
    if (useNativeCandidate && useNativeScheduler) {
      (async () => {
        await loadGlobalOffUntil();
        const canSchedule = await AlarmScheduler?.canScheduleExactAlarms();
        if (!active) return;
        if (!canSchedule) {
          AlarmScheduler?.requestExactAlarmPermission();
          if (!active) return;
        }
        setNotificationsReady(true);
      })();
      return () => {
        active = false;
      };
    }
    (async () => {
      await ensureAlarmChannel();
      const permission = await Notifications.requestPermissionsAsync();
      if (!permission.granted) {
        if (active) {
          setNotificationsReady(false);
        }
        return;
      }
      await loadGlobalOffUntil();
      await loadNotificationMap();
      if (!active) return;
      setNotificationsReady(true);
    })();
    return () => {
      active = false;
    };
  }, [useNativeCandidate, useNativeScheduler]);

  const syncNotifications = useCallback(async () => {
    await cancelAllScheduled(renderedAlarms);
    if (isGlobalOffToday) return;
    for (const alarm of renderedAlarms) {
      if (alarm.enabled) {
        await scheduleAlarm(alarm);
      }
    }
  }, [isGlobalOffToday, workingDays, useNativeAlarm, renderedAlarms]);

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
  }, [notificationsReady, renderedAlarms, syncNotifications]);

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
    if (!mapped.length) return null;
    const sorted = mapped
      .map((alarm, index) => {
        const parsed = parseAlarmTime(alarm.time);
        const minutes = parsed ? parsed.hour * 60 + parsed.minute : null;
        return { alarm, index, minutes };
      })
      .sort((a, b) => {
        if (a.minutes === null && b.minutes === null) return a.index - b.index;
        if (a.minutes === null) return 1;
        if (b.minutes === null) return -1;
        return a.minutes - b.minutes;
      })
      .map((entry) => entry.alarm);
    return sorted;
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
      let isActive = true;

      const checkModals = async () => {
        setIsLoading(true);
        try {
          const [
            ,
            storedPrefs,
            data,
            storedSub,
            storedBreakpointPrefUuid,
          ] = await Promise.all([
            loadGlobalOffUntil(),
            getUserPreferencesFromStorage(),
            getUserData(),
            getUserSubscriptionFromStorage(),
            getBreakpointPrefUuidFromStorage(),
          ]);
          if (!isActive) return;

          const storedPrefUuid = storedPrefs?.uuid ?? null;
          let preferenceValueForGate = storedPrefs?.preference ?? null;
          let subscriptionForGate = storedSub;
          applyWorkingDaysFromPreference(preferenceValueForGate);
          setUserData(data);

          if (data?.uuid) {
            try {
              const [preferences, currentPlan] = await Promise.all([
                userService.getUserPreferences(data.uuid),
                plansService.getCurrentPlan(data.uuid),
              ]);
              if (!isActive) return;

              const prefVal = preferences?.preference;
              if (hasPreferenceData(prefVal)) {
                await setUserPreferences({
                  preference: prefVal,
                  uuid: preferences?.uuid ?? null,
                });
                preferenceValueForGate = prefVal;
                applyWorkingDaysFromPreference(prefVal);
              } else {
                await setUserPreferences(null);
                preferenceValueForGate = null;
                applyWorkingDaysFromPreference(null);
              }

              const planType = (currentPlan?.plan_type || "").trim();
              if (planType) {
                const normalized = planType.toLowerCase();
                subscriptionForGate = {
                  is_active: normalized === "premium",
                  tier: planType,
                  expire_date: currentPlan?.end_date || "",
                };
                await setUserSubscription(subscriptionForGate);
              } else {
                subscriptionForGate = null;
                await setUserSubscription(null);
              }
            } catch {
            }
          }

          if (data?.uuid) {
            let applied = false;
            try {
              const techniques = await breakpointsService.getTechniques(
                data.uuid
              );
              if (!isActive) return;
              const preferredTechnique = techniques.find(
                (technique) =>
                  technique.pref_uuid &&
                  technique.pref_uuid === storedBreakpointPrefUuid
              );
              const activeTechnique =
                preferredTechnique ||
                techniques.find((technique) => technique.is_active) ||
                techniques[0];
              setActiveScheduleId(activeTechnique?.uuid || null);
              const mappedTechniques = mapTechniquesToAlarms(techniques);
              if (mappedTechniques) {
                const scheduleId =
                  activeTechnique?.uuid || (await getScheduleId());
                const merged = await applyAlarmOverrides(
                  scheduleId,
                  mappedTechniques
                );
                setAlarms(merged || mappedTechniques);
                applied = true;
              }
            } catch {
            }

            if (!applied) {
              try {
                const generated = await breakpointsService.generate(data.uuid);
                if (!isActive) return;
                await setBreakpointGenerateData(generated || null);
                setActiveScheduleId(generated?.uuid || null);
                const mapped = mapAlarmPatternsToAlarms(
                  generated?.alarm_patterns
                );
                if (mapped) {
                  const scheduleId = generated?.uuid || (await getScheduleId());
                  const merged = await applyAlarmOverrides(scheduleId, mapped);
                  setAlarms(merged || mapped);
                }
              } catch {
              }
            }
          } else {
            setActiveScheduleId(null);
          }

          const isNilSubscription = subscriptionForGate === null;
          const needsSubscription =
            isNilSubscription ||
            !subscriptionForGate ||
            !(subscriptionForGate.tier || "").trim() ||
            shouldShowExpiryModal(
              subscriptionForGate.expire_date,
              subscriptionForGate.tier
            );
          const needsPreferences = !hasPreferenceData(preferenceValueForGate);
          updatePreferenceGate(needsSubscription, needsPreferences);
        } catch {
          if (!isActive) return;
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
    (async () => {
      const storedPrefs = await getUserPreferencesFromStorage();
      applyWorkingDaysFromPreference(storedPrefs?.preference);
    })();
  };

  const handleConsentAgree = async () => {
    if (consentSubmitting) return;
    setConsentSubmitting(true);
    try {
      const response = await userService.acceptConsent();
      if (response.status !== "success") {
        Alert.alert("Consent failed", "Please try again.");
        return;
      }
      setConsentAcknowledged(true);
      setShowConsentModal(false);
      setShowPreferencesModal(true);
    } catch {
      Alert.alert("Consent failed", "Please try again.");
    } finally {
      setConsentSubmitting(false);
    }
  };
  const handleSubscriptionComplete = async () => {
    setShowSubscriptionModal(false);
    const storedPrefs = await getUserPreferencesFromStorage();
    const needsPreferences = !hasPreferenceData(storedPrefs?.preference);
    updatePreferenceGate(false, needsPreferences);
  };

  const updateSchedule = useCallback(async (nextAlarms: AlarmItem[]) => {
    const scheduleId = await getScheduleId();
    if (!scheduleId) {
      return;
    }
    const seen = new Set<string>();
    const alarmPatterns: AlarmPatterns[] = nextAlarms
      .filter((alarm) => alarm.enabled)
      .filter((alarm) => {
        const key = `${alarm.time}|${alarm.label}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((alarm) => ({
        start_time: { alarm_time: alarm.time, label: alarm.label },
      }));
    if (alarmPatterns.length === 0) {
      return;
    }
    try {
      await breakpointsService.updateSchedule(scheduleId, alarmPatterns);
    } catch {
    }
  }, [activeScheduleId]);

  const toggleAlarm = (id: string) => {
    setAlarms((prevAlarms) =>
      prevAlarms.map((alarm) =>
        alarm.id === id ? { ...alarm, enabled: !alarm.enabled } : alarm
      )
    );
  };

  const openEditModal = () => {
    setDraftAlarms(renderedAlarms);
    setShowTimePicker(false);
    setActiveTimeAlarmId(null);
    setShowEditModal(true);
  };

  const handleEditCancel = () => {
    setShowEditModal(false);
    setShowTimePicker(false);
    setActiveTimeAlarmId(null);
  };

  const handleEditUpdate = async () => {
    const updates = new Map(draftAlarms.map((alarm) => [alarm.id, alarm]));
    const nextAlarms = alarms.map(
      (alarm) => updates.get(alarm.id) || alarm
    );
    setAlarms(nextAlarms);
    setShowEditModal(false);
    setShowTimePicker(false);
    setActiveTimeAlarmId(null);
    const scheduleId = await getScheduleId();
    await saveAlarmOverrides(scheduleId, nextAlarms);
    await updateSchedule(nextAlarms);
  };

  const updateDraftAlarm = (
    id: string,
    updates: Partial<Pick<AlarmItem, "time" | "label">>
  ) => {
    setDraftAlarms((prev) =>
      prev.map((alarm) => (alarm.id === id ? { ...alarm, ...updates } : alarm))
    );
  };

  const openTimePicker = (alarm: AlarmItem) => {
    setActiveTimeAlarmId(alarm.id);
    setTimePickerValue(getPickerDateForTime(alarm.time));
    setShowTimePicker(true);
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
      await setBreakpointGenerateData(generated || null);
      setActiveScheduleId(generated?.uuid || null);
      const mapped = mapAlarmPatternsToAlarms(
        generated?.alarm_patterns,
        userData.uuid
      );
      if (mapped) {
        await clearAlarmOverrides();
        setAlarms(mapped);
      }
    } catch {
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
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[
                styles.editButton,
                renderedAlarms.length === 0 && styles.editButtonDisabled,
              ]}
              onPress={openEditModal}
              disabled={renderedAlarms.length === 0}
            >
              <Ionicons name="create-outline" size={20} color="#f58220" />
            </TouchableOpacity>
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
        </View>

        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#f58220" />
            <Text style={styles.loadingText}>Loading your alarms...</Text>
          </View>
        ) : renderedAlarms.length === 0 ? (
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
          <FlatList
            style={styles.alarmList}
            contentContainerStyle={styles.alarmListContent}
            showsVerticalScrollIndicator={false}
            data={renderedAlarms}
            keyExtractor={(alarm) => alarm.id}
            renderItem={({ item: alarm }) => (
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
            )}
          />
        )}
      </SafeAreaView>

      <Modal
        visible={showEditModal}
        animationType="fade"
        transparent
        presentationStyle="overFullScreen"
        statusBarTranslucent
        hardwareAccelerated
        onRequestClose={handleEditCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editModalWrapper}>
            <View style={styles.editModalContainer}>
            <Text style={styles.modalTitle}>Edit Alarms</Text>
            <FlatList
              style={styles.editList}
              contentContainerStyle={styles.editListContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              data={draftAlarms}
              keyExtractor={(alarm) => alarm.id}
              renderItem={({ item: alarm }) => (
                <View key={alarm.id} style={styles.editRow}>
                  <TextInput
                    style={[styles.editInput, styles.editLabelInput]}
                    value={alarm.label}
                    onChangeText={(text) =>
                      updateDraftAlarm(alarm.id, { label: text })
                    }
                    placeholder="Label"
                    placeholderTextColor="#666"
                  />
                  <TouchableOpacity
                    style={[
                      styles.editInput,
                      styles.editTimeInput,
                      styles.editTimeButton,
                    ]}
                    onPress={() => openTimePicker(alarm)}
                  >
                    <Text style={styles.editTimeText}>
                      {alarm.time || "Time"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleEditCancel}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleEditUpdate}
              >
                <Text style={styles.modalButtonPrimaryText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
          </View>
        </View>
      </Modal>

      {showTimePicker && (
        <DateTimePicker
          value={timePickerValue}
          mode="time"
          is24Hour={false}
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, date) => {
            setShowTimePicker(Platform.OS === "ios");
            if (date && activeTimeAlarmId) {
              setTimePickerValue(date);
              updateDraftAlarm(activeTimeAlarmId, {
                time: formatAlarmTime(date),
              });
            }
          }}
        />
      )}

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
      <Modal visible={showConsentModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Consent Required</Text>
            <Text style={styles.modalSubtitle}>
              We will store some of your personal information to personalize
              your experience. Please confirm that you understand and agree.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleConsentAgree}
                disabled={consentSubmitting}
              >
                {consentSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonPrimaryText}>I Agree</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#3a3a3a",
    alignItems: "center",
    justifyContent: "center",
  },
  editButtonDisabled: {
    opacity: 0.5,
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
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#aaa",
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
  editModalWrapper: {
    width: "100%",
    flex: 1,
    justifyContent: "center",
  },
  editModalContainer: {
    width: "100%",
    maxHeight: "88%",
    backgroundColor: "#2a2a2a",
    borderRadius: 16,
    padding: 20,
  },
  editList: {
    marginTop: 12,
  },
  editListContent: {
    paddingBottom: 8,
    gap: 10,
  },
  editRow: {
    flexDirection: "row",
    gap: 10,
  },
  editInput: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#3a3a3a",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#fff",
    backgroundColor: "#1f1f1f",
  },
  editLabelInput: {
    flex: 1,
  },
  editTimeInput: {
    width: 110,
  },
  editTimeButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  editTimeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
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
