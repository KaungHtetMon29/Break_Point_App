import { StatusBar } from "expo-status-bar";
import {
  Modal,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
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
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
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

  const handleSubmitFeedback = useCallback(async () => {
    const message = feedbackText.trim();
    if (!message || isSubmittingFeedback) {
      return;
    }
    setIsSubmittingFeedback(true);
    try {
      const response = await userService.submitFeedback({ message });
      if (response.status === "success") {
        setFeedbackText("");
        setShowFeedbackModal(false);
        if (response.buffered) {
          setAdaptiveNotice({
            title: "Feedback Queued",
            message:
              "You are offline. We will send your feedback when internet is back.",
          });
          return;
        }
        setAdaptiveNotice({
          title: "Feedback Sent",
          message: "Thank you for sharing your feedback.",
        });
        return;
      }
      setAdaptiveNotice({
        title: "Feedback Failed",
        message: "Please try submitting your feedback again.",
      });
    } catch {
      setAdaptiveNotice({
        title: "Feedback Failed",
        message: "Please try submitting your feedback again.",
      });
    } finally {
      setIsSubmittingFeedback(false);
    }
  }, [feedbackText, isSubmittingFeedback]);

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
        <TouchableOpacity
          style={[styles.feedbackButton, styles.secondaryButton]}
          onPress={() => setShowFeedbackModal(true)}
        >
          <View style={styles.feedbackContent}>
            <View style={styles.feedbackIcon}>
              <Ionicons name="chatbox-ellipses-outline" size={18} color="#fff" />
            </View>
            <Text style={styles.feedbackText}>Send Feedback</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.contactButton, styles.secondaryButton]}
          onPress={() => setShowContactModal(true)}
        >
          <View style={styles.contactContent}>
            <View style={styles.contactIcon}>
              <Ionicons name="call-outline" size={18} color="#fff" />
            </View>
            <Text style={styles.contactText}>Contact Us</Text>
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
      <Modal visible={showFeedbackModal} transparent animationType="fade">
        <View style={styles.noticeOverlay}>
          <View style={styles.feedbackModalContainer}>
            <Text style={styles.noticeTitle}>Send Feedback</Text>
            <TextInput
              style={styles.feedbackInput}
              value={feedbackText}
              onChangeText={setFeedbackText}
              placeholder="Share your thoughts..."
              placeholderTextColor="#777"
              multiline
              textAlignVertical="top"
              maxLength={1500}
            />
            <View style={styles.feedbackActions}>
              <TouchableOpacity
                style={styles.feedbackCancelButton}
                onPress={() => setShowFeedbackModal(false)}
                disabled={isSubmittingFeedback}
              >
                <Text style={styles.feedbackCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.feedbackSubmitButton,
                  (!feedbackText.trim() || isSubmittingFeedback) && styles.adaptiveButtonDisabled,
                ]}
                onPress={handleSubmitFeedback}
                disabled={!feedbackText.trim() || isSubmittingFeedback}
              >
                {isSubmittingFeedback ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.feedbackSubmitText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={showContactModal} transparent animationType="fade">
        <View style={styles.noticeOverlay}>
          <View style={styles.contactModalContainer}>
            <Text style={styles.noticeTitle}>Contact Information</Text>
            <View style={styles.contactLine}>
              <Ionicons name="mail-outline" size={16} color="#bbb" />
              <Text style={styles.contactValue}>support@breakpoint.app</Text>
            </View>
            <View style={styles.contactLine}>
              <Ionicons name="call-outline" size={16} color="#bbb" />
              <Text style={styles.contactValue}>+1 (555) 123-4567</Text>
            </View>
            <View style={styles.contactLine}>
              <Ionicons name="location-outline" size={16} color="#bbb" />
              <Text style={styles.contactValue}>221B Baker Street, London</Text>
            </View>
            <TouchableOpacity
              style={styles.noticeButton}
              onPress={() => setShowContactModal(false)}
            >
              <Text style={styles.noticeButtonText}>Close</Text>
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
    backgroundColor: "#2a2a2a",
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
  feedbackButton: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#3a3a3a",
    backgroundColor: "#2a2a2a",
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  feedbackContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  feedbackIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#3a3a3a",
    alignItems: "center",
    justifyContent: "center",
  },
  feedbackText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
  contactButton: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#3a3a3a",
    backgroundColor: "#2a2a2a",
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  contactContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  contactIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#3a3a3a",
    alignItems: "center",
    justifyContent: "center",
  },
  contactText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
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
  feedbackModalContainer: {
    width: "100%",
    backgroundColor: "#2a2a2a",
    borderRadius: 16,
    padding: 20,
  },
  feedbackInput: {
    marginTop: 8,
    minHeight: 140,
    maxHeight: 240,
    borderWidth: 1,
    borderColor: "#3a3a3a",
    borderRadius: 12,
    color: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  feedbackActions: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  feedbackCancelButton: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#4a4a4a",
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  feedbackCancelText: {
    color: "#ccc",
    fontSize: 14,
    fontWeight: "600",
  },
  feedbackSubmitButton: {
    backgroundColor: "#f58220",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 18,
    minWidth: 86,
    alignItems: "center",
  },
  feedbackSubmitText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  contactModalContainer: {
    width: "100%",
    backgroundColor: "#2a2a2a",
    borderRadius: 16,
    padding: 20,
    gap: 10,
  },
  contactLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  contactValue: {
    color: "#ddd",
    fontSize: 14,
    flexShrink: 1,
  },
});
