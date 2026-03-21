import { useState, useEffect } from "react";
import {
  GoogleSignin,
  isSuccessResponse,
  isErrorWithCode,
  statusCodes,
  User,
} from "@react-native-google-signin/google-signin";
import { authService, clearAuthToken, getApiErrorMessage } from "../services";

// Web client ID for OAuth (used for server-side verification)
const WEB_CLIENT_ID =
  "300454613037-55171do7be3s525le2n32uohra4tlmj6.apps.googleusercontent.com";

export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture: string;
}

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: WEB_CLIENT_ID,
  offlineAccess: true,
});

export function useGoogleAuth() {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already signed in on mount
  useEffect(() => {
    checkCurrentUser();
  }, []);

  const checkCurrentUser = async () => {
    try {
      const currentUser = GoogleSignin.getCurrentUser();
      if (currentUser) {
        setUser(mapUserData(currentUser));
      }
    } catch {
    }
  };

  const mapUserData = (userData: User): GoogleUser => ({
    id: userData.user.id || "",
    email: userData.user.email || "",
    name: userData.user.name || "",
    picture: userData.user.photo || "",
  });

  const signInWithGoogle = async (): Promise<GoogleUser | null> => {
    setIsSigningIn(true);
    setError(null);

    try {
      // Check if Play Services are available (Android)
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      // Return existing user if already signed in
      if (user !== null) {
        return user;
      }

      // Sign in with Google
      const response = await GoogleSignin.signIn();

      if (isSuccessResponse(response)) {
        const userData = mapUserData(response.data as User);
        setUser(userData);
        // Send idToken to backend for verification and get JWT
        try {
          const idToken = response.data?.idToken;
          if (idToken) {
            await authService.googleAuth(idToken);
          }
        } catch (backendError) {
          setError(getApiErrorMessage(backendError));
        }

        return userData;
      } else {
        // Sign in was cancelled
        setError("Sign in was cancelled");
        return null;
      }
    } catch (err: unknown) {
      if (isErrorWithCode(err)) {
        switch (err.code) {
          case statusCodes.IN_PROGRESS:
            setError("Sign in is already in progress");
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            setError("Play Services not available");
            break;
          default:
            setError(`Sign in failed: ${err.message}`);
        }
      } else {
        setError("An unexpected error occurred");
      }
      return null;
    } finally {
      setIsSigningIn(false);
    }
  };

  const signOut = async () => {
    try {
      // Sign out from Google
      await GoogleSignin.signOut();

      // Clear backend auth token
      await clearAuthToken();

      // Try to call backend logout (optional)
      try {
        await authService.logout();
      } catch {
      }

      setUser(null);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Sign out failed. Please try again."));
    }
  };

  return {
    signInWithGoogle,
    signOut,
    user,
    error,
    isSigningIn,
    isReady: true, // Always ready with native module
  };
}
