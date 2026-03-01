import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  getUserData,
  plansService,
  PlanType,
  setUserSubscription,
  getUserSubscriptionFromStorage,
  userService,
} from "../services";
import { useStripe } from '@stripe/stripe-react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";

interface SubscriptionModalProps {
  visible: boolean;
  onComplete: () => void;
  allowClose?: boolean;
  onClose?: () => void;
}

const PLANS = [
  {
    id: "free",
    name: "Free Tier",
    points: [
      "Fixed Break Methods",
      "Static Schedules",
      "Three Alarm Generations Per Month",
    ],
  },
  {
    id: "premium",
    name: "Premium Tier",
    points: [
      "Behavior Tracking",
      "Adaptive Scheduling",
      "Productivity Rhythm",
      "Weekly Insights",
    ],
  },
];

export default function SubscriptionModal({
  visible,
  onComplete,
  allowClose = false,
  onClose,
}: SubscriptionModalProps) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);
  const [index, setIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [currentTier, setCurrentTier] = useState<string | null>(null);
  const initializePaymentSheet = async () => {
    const {
      customer_id,
      payment_intent
    } = await userService.subscribePlan();
    const stripe_key= await AsyncStorage.getItem("stripe_key")
    const { error } = await initPaymentSheet({
      merchantDisplayName: "BreakPoint, Inc.",
      customerEphemeralKeySecret: stripe_key as string,
      paymentIntentClientSecret: payment_intent,
      // Set `allowsDelayedPaymentMethods` to true if your business can handle payment
      //methods that complete payment after a delay, like SEPA Debit and Sofort.
      allowsDelayedPaymentMethods: true,
      defaultBillingDetails: {
        name: 'Jane Doe',
      }
    });
    if (!error) {
      setLoading(true);
    }
  };
  useEffect(() => {
    let active = true;
    if (visible) {
      (async () => {
        const stored = await getUserSubscriptionFromStorage();
        if (!active) return;
        setCurrentTier(stored?.tier || null);
      })();
    }
    initializePaymentSheet();
    return () => {
      active = false;
    };
  }, [visible]);

  if (!visible) return null;

  const current = PLANS[index];
  const selectedId = current.id as PlanType;
  const isSelected = true;
  const isCurrentPlan =
    !!currentTier && currentTier.toLowerCase() === current.id.toLowerCase();
  const subscribeDisabled = submitting || isCurrentPlan;

  const navigate = (dir: "left" | "right") => {
    if (dir === "left") {
      setIndex((prev) => (prev === 0 ? PLANS.length - 1 : prev - 1));
    } else {
      setIndex((prev) => (prev === PLANS.length - 1 ? 0 : prev + 1));
    }
  };

  const handleSubscribe = async () => {
    setSubmitting(true);
    if (selectedId !== "free") {
    try {
      const { error } = await presentPaymentSheet();
      if (error) {
        if (error.code !== "Canceled"){
          Alert.alert(`Error code: ${error.code}`, error.message);
        }
      } else {
      const user = await getUserData();
      const id = user?.uuid;
      if (id && selectedId) {
        await plansService.subscribePlan(id, { plan_type: selectedId });
        await setUserSubscription({
          is_active: true,
          tier: selectedId,
          expire_date: "",
        });
      }
      onComplete();
      }
      
    } finally {
      setSubmitting(false);
    }
    }else{
      try { 
      const user = await getUserData();
      const id = user?.uuid;
      if (id && selectedId) {
        await plansService.subscribePlan(id, { plan_type: selectedId });
        await setUserSubscription({
          is_active: true,
          tier: selectedId,
          expire_date: "",
        });
      }
      onComplete();
    } finally {
      setSubmitting(false);
    }
    }
  };
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {allowClose && (
            <View style={styles.closeRow}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  if (onClose) onClose();
                }}
              >
                <Ionicons name="close-outline" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
          <Text style={styles.title}>Select Subscription Plan</Text>

          <View style={styles.selectorRow}>
            <TouchableOpacity style={styles.arrow} onPress={() => navigate("left")}>
              <Ionicons name="chevron-back" size={28} color="#fff" />
            </TouchableOpacity>

            <View
              style={[styles.card, isSelected ? styles.cardSelected : styles.cardUnselected]}
            >
              <Text style={styles.planName}>
                {current.name}
              </Text>
              <View style={styles.points}>
                {current.points.map((p, i) => (
                  <View key={i} style={styles.pointRow}>
                    <View style={styles.pointDot} />
                    <Text style={styles.pointText}>{p}</Text>
                  </View>
                ))}
              </View>
            </View>

            <TouchableOpacity style={styles.arrow} onPress={() => navigate("right")}>
              <Ionicons name="chevron-forward" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.subscribeBtn, subscribeDisabled && styles.subscribeBtnDisabled]}
            disabled={subscribeDisabled}
            onPress={handleSubscribe}
          >
            {submitting ? (
              <View style={styles.subscribeLoading}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.subscribeText}>Subscribing...</Text>
              </View>
            ) : (
              <Text style={styles.subscribeText}>Subscribe</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#2a2a2a",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  closeRow: {
    alignItems: "flex-end",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#3a3a3a",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#f58220",
    textAlign: "center",
    marginBottom: 16,
  },
  selectorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  arrow: {
    padding: 8,
  },
  card: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
  },
  cardUnselected: {
    borderColor: "rgba(245, 130, 32, 0.2)",
  },
  cardSelected: {
    borderColor: "#f58220",
  },
  planName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#f58220",
    textAlign: "center",
    marginBottom: 12,
  },
  points: {
    gap: 10,
  },
  pointRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  pointDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#f58220",
    marginTop: 5,
  },
  pointText: {
    flex: 1,
    fontSize: 13,
    color: "#fff",
    lineHeight: 18,
  },
  subscribeBtn: {
    backgroundColor: "#f58220",
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: "center",
  },
  subscribeBtnDisabled: {
    opacity: 0.5,
  },
  subscribeText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  subscribeLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
