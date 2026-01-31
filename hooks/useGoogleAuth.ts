import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";

WebBrowser.maybeCompleteAuthSession();

// Google OAuth Client IDs
const GOOGLE_CLIENT_ID = {
  webClientId:
    "300454613037-55171do7be3s525le2n32uohra4tlmj6.apps.googleusercontent.com",
  androidClientId:
    "300454613037-fjjsvl83lk3vit4pfakgab6mhi2pjuf9.apps.googleusercontent.com",
  iosClientId: "YOUR_IOS_CLIENT_ID.apps.googleusercontent.com",
};

export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture: string;
}

export function useGoogleAuth() {
  const redirectUri = makeRedirectUri({
    scheme: "breakpoint-app",
  });

  // Log the redirect URI for debugging
  console.log("Redirect URI:", redirectUri);

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_CLIENT_ID.webClientId,
    androidClientId: GOOGLE_CLIENT_ID.androidClientId,
    iosClientId: GOOGLE_CLIENT_ID.iosClientId,
  });

  const signInWithGoogle = async () => {
    try {
      const result = await promptAsync();
      return result;
    } catch (error) {
      console.error("Google sign in error:", error);
      throw error;
    }
  };

  const getUserInfo = async (
    accessToken: string
  ): Promise<GoogleUser | null> => {
    try {
      const response = await fetch(
        "https://www.googleapis.com/userinfo/v2/me",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      const user = await response.json();
      return user;
    } catch (error) {
      console.error("Error fetching user info:", error);
      return null;
    }
  };

  return {
    request,
    response,
    signInWithGoogle,
    getUserInfo,
    isReady: !!request,
  };
}
