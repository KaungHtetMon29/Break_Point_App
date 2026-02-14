import { StyleSheet } from "react-native";
import type { Theme } from "@react-navigation/native";

// ============================================
// COLORS
// ============================================
export const colors = {
  // Primary
  primary: "#f58220",
  primaryLight: "#ff9a40",
  primaryDark: "#c56a10",

  // Background
  background: "#1a1a1a",
  backgroundLight: "#2a2a2a",
  backgroundLighter: "#3a3a3a",

  // Text
  textPrimary: "#ffffff",
  textSecondary: "#888888",
  textMuted: "#666666",

  // Status
  success: "#4CAF50",
  error: "#f44336",
  warning: "#ff9800",
  info: "#2196F3",

  // Others
  white: "#ffffff",
  black: "#000000",
  transparent: "transparent",
  overlay: "rgba(0, 0, 0, 0.5)",

  // Switch colors
  switchTrackOff: "#3a3a3a",
  switchTrackOn: "#f58220",
  switchThumbOff: "#888888",
  switchThumbOn: "#ffffff",
};

// ============================================
// TYPOGRAPHY
// ============================================
export const typography = {
  // Font sizes
  fontSize: {
    xs: 12,
    sm: 13,
    md: 14,
    base: 15,
    lg: 16,
    xl: 18,
    "2xl": 20,
    "3xl": 24,
    "4xl": 32,
    "5xl": 40,
  },

  // Font weights
  fontWeight: {
    normal: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// ============================================
// SPACING
// ============================================
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  "4xl": 48,
};

// ============================================
// BORDER RADIUS
// ============================================
export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  "2xl": 20,
  "3xl": 30,
  full: 9999,
};

// ============================================
// SHADOWS
// ============================================
export const shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
};

// ============================================
// COMMON STYLES
// ============================================
export const commonStyles = StyleSheet.create({
  // Containers
  screenContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingHorizontal: spacing.xl,
  },

  // Flex utilities
  flexRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  flexRowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  flexCenter: {
    justifyContent: "center",
    alignItems: "center",
  },

  // Text styles
  heading1: {
    fontSize: typography.fontSize["4xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  heading2: {
    fontSize: typography.fontSize["3xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  heading3: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary,
  },
  bodyText: {
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
  },
  bodyTextSecondary: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
  },
  label: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
  },
  caption: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },

  // Buttons
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  secondaryButton: {
    backgroundColor: colors.transparent,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },

  // Inputs
  input: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    color: colors.textPrimary,
    fontSize: typography.fontSize.base,
  },
  inputLabel: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },

  // Cards
  card: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.xl,
    padding: spacing.base,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: colors.backgroundLighter,
  },

  // Avatar
  avatarLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.backgroundLighter,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarMedium: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.backgroundLighter,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarSmall: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.backgroundLighter,
    justifyContent: "center",
    alignItems: "center",
  },
});

// ============================================
// TAB BAR STYLES
// ============================================
export const tabBarStyles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.backgroundLight,
    height: 60,
    paddingBottom: spacing.sm,
    paddingTop: spacing.sm,
  },
});

// ============================================
// MODAL STYLES
// ============================================
export const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: colors.backgroundLight,
    borderTopLeftRadius: borderRadius["3xl"],
    borderTopRightRadius: borderRadius["3xl"],
    paddingTop: spacing["2xl"],
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing["3xl"],
  },
  title: {
    fontSize: typography.fontSize["3xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
});

// ============================================
// THEME OBJECT (for NavigationContainer)
// ============================================
export const navigationTheme: Theme = {
  dark: true,
  colors: {
    primary: colors.primary,
    background: colors.background,
    card: colors.backgroundLight,
    text: colors.textPrimary,
    border: colors.backgroundLighter,
    notification: colors.primary,
  },
  fonts: {
    regular: {
      fontFamily: "System",
      fontWeight: "400",
    },
    medium: {
      fontFamily: "System",
      fontWeight: "500",
    },
    bold: {
      fontFamily: "System",
      fontWeight: "700",
    },
    heavy: {
      fontFamily: "System",
      fontWeight: "800",
    },
  },
};

// Default export for convenience
const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  commonStyles,
  tabBarStyles,
  modalStyles,
  navigationTheme,
};

export default theme;
