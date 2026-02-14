import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { getUserData, plansService, PlanType, setUserSubscription } from "../services";

interface SubscriptionModalProps {
  visible: boolean;
  onComplete: () => void;
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
}: SubscriptionModalProps) {
  const [index, setIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<PlanType | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!visible) return null;

  const current = PLANS[index];
  const isSelected = selectedId === current.id;
  const subscribeDisabled = submitting || !selectedId;

  const navigate = (dir: "left" | "right") => {
    if (dir === "left") {
      setIndex((prev) => (prev === 0 ? PLANS.length - 1 : prev - 1));
    } else {
      setIndex((prev) => (prev === PLANS.length - 1 ? 0 : prev + 1));
    }
  };

  const handleSubscribe = async () => {
    setSubmitting(true);
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
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Select Subscription Plan</Text>

          <View style={styles.selectorRow}>
            <TouchableOpacity style={styles.arrow} onPress={() => navigate("left")}>
              <Ionicons name="chevron-back" size={28} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.card, isSelected ? styles.cardSelected : styles.cardUnselected]}
              onPress={() => setSelectedId(current.id as PlanType)}
              activeOpacity={0.85}
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
            </TouchableOpacity>

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
