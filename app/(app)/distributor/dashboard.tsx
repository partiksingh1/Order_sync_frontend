import { Logout } from '@/components/Logout';
import { router, Stack } from 'expo-router';
import React from 'react';
import {Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, Alert } from 'react-native';

export const DistributorDashboard = () => {
  const handleButtonClick = (action: string) => {
    if (action === 'viewOrders') {
        router.replace('/(app)/distributor/order'); // Replace with the correct path to the Create Salesman screen
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Banner */}
      <Logout/>

      {/* Button Container */}
      <ScrollView contentContainerStyle={styles.buttonContainer}>
        {buttonData.map((button) => (
          <TouchableOpacity
            key={button.label}
            style={styles.button}
            onPress={() => handleButtonClick(button.action)}
          >
            <Text style={styles.buttonText}>{button.label}</Text>
            <Text style={styles.description}>{button.description}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

// Button data
const buttonData = [
    { label: 'View Orders', description: 'View all orders', action: 'viewOrders', icon: 'visibility' },
];

const styles = StyleSheet.create({
  container: {
    paddingTop: 10,
    flex: 1,
    backgroundColor: '#9B86EC', // Light purple background
  },

  buttonContainer: {
    padding: 20,
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#FFFFFF', // White button
    borderRadius: 15,
    padding: 20,
    width: '90%', // Responsive width
    marginVertical: 10,
    alignItems: 'center',
    elevation: 3, // Shadow effect for Android
  },
  buttonText: {
    fontSize: 26,
    color: '#000000', // Darker shade of purple
    marginVertical: 5,
  },
  description: {
    fontSize: 14,
    color: '#000000', // Slightly darker shade than the button text
  },
});
export default DistributorDashboard;

