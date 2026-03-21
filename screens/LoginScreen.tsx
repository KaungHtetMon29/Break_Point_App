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
import { LoginScreenNavigationProp } from "../types/navigation";
import { useGoogleAuth } from "../hooks/useGoogleAuth";
import { authService, getApiErrorMessage } from "../services";

type LoginScreenProps = {
  navigation: LoginScreenNavigationProp;
};

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedPassword = password.trim();
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
  const loginDisabled = isSubmitting || !isEmailValid || trimmedPassword.length === 0;

  const { signInWithGoogle, isSigningIn, error, isReady } = useGoogleAuth();

  const handleGoogleSignIn = async () => {
    const user = await signInWithGoogle();

    if (user) {
      try {
        // After signin, token/userdata/subscription/preference are stored by authService.googleAuth

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

  const handleLogin = async () => {
    if (!trimmedEmail || !trimmedPassword) {
      Alert.alert("Missing info", "Please enter email and password.");
      return;
    }
    if (!isEmailValid) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await authService.login({ email: trimmedEmail, password: trimmedPassword });
      navigation.reset({
        index: 0,
        routes: [{ name: "MainTabs" }],
      });
    } catch (error) {
      Alert.alert(
        "Login failed",
        getApiErrorMessage(error, "Please check your credentials.")
      );
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
            <Text style={styles.headerTitle}>Log In</Text>

            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeTitle}>Welcome</Text>
              <Text style={styles.welcomeDescription}>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
                eiusmod tempor incididunt ut labore et dolore magna aliqua.
              </Text>
            </View>
          </View>

          {/* Orange Form Section */}
          <View style={styles.formSection}>
            <View style={styles.formContent}>
              <Text style={styles.inputLabel}>Username or email</Text>
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

              <TouchableOpacity style={styles.forgotPassword}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom Section */}
          <View style={styles.bottomSection}>
            <TouchableOpacity
              style={[styles.loginButton, loginDisabled && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loginDisabled}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>Log In</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.orText}>or sign up with</Text>

            <View style={styles.socialButtons}>
              <TouchableOpacity
                style={[styles.socialButton, !isReady && styles.disabledButton]}
                onPress={handleGoogleSignIn}
                disabled={!isReady || isSigningIn}
              >
                {isSigningIn ? (
                  <ActivityIndicator size="small" color="#333" />
                ) : (
                  <Text style={styles.socialText}>Login with Google</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.signUpContainer}>
              <Text style={styles.signUpText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("SignUp")}>
                <Text style={styles.signUpLink}>Sign Up</Text>
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
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 30,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#f58220",
    marginBottom: 40,
  },
  welcomeContainer: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#f58220",
    marginBottom: 16,
  },
  welcomeDescription: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    lineHeight: 22,
  },
  formSection: {
    backgroundColor: "#f58220",
    paddingTop: 30,
    paddingHorizontal: 24,
    paddingBottom: 20,
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
  forgotPassword: {
    alignSelf: "flex-end",
    marginTop: 4,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: "#1a1a1a",
    fontWeight: "500",
  },
  bottomSection: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    paddingHorizontal: 24,
    paddingTop: 40,
    alignItems: "center",
  },
  loginButton: {
    backgroundColor: "#f58220",
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 80,
    marginBottom: 24,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  orText: {
    fontSize: 14,
    color: "#888",
    marginBottom: 20,
  },
  socialButtons: {
    width: "100%",
    alignItems: "center",
    marginBottom: 32,
  },
  socialButton: {
    borderRadius: 25,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: "100%",
    maxWidth: 280,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.6,
  },
  socialText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  signUpContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  signUpText: {
    fontSize: 14,
    color: "#888",
  },
  signUpLink: {
    fontSize: 14,
    color: "#f58220",
    fontWeight: "500",
  },
});
