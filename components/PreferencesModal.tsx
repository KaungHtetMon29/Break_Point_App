import {
  StyleSheet,
  Text,
  View,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useEffect, useState, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  getUserData,
  userService,
  setUserPreferences,
  StoredPreferences,
} from "../services";

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
  working_days?: string[];
  health_condition: string;
  break_method: string;
}

const AGE_RANGES = [
  "18-24",
  "25-29",
  "30-34",
  "35-39",
  "40-44",
  "45-49",
  "50-54",
  "55-59",
  "60-64",
  "65+",
];

const CAREER_TYPES = [
  "Software Engineer",
  "Web Developer",
  "Data Analyst",
  "UX/UI Designer",
  "Content Writer",
  "Digital Marketer",
  "Virtual Assistant",
  "Project Manager",
  "Customer Support",
  "Consultant",
  "Accountant",
  "Graphic Designer",
  "Video Editor",
  "Social Media Manager",
  "Other",
];

const BREAK_METHODS = [
  {
    id: "promodoro",
    name: "Pomodoro Technique",
    points: [
      "A Time Management Method That Helps Improve Focus And Productivity.",
      "Work For 25 Minutes On One Task Without Interruption.",
      "Take A 5-Minute Short Break After Each Session.",
      "After 4 Sessions, Take A Longer Break (15-30 Minutes).",
      "Reduces Burnout And Improves Concentration.",
      "Encourages Deep Work And Better Time Awareness.",
    ],
  },
  {
    id: "52-17",
    name: "52-17 Method",
    points: [
      "A time management method based on productivity research.",
      "Work with full focus for 52 minutes.",
      "Take a 17-minute break after each session.",
      "Designed to balance intense focus with proper rest.",
      "Helps prevent mental fatigue and maintain energy.",
      "Encourages sustainable productivity throughout the day.",
    ],
  },
  {
    id: "90-Mins",
    name: "90-Minute Work Blocks",
    points: [
      "A productivity method for deep and focused work.",
      "Work with full concentration for 90 minutes.",
      "Take a 20-minute break after each session.",
      "Based on the idea that the brain works best in 90-minute cycles.",
      "Helps maintain high performance without burnout.",
      "Suitable for complex or creative tasks.",
    ],
  },
  // {
  //   id: "microbreaks",
  //   name: "Microbreak Method",
  //   points: [
  //     "Take short 30-second to 2-minute breaks frequently.",
  //     "Every 20-30 minutes, look away from screen.",
  //     "Stretch, move, or rest your eyes.",
  //     "Prevents physical strain and eye fatigue.",
  //     "Good for desk-bound workers.",
  //     "Easy to implement without disrupting flow.",
  //   ],
  // },
];

const WORKING_DAYS = [
  { id: "Mon", label: "Mon" },
  { id: "Tue", label: "Tue" },
  { id: "Wed", label: "Wed" },
  { id: "Thu", label: "Thu" },
  { id: "Fri", label: "Fri" },
  { id: "Sat", label: "Sat" },
  { id: "Sun", label: "Sun" },
];

const DEFAULT_WORKING_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

interface PreferencesModalProps {
  visible: boolean;
  onComplete: (updated: StoredPreferences | null) => void;
  initialData?: PreferenceData | null;
  allowClose?: boolean;
  onClose?: () => void;
}

export default function PreferencesModal({
  visible,
  onComplete,
  initialData,
  allowClose,
  onClose,
}: PreferencesModalProps) {
  const [step, setStep] = useState(1);

  // Step 1: Personal Preferences
  const [ageRange, setAgeRange] = useState("20-40");
  const [weight, setWeight] = useState("120");
  const [height, setHeight] = useState("159");
  const [careerType, setCareerType] = useState("Software Engineer");
  const [clockInTime, setClockInTime] = useState(new Date(2024, 0, 1, 9, 0));
  const [clockOutTime, setClockOutTime] = useState(new Date(2024, 0, 1, 18, 0));
  const [breakDuration, setBreakDuration] = useState("1");
  const [workingDays, setWorkingDays] = useState<string[]>(DEFAULT_WORKING_DAYS);
  const [healthConditions, setHealthConditions] = useState("");

  // Step 2: Break Method
  const [selectedMethodIndex, setSelectedMethodIndex] = useState(0);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Dropdown states
  const [showAgeDropdown, setShowAgeDropdown] = useState(false);
  const [showCareerDropdown, setShowCareerDropdown] = useState(false);
  const [showClockInPicker, setShowClockInPicker] = useState(false);
  const [showClockOutPicker, setShowClockOutPicker] = useState(false);
  const sanitizeDigits = (value: string, maxLength = 3) =>
    value.replace(/[^0-9]/g, "").slice(0, maxLength);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const parseTime = (time: string): Date => {
    try {
      const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (!match) return new Date(2024, 0, 1, 9, 0);
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const period = match[3].toUpperCase();
      if (period === "PM" && hours < 12) hours += 12;
      if (period === "AM" && hours === 12) hours = 0;
      return new Date(2024, 0, 1, hours, minutes);
    } catch {
      return new Date(2024, 0, 1, 9, 0);
    }
  };

  useEffect(() => {
    if (visible && initialData) {
      setAgeRange(initialData.age);
      setWeight((initialData.weight || "").replace(/[^0-9]/g, ""));
      setHeight((initialData.height || "").replace(/[^0-9]/g, ""));
      setCareerType(initialData.career_type);
      setClockInTime(parseTime(initialData.working_hour["clock-in_time"]));
      setClockOutTime(parseTime(initialData.working_hour["clock-out_time"]));
      setBreakDuration(
        (initialData.working_hour["break_time"] || "").replace(/[^0-9]/g, "")
      );
      setWorkingDays(
        initialData.working_days && initialData.working_days.length > 0
          ? initialData.working_days
          : DEFAULT_WORKING_DAYS
      );
      setHealthConditions(initialData.health_condition || "");
      if (initialData.break_method) {
        const idx = BREAK_METHODS.findIndex(
          (m) => m.id === initialData.break_method
        );
        if (idx >= 0) {
          setSelectedMethodIndex(idx);
          setSelectedMethod(BREAK_METHODS[idx].id);
        } else {
          setSelectedMethod(null);
        }
      } else {
        setSelectedMethod(null);
      }
      setStep(1);
    }
  }, [visible, initialData]);

  const toggleWorkingDay = (dayId: string) => {
    setWorkingDays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId]
    );
  };

  const currentPreferenceObj = useMemo(
    () => ({
      age: ageRange,
      weight: `${weight} lb`,
      height: `${height} cm`,
      career_type: careerType,
      working_hour: {
        "clock-in_time": formatTime(clockInTime),
        "clock-out_time": formatTime(clockOutTime),
        "break_time": `${breakDuration} Hr`,
      },
      working_days: workingDays,
      health_condition: healthConditions,
      break_method: selectedMethod || "",
    }),
    [
      ageRange,
      weight,
      height,
      careerType,
      clockInTime,
      clockOutTime,
      breakDuration,
      workingDays,
      healthConditions,
      selectedMethod,
    ]
  );

  const initialPreferenceObj = useMemo(() => {
    if (!initialData) return null;
    return {
      age: initialData.age,
      weight: initialData.weight,
      height: initialData.height,
      career_type: initialData.career_type,
      working_hour: {
        "clock-in_time": initialData.working_hour["clock-in_time"],
        "clock-out_time": initialData.working_hour["clock-out_time"],
        "break_time": initialData.working_hour["break_time"],
      },
      working_days:
        initialData.working_days && initialData.working_days.length > 0
          ? initialData.working_days
          : DEFAULT_WORKING_DAYS,
      health_condition: initialData.health_condition,
      break_method: initialData.break_method || "",
    };
  }, [initialData]);

  const isDirty = useMemo(() => {
    if (!initialPreferenceObj) return true;
    try {
      return JSON.stringify(currentPreferenceObj) !== JSON.stringify(initialPreferenceObj);
    } catch {
      return true;
    }
  }, [currentPreferenceObj, initialPreferenceObj]);

  const step1ValidationMessage = useMemo(() => {
    const weightValue = Number(weight);
    if (!Number.isFinite(weightValue) || weightValue <= 0) {
      return "Please enter a valid weight.";
    }
    const heightValue = Number(height);
    if (!Number.isFinite(heightValue) || heightValue <= 0) {
      return "Please enter a valid height.";
    }
    const breakValue = Number(breakDuration);
    if (!Number.isFinite(breakValue) || breakValue <= 0 || breakValue > 12) {
      return "Break duration must be between 1 and 12 hours.";
    }
    if (workingDays.length === 0) {
      return "Select at least one working day.";
    }
    if (clockInTime.getTime() === clockOutTime.getTime()) {
      return "Clock-in and clock-out times cannot be the same.";
    }
    return null;
  }, [weight, height, breakDuration, workingDays.length, clockInTime, clockOutTime]);

  const handleNext = () => {
    if (step1ValidationMessage) {
      Alert.alert("Invalid form", step1ValidationMessage);
      return;
    }
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleSubmit = async () => {
    if (step1ValidationMessage) {
      Alert.alert("Invalid form", step1ValidationMessage);
      return;
    }
    if (!selectedMethod) {
      Alert.alert("Select a method", "Please choose a break method.");
      return;
    }
    setSubmitting(true);
    try {
      const userData = await getUserData();
      const preferenceObj = {
        age: ageRange,
        weight: `${weight} lb`,
        height: `${height} cm`,
        career_type: careerType,
        working_hour: {
          "clock-in_time": formatTime(clockInTime),
          "clock-out_time": formatTime(clockOutTime),
          "break_time": `${breakDuration} Hr`,
        },
        working_days: workingDays,
        health_condition: healthConditions.trim(),
        break_method: selectedMethod,
      };
      const preferenceStr = JSON.stringify(preferenceObj);
      let storedPreference = preferenceStr;
      let storedUuid: string | null = null;
      if (userData?.uuid) {
        const updated = await userService.updateUserPreferences(userData.uuid, {
          preference: preferenceStr,
        });
        if (updated?.preference) {
          storedPreference = updated.preference;
        }
        storedUuid = updated?.uuid ?? null;
      }
      const updatedPrefs = { preference: storedPreference, uuid: storedUuid };
      await setUserPreferences(updatedPrefs);
      onComplete(updatedPrefs);
      setStep(1);
    } catch {
      Alert.alert("Update failed", "Unable to save preferences. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const navigateMethod = (direction: "left" | "right") => {
    if (direction === "left") {
      setSelectedMethodIndex((prev) =>
        prev === 0 ? BREAK_METHODS.length - 1 : prev - 1
      );
    } else {
      setSelectedMethodIndex((prev) =>
        prev === BREAK_METHODS.length - 1 ? 0 : prev + 1
      );
    }
  };

  const selectMethod = (methodId: string) => {
    setSelectedMethod(methodId);
  };

  const renderDropdownModal = (
    show: boolean,
    onClose: () => void,
    options: string[],
    onSelect: (value: string) => void,
    title: string
  ) => (
    <Modal visible={show} transparent animationType="fade">
      <TouchableOpacity
        style={styles.dropdownOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.dropdownModal}>
          <Text style={styles.dropdownTitle}>{title}</Text>
          <ScrollView style={styles.dropdownScroll}>
            {options.map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.dropdownItem}
                onPress={() => {
                  onSelect(option);
                  onClose();
                }}
              >
                <Text style={styles.dropdownItemText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderStep1 = () => (
    <ScrollView
      style={styles.stepContent}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.stepContentContainer}
    >
      {/* Title */}
      <Text style={styles.modalTitle}>Personal Preferences</Text>
      <Text style={styles.modalSubtitle}>Fill Personal Preferences Here</Text>

      {/* Age Range, Weight, Height Row */}
      <View style={styles.row}>
        <View style={styles.column}>
          <Text style={styles.label}>Age Range</Text>
          <TouchableOpacity
            style={styles.inputBox}
            onPress={() => setShowAgeDropdown(true)}
          >
            <Text style={styles.inputText}>{ageRange}</Text>
            <Ionicons name="chevron-down" size={16} color="#888" />
          </TouchableOpacity>
        </View>

        <View style={styles.column}>
          <Text style={styles.label}>Weight</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.textInput}
              value={weight}
              onChangeText={(value) => setWeight(sanitizeDigits(value))}
              keyboardType="numeric"
            />
            <Text style={styles.unitText}>lb</Text>
          </View>
        </View>

        <View style={styles.column}>
          <Text style={styles.label}>Height</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.textInput}
              value={height}
              onChangeText={(value) => setHeight(sanitizeDigits(value))}
              keyboardType="numeric"
            />
            <Text style={styles.unitText}>cm</Text>
          </View>
        </View>
      </View>

      {/* Career Type */}
      <View style={styles.section}>
        <Text style={styles.label}>Career Type</Text>
        <TouchableOpacity
          style={styles.fullInputBox}
          onPress={() => setShowCareerDropdown(true)}
        >
          <Text style={styles.inputText}>{careerType}</Text>
          <Ionicons name="chevron-down" size={20} color="#888" />
        </TouchableOpacity>
      </View>

      {/* Work Hours */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Work Hours</Text>
        <View style={styles.row}>
          <View style={styles.column}>
            <Text style={styles.label}>Clock-In Time</Text>
            <TouchableOpacity
              style={styles.inputBox}
              onPress={() => setShowClockInPicker(true)}
            >
              <Text style={styles.inputText}>{formatTime(clockInTime)}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.column}>
            <Text style={styles.label}>Clock-Out Time</Text>
            <TouchableOpacity
              style={styles.inputBox}
              onPress={() => setShowClockOutPicker(true)}
            >
              <Text style={styles.inputText}>{formatTime(clockOutTime)}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.column}>
            <Text style={styles.label}>Break Duration</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInput}
                value={breakDuration}
                onChangeText={(value) => setBreakDuration(sanitizeDigits(value, 2))}
                keyboardType="numeric"
              />
              <Text style={styles.unitText}>Hr</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Working Days</Text>
        <View style={styles.dayChipsRow}>
          {WORKING_DAYS.map((day) => {
            const isSelected = workingDays.includes(day.id);
            return (
              <TouchableOpacity
                key={day.id}
                style={[
                  styles.dayChip,
                  isSelected && styles.dayChipSelected,
                ]}
                onPress={() => toggleWorkingDay(day.id)}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.dayChipText,
                    isSelected && styles.dayChipTextSelected,
                  ]}
                >
                  {day.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Health Conditions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Health Conditions</Text>
        <TextInput
          style={styles.healthInput}
          value={healthConditions}
          onChangeText={setHealthConditions}
          placeholder="If You Have Health Issues, Write Down Here"
          placeholderTextColor="#888"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {/* Next Button */}
      <TouchableOpacity
        style={[
          styles.nextButton,
          step1ValidationMessage && styles.nextButtonDisabled,
        ]}
        onPress={handleNext}
      >
        <Text style={styles.nextButtonText}>Next</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderStep2 = () => {
    const currentMethod = BREAK_METHODS[selectedMethodIndex];
    const isSelected = selectedMethod === currentMethod.id;
    const submitDisabled = submitting || !selectedMethod || !isDirty;

    return (
      <View style={styles.stepContent}>
        {/* Title */}
        <Text style={styles.modalTitle}>Personal Preferences</Text>
        <Text style={styles.modalSubtitle}>Choose Prefer Break Method</Text>

        {/* Break Method Card with Navigation */}
        <View style={styles.methodContainer}>
          {/* Left Arrow */}
          <TouchableOpacity
            style={styles.arrowButton}
            onPress={() => navigateMethod("left")}
          >
            <Ionicons name="chevron-back" size={32} color="#fff" />
          </TouchableOpacity>

          {/* Method Card */}
          <TouchableOpacity
            style={[
              styles.methodCard,
              isSelected
                ? styles.methodCardSelected
                : styles.methodCardUnselected,
            ]}
            onPress={() => selectMethod(currentMethod.id)}
            activeOpacity={0.8}
          >
            <Text style={styles.methodName}>{currentMethod.name}</Text>
            <View style={styles.methodPoints}>
              {currentMethod.points.map((point, index) => (
                <View key={index} style={styles.pointRow}>
                  <View style={styles.pointBullet} />
                  <Text style={styles.pointText}>{point}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>

          {/* Right Arrow */}
          <TouchableOpacity
            style={styles.arrowButton}
            onPress={() => navigateMethod("right")}
          >
            <Ionicons name="chevron-forward" size={32} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Back and Submit Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.submitButton,
              submitDisabled && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={submitDisabled}
          >
            {submitting ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.submitButtonText}>Submitting...</Text>
              </View>
            ) : (
              <Text style={styles.submitButtonText}>Submit</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (!visible) return null;

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {allowClose && (
              <View style={styles.closeRow}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => {
                    if (onClose) onClose();
                  }}
                >
                  <Ionicons name="close-outline" size={26} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
            {step === 1 ? renderStep1() : renderStep2()}
          </View>
        </View>
      </Modal>

      {/* Dropdown Modals - Outside main modal */}
      {renderDropdownModal(
        showAgeDropdown,
        () => setShowAgeDropdown(false),
        AGE_RANGES,
        setAgeRange,
        "Select Age Range"
      )}
      {renderDropdownModal(
        showCareerDropdown,
        () => setShowCareerDropdown(false),
        CAREER_TYPES,
        setCareerType,
        "Select Career Type"
      )}

      {/* Time Pickers - Outside main modal */}
      {showClockInPicker && (
        <DateTimePicker
          value={clockInTime}
          mode="time"
          is24Hour={false}
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, date) => {
            setShowClockInPicker(Platform.OS === "ios");
            if (date) setClockInTime(date);
          }}
        />
      )}
      {showClockOutPicker && (
        <DateTimePicker
          value={clockOutTime}
          mode="time"
          is24Hour={false}
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, date) => {
            setShowClockOutPicker(Platform.OS === "ios");
            if (date) setClockOutTime(date);
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#2a2a2a",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    minHeight: "70%",
    maxHeight: "90%",
    paddingTop: 30,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  closeRow: {
    alignItems: "flex-end",
    marginBottom: 8,
  },
  closeButton: {
    padding: 6,
  },
  stepContent: {
    flexGrow: 1,
  },
  stepContentContainer: {
    paddingBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#f58220",
    textAlign: "center",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginBottom: 24,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#f58220",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  column: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: "#f58220",
    marginBottom: 6,
  },
  inputBox: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fullInputBox: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 16,
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inputText: {
    fontSize: 14,
    color: "#333",
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: "#333",
    padding: 0,
  },
  unitText: {
    fontSize: 14,
    color: "#888",
  },
  dayChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  dayChip: {
    minWidth: 52,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#f58220",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  dayChipSelected: {
    backgroundColor: "#f58220",
  },
  dayChipText: {
    fontSize: 13,
    color: "#f58220",
    fontWeight: "600",
  },
  dayChipTextSelected: {
    color: "#fff",
  },
  healthInput: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: "#333",
    minHeight: 80,
  },
  nextButton: {
    backgroundColor: "#f58220",
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  // Step 2 Styles
  methodContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginVertical: 20,
  },
  arrowButton: {
    padding: 8,
  },
  methodCard: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
  },
  methodCardUnselected: {
    borderColor: "rgba(245, 130, 32, 0.2)",
  },
  methodCardSelected: {
    borderColor: "#f58220",
  },
  methodName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#f58220",
    textAlign: "center",
    marginBottom: 16,
  },
  methodPoints: {
    gap: 12,
  },
  pointRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  pointBullet: {
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
  buttonRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 20,
  },
  backButton: {
    flex: 1,
    backgroundColor: "#f58220",
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: "center",
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  submitButton: {
    flex: 1,
    backgroundColor: "#f58220",
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  // Dropdown Modal Styles
  dropdownOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownModal: {
    backgroundColor: "#2a2a2a",
    borderRadius: 16,
    width: "80%",
    maxHeight: "60%",
    padding: 20,
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#f58220",
    marginBottom: 16,
    textAlign: "center",
  },
  dropdownScroll: {
    maxHeight: 300,
  },
  dropdownItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#3a3a3a",
  },
  dropdownItemText: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
  },
});
