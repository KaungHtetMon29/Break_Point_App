import { StatusBar } from "expo-status-bar";
import { Modal, StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import SubscriptionModal from "../components/SubscriptionModal";
import {
  breakpointsService,
  getUserSubscriptionFromStorage,
  setBreakpointData,
  setBreakpointPrefUuid,
  userService,
} from "../services";

export default function SettingsScreen() {
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [subscription, setSubscription] = useState<{
    is_active: boolean;
    tier: string;
    expire_date: string;
  } | null>(null);
  const [isAdaptiveLoading, setIsAdaptiveLoading] = useState(false);
  const [adaptiveStatus, setAdaptiveStatus] = useState<{
    canGenerate: boolean;
    daysLeft: number | null;
  } | null>(null);
  const [adaptiveNotice, setAdaptiveNotice] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const isPremium = useMemo(
    () => (subscription?.tier || "").toLowerCase() === "premium",
    [subscription?.tier]
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const stored = await getUserSubscriptionFromStorage();
          if (!active) return;
          setSubscription(stored);
          const status = await userService.canGenerateAdaptive();
          console.log("canGenerateAdaptive response", status);
          if (!active) return;
          if (status.can_generate === true) {
            setAdaptiveStatus({ canGenerate: true, daysLeft: null });
          } else if (typeof status.days_left === "number") {
            setAdaptiveStatus({ canGenerate: false, daysLeft: status.days_left });
          } else {
            setAdaptiveStatus(null);
          }
        } catch {
          if (!active) return;
          setSubscription(null);
          setAdaptiveStatus(null);
        }
      })();
      return undefined;
    }, [])
  );

  const handleAdaptiveAlarm = useCallback(async () => {
    if (isAdaptiveLoading) return;
    if (adaptiveStatus && !adaptiveStatus.canGenerate) {
      if (typeof adaptiveStatus.daysLeft === "number") {
        setAdaptiveNotice({
          title: "Adaptive Alarm Unavailable",
          message: `${adaptiveStatus.daysLeft} day(s) left to analyze your activity.`,
        });
        return;
      }
      setAdaptiveNotice({
        title: "Adaptive Alarm Unavailable",
        message: "Please try again later.",
      });
      return;
    }
    setIsAdaptiveLoading(true);
    try {
      const response = await breakpointsService.getAdaptiveAlarm();
      const selected = response?.[0] ?? null;
      if (selected) {
        await setBreakpointData({
          uuid: selected.uuid,
          pref_uuid: selected.pref_uuid ?? null,
          is_active: selected.is_active,
          techniques: selected.techniques,
        });
        await setBreakpointPrefUuid(selected.pref_uuid ?? null);
      } else {
        await setBreakpointData(null);
        await setBreakpointPrefUuid(null);
      }
    } finally {
      setIsAdaptiveLoading(false);
    }
  }, [adaptiveStatus, isAdaptiveLoading]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="light" />
      <View style={styles.content}>
        <Text style={styles.title}>Setting</Text>
        <TouchableOpacity
          style={styles.subscriptionButton}
          onPress={() => setShowSubscriptionModal(true)}
        >
          <View style={styles.subscriptionIcon}>
            <Ionicons name="card-outline" size={20} color="#fff" />
          </View>
          <Text style={styles.subscriptionText}>Update Subscription</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.adaptiveButton,
            styles.secondaryButton,
            (!isPremium || isAdaptiveLoading) && styles.adaptiveButtonDisabled,
          ]}
          onPress={handleAdaptiveAlarm}
          disabled={!isPremium || isAdaptiveLoading}
        >
          <View style={styles.adaptiveContent}>
            <View style={styles.adaptiveIcon}>
              <Ionicons name="time-outline" size={18} color="#fff" />
            </View>
            <Text style={styles.adaptiveText}>
              {isAdaptiveLoading ? "Loading..." : "Get Adaptive Alarm"}
            </Text>
          </View>
          <View style={styles.adaptiveAccent}>
            <Text style={styles.adaptiveAccentText}>Premium</Text>
          </View>
        </TouchableOpacity>
      </View>
      <SubscriptionModal
        visible={showSubscriptionModal}
        onComplete={() => setShowSubscriptionModal(false)}
        allowClose
        onClose={() => setShowSubscriptionModal(false)}
      />
      <Modal visible={!!adaptiveNotice} transparent animationType="fade">
        <View style={styles.noticeOverlay}>
          <View style={styles.noticeContainer}>
            <Text style={styles.noticeTitle}>{adaptiveNotice?.title}</Text>
            <Text style={styles.noticeMessage}>{adaptiveNotice?.message}</Text>
            <TouchableOpacity
              style={styles.noticeButton}
              onPress={() => setAdaptiveNotice(null)}
            >
              <Text style={styles.noticeButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  title: {
    fontSize: 18,
    color: "#fff",
    marginBottom: 16,
  },
  subscriptionButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#3a3a3a",
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 12,
  },
  secondaryButton: {
    marginTop: 12,
  },
  subscriptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#3a3a3a",
    alignItems: "center",
    justifyContent: "center",
  },
  subscriptionText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
  adaptiveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#3a3a3a",
    backgroundColor: "#2a2a2a",
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  adaptiveButtonDisabled: {
    opacity: 0.5,
  },
  adaptiveContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  adaptiveIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#3a3a3a",
    alignItems: "center",
    justifyContent: "center",
  },
  adaptiveText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
  adaptiveAccent: {
    width: 72,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f58220",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  adaptiveAccentText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  noticeOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  noticeContainer: {
    width: "100%",
    backgroundColor: "#2a2a2a",
    borderRadius: 16,
    padding: 20,
  },
  noticeTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 6,
  },
  noticeMessage: {
    fontSize: 14,
    color: "#aaa",
    marginBottom: 16,
  },
  noticeButton: {
    backgroundColor: "#f58220",
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: "center",
  },
  noticeButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
