import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";

export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  MainTabs: undefined;
};

export type MainTabParamList = {
  Settings: undefined;
  Home: undefined;
  Profile: undefined;
};

export type LoginScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Login"
>;
export type SignUpScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "SignUp"
>;
export type HomeScreenNavigationProp = BottomTabNavigationProp<
  MainTabParamList,
  "Home"
>;
export type SettingsScreenNavigationProp = BottomTabNavigationProp<
  MainTabParamList,
  "Settings"
>;
export type ProfileScreenNavigationProp = BottomTabNavigationProp<
  MainTabParamList,
  "Profile"
>;
