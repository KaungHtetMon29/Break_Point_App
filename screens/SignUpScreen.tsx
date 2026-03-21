import { StatusBar } from "expo-status-bar";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { SignUpScreenNavigationProp } from "../types/navigation";
import { useGoogleAuth } from "../hooks/useGoogleAuth";
import {
  getUserData,
  userService,
  setUserPreferences,
  authService,
  getApiErrorMessage,
} from "../services";

type SignUpScreenProps = {
  navigation: SignUpScreenNavigationProp;
};

export default function SignUpScreen({ navigation }: SignUpScreenProps) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedName = fullName.trim();
  const trimmedPassword = password.trim();
  const trimmedConfirmPassword = confirmPassword.trim();
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
  const isPasswordValid = trimmedPassword.length >= 8;
  const canSubmit =
    !isSubmitting &&
    trimmedName.length >= 2 &&
    isEmailValid &&
    isPasswordValid &&
    trimmedConfirmPassword.length > 0;

  const { signInWithGoogle, isSigningIn, error, isReady } = useGoogleAuth();

  const handleGoogleSignUp = async () => {
    const user = await signInWithGoogle();

    if (user) {
      try {
        const userData = await getUserData();
        if (userData?.uuid) {
          try {
            const preferences = await userService.getUserPreferences(
              userData.uuid
            );
            await setUserPreferences(preferences || null);
          } catch {
          }
        }

        // Navigate to Home screen
        navigation.reset({
          index: 0,
          routes: [{ name: "MainTabs" }],
        });
      } catch {
        navigation.reset({
          index: 0,
          routes: [{ name: "MainTabs" }],
        });
      }
    } else if (error) {
      Alert.alert("Error", error);
    }
  };

  const handleSignUp = async () => {
    if (!trimmedEmail || !trimmedName || !trimmedPassword || !trimmedConfirmPassword) {
      Alert.alert("Missing info", "Please fill out all fields.");
      return;
    }
    if (!isEmailValid) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }
    if (trimmedName.length < 2) {
      Alert.alert("Invalid name", "Please enter your full name.");
      return;
    }
    if (!isPasswordValid) {
      Alert.alert("Weak password", "Password must be at least 8 characters.");
      return;
    }
    if (trimmedPassword !== trimmedConfirmPassword) {
      Alert.alert("Password mismatch", "Passwords do not match.");
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await authService.signUp({
        email: trimmedEmail,
        username: trimmedName,
        password: trimmedPassword,
      });
      navigation.reset({
        index: 0,
        routes: [{ name: "MainTabs" }],
      });
    } catch (error) {
      Alert.alert("Sign up failed", getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Section */}
          <View style={styles.headerSection}>
            <View style={styles.headerRow}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.backIcon}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Create Account</Text>
              <View style={styles.headerSpacer} />
            </View>

            <Text style={styles.letsStartTitle}>Let's Start!</Text>
          </View>

          {/* Orange Form Section */}
          <View style={styles.formSection}>
            <View style={styles.formContent}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="example@example.com"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.inputLabel}>Full name</Text>
              <TextInput
                style={styles.input}
                placeholder="Jane Doe"
                placeholderTextColor="#999"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />

              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••••••"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCorrect={false}
              />

              <Text style={styles.inputLabel}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••••••"
                placeholderTextColor="#999"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Bottom Section */}
          <View style={styles.bottomSection}>
            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>By continuing, you agree to</Text>
              <View style={styles.termsLinks}>
                <TouchableOpacity>
                  <Text style={styles.termsLink}>Terms of Use</Text>
                </TouchableOpacity>
                <Text style={styles.termsText}> and </Text>
                <TouchableOpacity>
                  <Text style={styles.termsLink}>Privacy Policy</Text>
                </TouchableOpacity>
                <Text style={styles.termsText}>.</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.signUpButton, !canSubmit && styles.signUpButtonDisabled]}
              onPress={handleSignUp}
              disabled={!canSubmit}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.signUpButtonText}>Sign Up</Text>
              )}
            </TouchableOpacity>

            <View style={styles.socialButtons}>
              <TouchableOpacity
                style={[styles.socialButton, !isReady && styles.disabledButton]}
                onPress={handleGoogleSignUp}
                disabled={!isReady || isSigningIn}
              >
                {isSigningIn ? (
                  <ActivityIndicator size="small" color="#333" />
                ) : (
                  <Text style={styles.socialIcon}>G</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialButton}>
                <Text style={styles.socialIconFb}>f</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                <Text style={styles.loginLink}>Log in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerSection: {
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 20,
    alignItems: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 30,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: {
    fontSize: 36,
    color: "#fff",
    fontWeight: "300",
  },
  headerTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: "bold",
    color: "#f58220",
    textAlign: "center",
  },
  headerSpacer: {
    width: 40,
  },
  letsStartTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#f58220",
  },
  formSection: {
    backgroundColor: "#f58220",
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 14,
  },
  formContent: {
    width: "100%",
  },
  inputLabel: {
    fontSize: 14,
    color: "#1a1a1a",
    marginBottom: 8,
    fontWeight: "500",
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
    color: "#333",
  },
  bottomSection: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    paddingHorizontal: 24,
    paddingTop: 24,
    alignItems: "center",
  },
  termsContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  termsText: {
    fontSize: 14,
    color: "#888",
  },
  termsLinks: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  termsLink: {
    fontSize: 14,
    color: "#f58220",
    fontWeight: "500",
  },
  signUpButton: {
    backgroundColor: "#f58220",
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 80,
    marginBottom: 24,
  },
  signUpButtonDisabled: {
    opacity: 0.6,
  },
  signUpButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  socialButtons: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 40,
  },
  socialButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.6,
  },
  socialIcon: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  socialIconFb: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1877f2",
  },
  loginContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  loginText: {
    fontSize: 14,
    color: "#888",
  },
  loginLink: {
    fontSize: 14,
    color: "#f58220",
    fontWeight: "500",
  },
});
