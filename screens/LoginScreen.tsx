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
import { authService } from "../services";

type LoginScreenProps = {
  navigation: LoginScreenNavigationProp;
};

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      } catch (fetchError) {
        console.error("Error fetching preferences:", fetchError);
        // Still navigate even if preferences fetch fails
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
    if (!email.trim() || !password) {
      Alert.alert("Missing info", "Please enter email and password.");
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await authService.login({ email: email.trim(), password });
      navigation.reset({
        index: 0,
        routes: [{ name: "MainTabs" }],
      });
    } catch {
      Alert.alert("Login failed", "Please check your credentials.");
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
              />

              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••••••"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              <TouchableOpacity style={styles.forgotPassword}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom Section */}
          <View style={styles.bottomSection}>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={isSubmitting}
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
                  <Text style={styles.socialIcon}>G</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialButton}>
                <Text style={styles.socialIconFb}>f</Text>
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
