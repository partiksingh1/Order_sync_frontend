import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios'; // Import Axios for API requests
import { z } from 'zod';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define the distributor signup schema using zod
export const distributorSignupSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }), // Name validation
  email: z.string().email({ message: "Invalid email format" }), // Email validation
  password: z.string().min(6, { message: "Password must be at least 6 characters long" }), // Password validation
  phoneNumber: z.string().min(10, { message: "Check Phone number again" })
    .max(15, { message: "15 digit ka konsa hota h bhai" }),
  gstNumber: z.string().optional(), // GST Number validation (optional)
  pan: z.string().length(10, { message: "PAN must be exactly 10 characters long" }).optional(), // PAN validation (optional)
  address: z.string().min(1, { message: "Address is required" }), // Address validation
});

const CreateDistributor = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phoneNumber: '',
    gstNumber: '',
    pan: '',
    address: ''
  });

  const [loading, setLoading] = useState(false); // To handle loading state

  // Handle input change
  const handleInputChange = (field: string, value: string) => {
    setFormData(prevState => ({ ...prevState, [field]: value })); // Use functional updates for state
  };

  // Validate form using zod schema
  const isFormValid = () => {
    try {
      distributorSignupSchema.parse(formData); // Validate the formData against the schema
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        Alert.alert('Validation Error', error.errors[0].message); // Show validation error
      }
      return false;
    }
  };

  // Submit form
  const handleSubmit = async () => {
    if (!isFormValid()) {
      return; // Stop submission if validation fails
    }

    setLoading(true); // Set loading state to true when submitting
    try {
      const token = AsyncStorage.getItem('token')
      const response = await axios.post(`${process.env.EXPO_PUBLIC_API_URL}/admin/create-distributor`,{
        ...formData // Spread the formData object directly
      },{
        headers:{
            Authorization: `Bearer ${token}`
        }
      });

      if (response.status === 201) {
        Alert.alert('Success', 'Distributor created successfully!');
        router.back(); // Navigate back after successful creation
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false); // Set loading state back to false after request
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ScrollView to allow scrolling when the keyboard is open */}
      <ScrollView 
        contentContainerStyle={styles.inner} 
        keyboardShouldPersistTaps="handled" // Ensure taps are handled even when the keyboard is open
      >
        {/* Header with Back Button and Title */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.replace('/(app)/admin/dashboard')}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.title}>Create New Distributor</Text>
        </View>

        {/* Form Fields */}
        <View style={styles.formContainer}>
          {Object.entries(formData).map(([key, value]) => (
            <TextInput
              key={key}
              style={styles.input}
              placeholder={key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' ')} // Format placeholder text
              placeholderTextColor="#A9A9A9"
              value={value}
              onChangeText={(newValue) => handleInputChange(key, newValue)}
              secureTextEntry={key === 'password'} // Set secureTextEntry for password field
              keyboardType={key === 'email' ? 'email-address' : key === 'phoneNumber' ? 'phone-pad' : 'default'} // Set keyboard types conditionally
            />
          ))}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={loading} // Disable button when loading
          >
            <Text style={styles.submitButtonText}>{loading ? 'Submitting...' : 'Submit'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff', // Light grey background
    padding: 20,
    paddingTop:50
  },
  inner: {
    flexGrow: 1, // Allows the inner content to grow to fill the space
  },
  header: {
    flexDirection: 'row', // Align children in a row
    alignItems: 'center', // Center vertically
    marginBottom: 20,
  },
  backButton: {
    marginRight: 10, // Space between button and title
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000', // Black text
    textAlign: 'center',
    flex: 1, // Allow the title to grow and take remaining space
  },
  formContainer: {
    flex: 1,
  },
  input: {
    backgroundColor: '#FFFFFF', // White background
    borderColor: '#A9A9A9', // Grey border
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: '#000000', // Black text
    marginBottom: 15,
  },
  submitButton: {
    backgroundColor: '#9B86EC', // Purple submit button
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#FFFFFF', // White text for the button
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default CreateDistributor;
