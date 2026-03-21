import { NavigationContainer } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, AppState, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import LoginScreen from "./screens/LoginScreen";
import SignUpScreen from "./screens/SignUpScreen";
import HomeScreen from "./screens/HomeScreen";
import SettingsScreen from "./screens/SettingsScreen";
import ProfileScreen from "./screens/ProfileScreen";
import PreferenceHistoryScreen from "./screens/PreferenceHistoryScreen";
import { RootStackParamList, MainTabParamList } from "./types/navigation";
import { colors, tabBarStyles, navigationTheme } from "./theme";
import { clearAuthToken, getAuthToken, isTokenExpired, userService } from "./services";
import { StripeProvider } from '@stripe/stripe-react-native';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      backBehavior="history"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: tabBarStyles.tabBar,
        tabBarShowLabel: false,
        tabBarIcon: ({ focused }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === "Settings") {
            iconName = focused ? "settings" : "settings-outline";
          } else if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else {
            iconName = focused ? "person" : "person-outline";
          }

          return (
            <Ionicons
              name={iconName}
              size={26}
              color={focused ? colors.primary : colors.textSecondary}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Settings" component={SettingsScreen} />
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const fetchPublishableKey = async () => {
    try {
      const storedKey = await userService.getStoredStripePublishableKey();
      if (storedKey) {
        setPublishableKey(storedKey);
      }
      const key = await userService.getStripePublishableKey();
      setPublishableKey(key.stripe_key);
    } catch {
    }
  };
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>(
    "Login"
  );
  const [isBooting, setIsBooting] = useState(true);
  useEffect(() => {
    fetchPublishableKey();
  }, []);

  useEffect(() => {
    const syncQueuedRequests = async () => {
      const token = await getAuthToken();
      if (!token) return;
      await userService.syncOfflineQueue();
    };
    void syncQueuedRequests();
    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextState) => {
        if (nextState === "active") {
          void syncQueuedRequests();
        }
      }
    );
    const interval = setInterval(() => {
      void syncQueuedRequests();
    }, 30000);
    return () => {
      appStateSubscription.remove();
      clearInterval(interval);
    };
  }, []);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const token = await getAuthToken();
        if (!token) {
          if (!active) return;
          setInitialRoute("Login");
          return;
        }
        const expired = await isTokenExpired();
        if (expired) {
          await clearAuthToken();
          if (!active) return;
          setInitialRoute("Login");
        } else {
          if (!active) return;
          setInitialRoute("MainTabs");
        }
      } catch {
        if (!active) return;
        setInitialRoute("Login");
      } finally {
        if (active) {
          setIsBooting(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  if (isBooting) {
    return (
      <SafeAreaProvider style={{ backgroundColor: colors.background }}>
        <View
          style={{
            flex: 1,
            backgroundColor: colors.background,
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
          }}
        >
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
            Loading app...
          </Text>
        </View>
      </SafeAreaProvider>
    );
  }

  const appTree = (
    <SafeAreaProvider style={{ backgroundColor: colors.background }}>
      <NavigationContainer theme={navigationTheme}>
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{
            headerShown: false,
            animation: "fade",
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen
            name="PreferenceHistory"
            component={PreferenceHistoryScreen}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );

  if (publishableKey) {
    return <StripeProvider publishableKey={publishableKey}>{appTree}</StripeProvider>;
  }

  return appTree;
}
