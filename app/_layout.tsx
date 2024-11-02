import { AuthProvider, useAuth } from "@/context/authContext"; // Ensure you import useAuth
import { Slot, Stack } from "expo-router";
import React from "react";
import { Text } from "react-native";

const RootLayoutContent = () => {
  const { isLoading, user } = useAuth();

  // Show a loading indicator or the login screen while checking auth state
  if (isLoading) {
    return <Text>Loading...</Text>; // You can replace this with a spinner or loading component
  }

  // Determine the appropriate screen based on user role
  let screenName;
  if (user) {
    switch (user.role) {
      case "ADMIN":
        screenName = "(app)/admin/dashboard";
        break;
      case "SALESPERSON":
        screenName = "(app)/salesperson/dashboard";
        break;
      case "DISTRIBUTOR":
        screenName = "(app)/distributor/dashboard";
        break;
      default:
        screenName = "(auth)/login"; // Fallback in case of an unknown role
    }
  } else {
    screenName = "(auth)/login"; // No user means redirect to login
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name={screenName} />
    </Stack>
  );
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutContent />
    </AuthProvider>
  );
}
