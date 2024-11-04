import { Image } from 'expo-image';
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
export const HomeScreen = () => {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container}>
      {/* Top Section with Logo */}
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>Needibay</Text>
      </View>

      {/* Illustration */}
      <View style={styles.illustrationContainer}>
      <Image source={require("@/assets/images/Graphic_Elements.svg")} style={{ width: 300, height: 300 }} />
      </View>

      {/* Subtitle */}
      <Text style={styles.subtitle}>Start Automating the order Tracking</Text>

      {/* Login Button */}
      <TouchableOpacity style={styles.loginButton} onPress={() => router.replace('/(auth)/login')}>
        <Text style={styles.loginButtonText} >Start</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#9B86EC', // Match the purple background color
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    marginBottom: 40,
  },
  logoText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 1.5,
  },
  illustrationContainer: {
    height: 300,
    width: 300,
    backgroundColor: 'transparent', // You would replace this with an actual image later
    marginBottom: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustrationPlaceholder: {
    fontSize: 16,
    color: 'white',
  },
  subtitle: {
    fontSize: 22,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  loginButton: {
    backgroundColor: '#D6F171', // Light green background color
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 10,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
});

export default HomeScreen;
