import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  FlatList,
  Modal,
  Button,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';


// Define types for the item, product, and form data
interface OrderItem {
    productId: string;
    quantity: number;
    variantId?: string;
    productName: string; // Added for display purposes
    price: number; // Added for display purposes
    variantName?: string; // Added for display purposes
  }

  interface OrderFormData {
    shopkeeperId: number;
    distributorId: number;
    salespersonId: number;
    deliveryDate: string;
    deliverySlot: string;
    paymentTerm: 'COD' | 'CREDIT';
    orderNote?: string;
    totalAmount: number;
    items: OrderItem[];
  }
  const TIME_SLOTS = [
    '9:00 AM - 11:00 AM',
    '11:00 AM - 1:00 PM',
    '2:00 PM - 4:00 PM',
    '4:00 PM - 6:00 PM',
  ];

interface Product {
  id: string;
  name: string; // Assuming the product has a name property
  distributorPrice: number; // Added from schema
  retailerPrice: number; // Added from schema
  variants: { id: string; variantName: string; variantValue: string; price: number }[]; //product variants
}
interface Shopkeeper {
    id: number;
    name: string;
  }
  
  interface Distributor {
    id: number;
    name: string;
  }

const CreateOrder = () => {
  const [formData, setFormData] = useState<OrderFormData>({
    shopkeeperId: 0, // Initialize as number
    distributorId: 0, // Initialize as number
    salespersonId: 0, // Initialize as number
    deliveryDate: '',
    deliverySlot: '',
    paymentTerm: 'COD', // Default value
    orderNote: '',
    totalAmount: 0, // Initialize total amount
    items: [],
  });

  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<number>(1); // Local state for item quantity
  const [shopkeepers, setShopkeepers] = useState<Shopkeeper[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof OrderFormData, string>>>({});
  const [itemModalStep, setItemModalStep] = useState<'product' | 'variant' | 'quantity'>('product');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const validateForm = () => {
    const newErrors: Partial<Record<keyof OrderFormData, string>> = {};
  
    if (formData.shopkeeperId === 0) {
      newErrors.shopkeeperId = 'Please select a shopkeeper';
    }
    if (formData.distributorId === 0) {
      newErrors.distributorId = 'Please select a distributor';
    }
    if (!formData.deliveryDate) {
      newErrors.deliveryDate = 'Please select a delivery date';
    }
    if (!formData.deliverySlot) {
      newErrors.deliverySlot = 'Please select a delivery slot';
    }
    if (formData.items.length === 0) {
      newErrors.items = 'Please add at least one item to the order';
    }
  
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0; // Return true if there are no errors
  };


  // Fetch products when the component mounts
  useEffect(() => {
    const initializeData = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const user = await AsyncStorage.getItem('user');
        const parsedUser = JSON.parse(user || '{}');
        setFormData((prev) => ({ ...prev, salespersonId: parsedUser.id }));

        const productsResponse = await axios.get(
          `${process.env.EXPO_PUBLIC_API_URL}/salesperson/get-products`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const shopkeepersResponse = await axios.get(
          `${process.env.EXPO_PUBLIC_API_URL}/salesperson/${parsedUser.id}/shops`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const distributorsResponse = await axios.get(
          `${process.env.EXPO_PUBLIC_API_URL}/salesperson/get-distributors`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setProducts(productsResponse.data);
        setShopkeepers(shopkeepersResponse.data);
        setDistributors(distributorsResponse.data);
      } catch (error) {
        Alert.alert('Error', 'Could not fetch data. Please try again later.');
        console.log(error);
      }
    };

    initializeData();
  }, []);

  // Handle input change
  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: field === 'shopkeeperId' || field === 'distributorId' ? Number(value) : value,
    }));
  };

  // Date handling
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      handleInputChange('deliveryDate', formattedDate);
    }
  };

  // Enhanced item addition flow
  const handleItemAddition = () => {
    if (!selectedProduct) return;
    
    const selectedVariantObj = selectedProduct.variants.find(
      (variant) => variant.id === selectedVariant
    );

    const price = selectedVariantObj ? selectedVariantObj.price : selectedProduct.distributorPrice;

    const newItem: OrderItem = {
      productId: selectedProduct.id,
      quantity,
      variantId: selectedVariant || undefined,
      productName: selectedProduct.name,
      price,
      variantName: selectedVariantObj?.variantName,
    };

    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
      totalAmount: prev.totalAmount + (price * quantity),
    }));

    // Reset modal state
    setModalVisible(false);
    setItemModalStep('product');
    setQuantity(1);
    setSelectedProduct(null);
    setSelectedVariant(null);
  };

  // Handle item removal
  const removeItem = (index: number) => {
    const itemToRemove = formData.items[index];
    const itemTotal = itemToRemove.quantity * itemToRemove.price; // Use price stored in item

    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
      totalAmount: prev.totalAmount - itemTotal,
    }));
  };

  // Submit form
  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fill in all required fields correctly.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.post(
        `${process.env.EXPO_PUBLIC_API_URL}/salesperson/create-order`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      Alert.alert('Success', 'Order created successfully!');
      router.replace('/salesperson/dashboard')
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Something went wrong. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  const resetForm = () => {
    setFormData({
      shopkeeperId: 0,
      distributorId: 0,
      salespersonId: formData.salespersonId, // Preserve salesperson ID
      deliveryDate: '',
      deliverySlot: '',
      paymentTerm: 'COD',
      orderNote: '',
      totalAmount: 0,
      items: [],
    });
    setErrors({});
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.inner} 
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.replace('/(app)/salesperson/dashboard')}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.title}>Create New Order</Text>
        </View>

        {/* Form Fields */}
        {/* Shopkeeper Selection */}
        <Text style={styles.label}>Shopkeeper *</Text>
        <View style={[styles.pickerContainer]}>
          <Picker
            selectedValue={formData.shopkeeperId}
            onValueChange={(value) => handleInputChange('shopkeeperId', String(value))}
          >
            <Picker.Item label="Select a shopkeeper" value={0} />
            {shopkeepers.map((shopkeeper) => (
              <Picker.Item key={shopkeeper.id} label={shopkeeper.name} value={shopkeeper.id} />
            ))}
          </Picker>
        </View>
        {errors.shopkeeperId && <Text style={styles.errorText}>{errors.shopkeeperId}</Text>}

        {/* Distributor Selection */}
        <Text style={styles.label}>Distributor *</Text>
        <View style={[styles.pickerContainer]}>
          <Picker
            selectedValue={formData.distributorId}
            onValueChange={(value) => handleInputChange('distributorId', String(value))}
          >
            <Picker.Item label="Select a distributor" value={0} />
            {distributors.map((distributor) => (
              <Picker.Item key={distributor.id} label={distributor.name} value={distributor.id} />
            ))}
          </Picker>
        </View>
       {/* Delivery Date */}
       <Text style={styles.label}>Delivery Date *</Text>
        <TouchableOpacity
          style={[styles.dateInput]}
          onPress={() => setShowDatePicker(true)}
        >
          <Text>{formData.deliveryDate || 'Select delivery date'}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={formData.deliveryDate ? new Date(formData.deliveryDate) : new Date()}
            mode="date"
            minimumDate={new Date()}
            onChange={handleDateChange}
          />
        )}
        {/* Delivery Slot */}
        <Text style={styles.label}>Delivery Slot *</Text>
        <View style={[styles.pickerContainer]}>
          <Picker
            selectedValue={formData.deliverySlot}
            onValueChange={(value) => handleInputChange('deliverySlot', value)}
          >
            <Picker.Item label="Select delivery slot" value="" />
            {TIME_SLOTS.map((slot) => (
              <Picker.Item key={slot} label={slot} value={slot} />
            ))}
          </Picker>
        </View>
        {/* Payment Terms */}
        <Text style={styles.label}>Payment Terms *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={formData.paymentTerm}
            onValueChange={(value) => handleInputChange('paymentTerm', value)}
          >
            <Picker.Item label="Cash on Delivery" value="COD" />
            <Picker.Item label="Credit" value="CREDIT" />
          </Picker>
        </View>
        {/* Order Note */}
        <Text style={styles.label}>Order Note (Optional)</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Add any special instructions or notes"
          value={formData.orderNote}
          onChangeText={(value) => handleInputChange('orderNote', value)}
          multiline
          numberOfLines={3}
        />

        {/* Items Section */}
        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>Order Items *</Text>
          {formData.items.map((item, index) => (
            <View key={index} style={styles.itemCard}>
              <View style={styles.itemDetails}>
                <Text style={styles.itemName}>{item.productName}</Text>
                {item.variantName && (
                  <Text style={styles.variantName}>Variant: {item.variantName}</Text>
                )}
                <Text style={styles.itemPrice}>
                  ${item.price} × {item.quantity} = ${(item.price * item.quantity).toFixed(2)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeItem(index)}
              >
                <Ionicons name="trash-outline" size={24} color="red" />
              </TouchableOpacity>
            </View>
          ))}
          {errors.items && <Text style={styles.errorText}>{errors.items}</Text>}
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              setModalVisible(true);
              setItemModalStep('product');
            }}
          >
            <Ionicons name="add-circle-outline" size={24} color="white" />
            <Text style={styles.addButtonText}>Add Item</Text>
          </TouchableOpacity>
        </View>

        {/* Total Amount */}
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Total Amount:</Text>
          <Text style={styles.totalAmount}>${formData.totalAmount.toFixed(2)}</Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={24} color="white" />
              <Text style={styles.submitButtonText}>Submit Order</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
      {/* Product Selection Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {itemModalStep === 'product'
                  ? 'Select Product'
                  : itemModalStep === 'variant'
                  ? 'Select Variant'
                  : 'Set Quantity'}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setModalVisible(false);
                  setItemModalStep('product');
                }}
              >
                <Ionicons name="close" size={24} color="black" />
              </TouchableOpacity>
            </View>

            {itemModalStep === 'product' && (
              <FlatList
                data={products}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.productItem}
                    onPress={() => {
                      setSelectedProduct(item);
                      if (item.variants.length > 0) {
                        setItemModalStep('variant');
                      } else {
                        setItemModalStep('quantity');
                      }
                    }}
                  >
                    <Text style={styles.productName}>{item.name}</Text>
                    <Text style={styles.productPrice}>
                      ${item.distributorPrice.toFixed(2)}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}

            {itemModalStep === 'variant' && selectedProduct && (
              <FlatList
                data={selectedProduct.variants}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.variantItem}
                    onPress={() => {
                      setSelectedVariant(item.id);
                      setItemModalStep('quantity');
                    }}
                  >
                    <Text style={styles.variantName}>
                      {item.variantName}: {item.variantValue}
                    </Text>
                    <Text style={styles.variantPrice}>
                      ${item.price.toFixed(2)}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}

            {itemModalStep === 'quantity' && (
              <View style={styles.quantityContainer}>
                <Text style={styles.quantityLabel}>Select Quantity:</Text>
                <View style={styles.quantityControls}>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                   <Ionicons name="remove" size={24} color="white" />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.quantityInput}
                    value={String(quantity)}
                    onChangeText={(value) => setQuantity(Math.max(1, parseInt(value) || 0))}
                    keyboardType="numeric"
                  />
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => setQuantity(quantity + 1)}
                  >
                    <Ionicons name="add" size={24} color="white" />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.addItemButton}
                  onPress={handleItemAddition}
                >
                  <Text style={styles.addItemButtonText}>Add to Order</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f5f5f5',
    },
    inner: {
      padding: 20,
      paddingTop: 50,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 24,
    },
    backButton: {
      padding: 8,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      flex: 1,
      textAlign: 'center',
      marginRight: 40, // Compensate for back button
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 8,
      color: '#333',
    },
    pickerContainer: {
      backgroundColor: 'white',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#ddd',
      marginBottom: 16,
      overflow: 'hidden',
    },
    dateInput: {
      backgroundColor: 'white',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#ddd',
      padding: 12,
      marginBottom: 16,
    },
    textArea: {
      backgroundColor: 'white',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#ddd',
      padding: 12,
      marginBottom: 16,
      height: 80,
      textAlignVertical: 'top',
    },
    errorBorder: {
      borderColor: '#dc3545',
    },
    errorText: {
      color: '#dc3545',
      fontSize: 14,
      marginTop: -12,
      marginBottom: 16,
    },
    itemsSection: {
      marginTop: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 16,
    },
    itemCard: {
      backgroundColor: 'white',
      borderRadius: 8,
      padding: 16,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    itemDetails: {
      flex: 1,
    },
    itemName: {
      fontSize: 16,
      fontWeight: '600',
    },
    variantName: {
      fontSize: 14,
      color: '#666',
      marginTop: 4,
    },
    itemPrice: {
      fontSize: 14,
      color: '#444',
      marginTop: 4,
    },
    removeButton: {
      padding: 8,
    },
    addButton: {
      backgroundColor: '#007bff',
      borderRadius: 8,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
    },
    addButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    totalSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: 'white',
      borderRadius: 8,
      padding: 16,
      marginVertical: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    totalLabel: {
      fontSize: 18,
      fontWeight: '600',
    },
    totalAmount: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#28a745',
    },
    submitButton: {
      backgroundColor: '#28a745',
      borderRadius: 8,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 32,
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonText: {
      color: 'white',
      fontSize: 18,
      fontWeight: 'bold',
      marginLeft: 8,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: 'white',
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
    },
    modalCloseButton: {
      padding: 8,
    },
    productItem: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
    },
    productName: {
      fontSize: 16,
      fontWeight: '600',
    },
    productPrice: {
      fontSize: 14,
      color: '#666',
      marginTop: 4,
    },
    variantPrice: {
        fontSize: 10,
        color: '#666',
        marginTop: 4,
    },
    variantItem: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
    },
    quantityContainer: {
      padding: 24,
    },
    quantityLabel: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 16,
    },
    quantityControls: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    quantityButton: {
      backgroundColor: '#007bff',
      borderRadius: 8,
      padding: 12,
    },
    quantityInput: {
      backgroundColor: 'white',
      borderWidth: 1,
      borderColor: '#ddd',
      borderRadius: 8,
      padding: 12,
      marginHorizontal: 16,
      minWidth: 80,
      textAlign: 'center',
      fontSize: 16,
    },
    addItemButton: {
      backgroundColor: '#28a745',
      borderRadius: 8,
      padding: 16,
      alignItems: 'center',
    },
    addItemButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
  });
  
  export default CreateOrder;