import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { ScrollView } from 'react-native-virtualized-view'
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';

// Types
interface OrderItem {
  productName: string;
  quantity: number;
  price: number;
  productId: number;
  variantId: number;
}

interface Shopkeeper {
  name: string;
  contactNumber: string;
}

interface PartialPayment {
  initialAmount: number;
  remainingAmount: number;
  dueDate: string;
  paymentStatus: string;
}

interface Order {
  id: number;
  deliveryDate: string;
  totalAmount: number;
  status: string;
  shopkeeper: Shopkeeper;
  items: OrderItem[];
  partialPayment?: PartialPayment;
  paymentTerm:string
}

interface OrderItemProps {
  item: Order;
  onPress: (order: Order) => void;
}

interface PartialPaymentForm {
  initialAmount: string;
  remainingAmount: string;
  dueDate: Date;
  paymentStatus: string;
}
interface QuantityForm {
  items: {
    productName: any;
    productId: number;
    variantId?: number; // Optional for variant, depending on your logic
    quantity: number;
  }[];
}

const ORDER_STATUSES = {
  PENDING: 'Pending',
  DELIVERED: 'Delivered',
  CANCELED: 'Cancelled',
} as const;

const PAYMENT_STATUSES = {
  PENDING: 'pending',
  PARTIAL: 'partial',
  COMPLETED: 'completed',
} as const;


// Components
const OrderCard = React.memo(({ item, onPress }: OrderItemProps) => {
  const formattedDate = new Date(item.deliveryDate).toLocaleDateString();
  
  return (
    <TouchableOpacity 
      style={[styles.card, getStatusStyle(item.status)]} 
      onPress={() => onPress(item)}
    >
      <Text style={styles.orderNumber}>Order ID: #{item.id}</Text>
      <Text style={styles.orderDetail}>Shopkeeper: {item.shopkeeper.name}</Text>
      <Text style={styles.orderDetail}>Contact: {item.shopkeeper.contactNumber}</Text>
      <Text style={styles.orderDetail}>Delivery: {formattedDate}</Text>
      <Text style={[styles.orderDetail, { fontWeight: 'bold' }]}>Payment Type: {item.paymentTerm}</Text>
      <Text style={styles.orderDetail}>Amount: ₹{item.totalAmount.toLocaleString()}</Text>
      {item.partialPayment && (
  <>
    <Text style={styles.orderDetail}>Advance Amount: ₹{item.partialPayment.initialAmount.toLocaleString()}</Text>
    <Text style={styles.orderDetail}>Balance Amount: ₹{item.partialPayment.remainingAmount.toLocaleString()}</Text>
    <Text style={styles.orderDetail}>Payment Status: {item.partialPayment.paymentStatus}</Text>
  </>
)}
      
      <View style={styles.statusContainer}>
        <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
          {item.status}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const OrderItemsList = React.memo(({ items }: { items: OrderItem[] }) => (
  <ScrollView style={styles.orderDetails}>
    <Text style={styles.sectionTitle}>Order Items</Text>
    {items.map((item, index) => (
      <View key={index} style={styles.itemContainer}>
        <Text style={styles.itemText}>Product: {item.productName}</Text>
        <View style={styles.itemDetails}>
          <Text style={styles.itemText}>Qty: {item.quantity}</Text>
          <Text style={styles.itemText}>₹{item.price}</Text>
          <Text style={styles.itemTotal}>₹{(item.quantity * item.price).toLocaleString()}</Text>
        </View>
      </View>
    ))}
  </ScrollView>
));

const ConfirmationModal = React.memo(({ 
  visible, 
  status, 
  onConfirm, 
  onCancel 
}: { 
  visible: boolean;
  status: string;
  onConfirm: () => void;
  onCancel: () => void;
}) => (
  <Modal
    animationType="fade"
    transparent={true}
    visible={visible}
    onRequestClose={onCancel}
  >
    <View style={styles.modalContainer}>
      <View style={styles.confirmationContent}>
        <Text style={styles.modalTitle}>Confirm Changes</Text>
        <Text style={styles.modalDetail}>
          Are you sure you want to update the order status to {status}?
        </Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.confirmButton} onPress={onConfirm}>
            <Text style={styles.buttonText}>Confirm</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
));
const PartialPaymentForm = React.memo(({ 
  partialPayment,
  formData,
  onUpdate,
  onClose,
  loading 
}: { 
  partialPayment: PartialPayment | undefined;
  formData: PartialPaymentForm;
  onUpdate: (formData: PartialPaymentForm) => void;
  onClose: () => void;
  loading: boolean;
}) => {
  const [localFormData, setLocalFormData] = useState<PartialPaymentForm>(formData);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);

  const handleSubmit = () => {
    if (!localFormData.initialAmount || !localFormData.remainingAmount) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    onUpdate(localFormData);
  };

  return (
    <View style={styles.partialPaymentForm}>
      <View style={styles.formHeader}>
        <Text style={styles.sectionTitle}>Update Partial Payment</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <View style={styles.formField}>
        <Text style={styles.fieldLabel}>Initial Amount (₹)</Text>
        <TextInput
          style={styles.input}
          value={localFormData.initialAmount}
          onChangeText={(text) => setLocalFormData(prev => ({ ...prev, initialAmount: text }))}
          keyboardType="numeric"
          placeholder="Enter initial amount"
        />
      </View>

      <View style={styles.formField}>
        <Text style={styles.fieldLabel}>Remaining Amount (₹)</Text>
        <TextInput
          style={styles.input}
          value={localFormData.remainingAmount}
          onChangeText={(text) => setLocalFormData(prev => ({ ...prev, remainingAmount: text }))}
          keyboardType="numeric"
          placeholder="Enter remaining amount"
        />
      </View>

      <View style={styles.formField}>
        <Text style={styles.fieldLabel}>Due Date</Text>
        <TouchableOpacity
          onPress={() => setShowDueDatePicker(true)}
          style={styles.datePickerButton}
        >
          <Ionicons name="calendar" size={20} color="#007BFF" />
          <Text style={styles.dateText}>
            {localFormData.dueDate.toLocaleDateString()}
          </Text>
        </TouchableOpacity>
      </View>

      {showDueDatePicker && (
        <DateTimePicker
          value={localFormData.dueDate}
          mode="date"
          display="default"
          onChange={(_, selectedDate) => {
            setShowDueDatePicker(false);
            if (selectedDate) {
              setLocalFormData(prev => ({ ...prev, dueDate: selectedDate }));
            }
          }}
          minimumDate={new Date()}
        />
      )}

      <View style={styles.formField}>
        <Text style={styles.fieldLabel}>Payment Status</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={localFormData.paymentStatus}
            onValueChange={(value) => setLocalFormData(prev => ({ ...prev, paymentStatus: value }))}
            style={styles.picker}
          >
            {Object.entries(PAYMENT_STATUSES).map(([key, value]) => (
              <Picker.Item key={key} label={key.charAt(0) + key.slice(1).toLowerCase()} value={value} />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.formActions}>
        <TouchableOpacity
          style={[styles.cancelButton, { flex: 1 }]}
          onPress={onClose}
        >
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.updateButton, loading && styles.disabledButton, { flex: 1 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.buttonText}>Confirm Update</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
});
const QuantityForm = React.memo(({ 
  orderItem, 
  formData, 
  onUpdate, 
  onClose, 
  loading 
}: { 
  orderItem: OrderItem | undefined;
  formData: QuantityForm;
  onUpdate: (formData: QuantityForm) => void;
  onClose: () => void;
  loading: boolean;
}) => {
  const [localFormData, setLocalFormData] = useState<QuantityForm>(formData);

  // Handle quantity change for each item
  const handleQuantityChange = (index: number, newQuantity: string) => {
    const parsedQuantity = newQuantity ? parseInt(newQuantity) : 0;
  
    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      Alert.alert('Error', 'Quantity must be a positive number');
      return;
    }
  
    // Update the specific item in the form data
    const updatedItems = [...localFormData.items];
    updatedItems[index].quantity = parsedQuantity;
  
    setLocalFormData(prev => ({ ...prev, items: updatedItems }));
  };
  

  const handleSubmit = () => {
    // Ensure all items have valid quantities
    if (!localFormData.items || localFormData.items.some(item => item.quantity <= 0)) {
      Alert.alert('Error', 'Please ensure all quantities are greater than 0');
      return;
    }
    onUpdate(localFormData);  // Call the onUpdate function passed as a prop
  };

  return (
    <View style={styles.partialPaymentForm}>
      <View style={styles.formHeader}>
        <Text style={styles.sectionTitle}>Update Quantities</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {localFormData.items.map((item, index) => (
        <View key={index} style={styles.formField}>
          <Text style={styles.fieldLabel}>{`Product ${item.productName}`}</Text>

          <Text style={styles.fieldLabel}>Quantity</Text>
          <TextInput
            style={styles.input}
            value={String(item.quantity)}
            onChangeText={(text) => handleQuantityChange(index, text)}
            keyboardType="numeric"
            placeholder="Enter quantity"
          />
        </View>
      ))}

      <View style={styles.formActions}>
        <TouchableOpacity
          style={[styles.cancelButton, { flex: 1 }]}
          onPress={onClose}
        >
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.updateButton, loading && styles.disabledButton, { flex: 1 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.buttonText}>Confirm Update</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
});


const PartialPaymentConfirmationModal = React.memo(({ 
  visible, 
  onConfirm, 
  onCancel,
  loading
}: { 
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) => (
  <Modal
    animationType="fade"
    transparent={true}
    visible={visible}
    onRequestClose={onCancel}
  >
    <View style={styles.modalContainer}>
      <View style={styles.confirmationContent}>
        <Text style={styles.modalTitle}>Confirm Payment Update</Text>
        <Text style={styles.modalDetail}>
          Are you sure you want to update the partial payment details?
        </Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.confirmButton, loading && styles.disabledButton]}
            onPress={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.buttonText}>Confirm</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
));
const QuantityUpdateConfirmationModal = React.memo(({ 
  visible, 
  onConfirm, 
  onCancel, 
  loading 
}: { 
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) => (
  <Modal
    animationType="fade"
    transparent={true}
    visible={visible}
    onRequestClose={onCancel}
  >
    <View style={styles.modalContainer}>
      <View style={styles.confirmationContent}>
        <Text style={styles.modalTitle}>Confirm Quantity Update</Text>
        <Text style={styles.modalDetail}>
          Are you sure you want to update the quantity details?
        </Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.confirmButton, loading && styles.disabledButton]}
            onPress={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.buttonText}>Confirm</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
));



// Helper Functions
const getStatusColor = (status: string) => {
  const colors = {
    PENDING: '#FFA500',
    DELIVERED: '#28A745',
    CANCELED: '#DC3545',
  };
  return colors[status as keyof typeof colors] || '#000000';
};

const getStatusStyle = (status: string) => ({
  borderLeftWidth: 5,
  borderLeftColor: getStatusColor(status),
});

// Main Component
const DistributorOrdersScreen = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [status, setStatus] = useState('');
  const [updating, setUpdating] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [startPickerVisible, setStartPickerVisible] = useState(false);
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const router = useRouter();

  // Partial Payment States
  const [showPartialPaymentForm, setShowPartialPaymentForm] = useState(false);
  const [showQtyChange, setShowQtyChange] = useState(false);
  const [qtyConfirmVisible, setQtyConfirmVisible] = useState(false);
  const [partialPaymentConfirmVisible, setPartialPaymentConfirmVisible] = useState(false);
  const [partialPaymentFormData, setPartialPaymentFormData] = useState<PartialPaymentForm | null>(null);
  const [quantityFormData, setQuantityFormData] = useState<QuantityForm | null>(null);

  const handleShowPartialPayment = useCallback(() => {
    if (selectedOrder?.partialPayment) {
      setPartialPaymentFormData({
        initialAmount: selectedOrder.partialPayment.initialAmount.toString(),
        remainingAmount: selectedOrder.partialPayment.remainingAmount.toString(),
        dueDate: new Date(selectedOrder.partialPayment.dueDate),
        paymentStatus: selectedOrder.partialPayment.paymentStatus,
      });
    } else {
      setPartialPaymentFormData({
        initialAmount: '',
        remainingAmount: '',
        dueDate: new Date(),
        paymentStatus: PAYMENT_STATUSES.PENDING,
      });
    }
    setShowPartialPaymentForm(true);
  }, [selectedOrder]);

  // handle update qty change

  const handleUpdateQty = useCallback(() => {
    if (selectedOrder?.items && selectedOrder.items.length > 0) {
      console.log("selected items",selectedOrder.items);
      const updatedItems = selectedOrder.items.map((item) => ({
        productName: item.productName,
        productId: item.productId,        // Make sure productId is included
        variantId: item.variantId,        // Make sure variantId is included
        quantity: item.quantity,
        price: item.price,
      }));
  
      // Set the state to store the items to update (this can be useful for the form)
      setQuantityFormData({ items: updatedItems });
    } else {
      console.error('No items found in the order.');
    }
  
    // Show the quantity change form
    setShowQtyChange(true);
  }, [selectedOrder]);
  
  

  const handlePartialPaymentSubmit = useCallback((formData: PartialPaymentForm) => {
    setPartialPaymentFormData(formData);
    setPartialPaymentConfirmVisible(true);
  }, []);
  const handleQuantityChangeSubmit = useCallback((formData: QuantityForm) => {
    setQuantityFormData(formData);
    setQtyConfirmVisible(true);
  }, []);


  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setStartPickerVisible(false);
    if (selectedDate) {
      setStartDate(selectedDate.toISOString().split('T')[0]);
    }
  };
  const filterOrdersByDate = () => {
    if (!startDate) {
      Alert.alert('Warning', 'Please select the date.');
      return;
    }
  
    const start = new Date(startDate);
    
    // Reset the time of the start date to 00:00:00 to compare only the date part
    start.setHours(0, 0, 0, 0);
  
    const filtered = orders.filter((order) => {
      const deliveryDate = new Date(order.deliveryDate);
  
      // Reset the time of the delivery date to 00:00:00 to compare only the date part
      deliveryDate.setHours(0, 0, 0, 0);
  
      // Compare the numeric value of the date
      return deliveryDate.getTime() === start.getTime();
    });
  
    setFilteredOrders(filtered);
  };
  
  const resetFilters = () => {
    setStartDate('');
    setFilteredOrders(orders);
  };

  const handleUpdatePartialPayment = useCallback(async () => {
    if (!selectedOrder || !partialPaymentFormData) return;

    setUpdatingPayment(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.put(
        `${process.env.EXPO_PUBLIC_API_URL}/distributor/orders/${selectedOrder.id}/partial-payment`,
        {
          initialAmount: parseFloat(partialPaymentFormData.initialAmount),
          remainingAmount: parseFloat(partialPaymentFormData.remainingAmount),
          dueDate: partialPaymentFormData.dueDate.toISOString(),
          paymentStatus: partialPaymentFormData.paymentStatus,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.status === 200) {
        Alert.alert('Success', 'Partial payment updated successfully!');
        await fetchOrders();
        setShowPartialPaymentForm(false);
        setPartialPaymentConfirmVisible(false);
        setPartialPaymentFormData(null);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update partial payment');
    } finally {
      setUpdatingPayment(false);
    }
  }, [selectedOrder, partialPaymentFormData, ]);

  const fetchOrders = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(
        `${process.env.EXPO_PUBLIC_API_URL}/distributor/get-orders`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setOrders(response.data.orders); 
      setFilteredOrders(response.data.orders); // Update to response.data.orders
    } catch (error: any) {
      console.error('Failed to fetch orders:', error);
      Alert.alert(
        'Error',
        'Failed to fetch orders. Please check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleOrderPress = useCallback((order: Order) => {
    setSelectedOrder(order);
    setModalVisible(true);
    setStatus(order.status);
    setDeliveryDate(new Date(order.deliveryDate));
  }, []);

  const handleStatusChange = useCallback((selectedStatus: string) => {
    setStatus(selectedStatus);
    setConfirmationVisible(true);
  }, []);

  const handleUpdateOrder = useCallback(async () => {
    if (!selectedOrder) return;

    setUpdating(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.put(
        `${process.env.EXPO_PUBLIC_API_URL}/distributor/orders/${selectedOrder.id}`,
        {
          status,
          deliveryDate: deliveryDate.toISOString(),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.status === 200) {
        Alert.alert('Success', 'Order updated successfully!');
        await fetchOrders();
        setModalVisible(false);
        setConfirmationVisible(false);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update order');
    } finally {
      setUpdating(false);
    }
  }, [selectedOrder, status, deliveryDate, fetchOrders]);

  const handleQtyChange = useCallback(async () => {
    if (!selectedOrder || !quantityFormData) return;
  
    setUpdating(true);  // Show loading spinner or indicator
  
    // Map the items from the form data, ensuring productId, variantId, and quantity are included
    const updatedItems = quantityFormData.items.map((item) => ({
      productId: item.productId,  // Ensure this is set
      variantId: item.variantId,  // Ensure this is set
      quantity: item.quantity,    // The updated quantity from form data
    }));
  
    console.log("updatedItems", updatedItems);  // Check the items here
  
    try {
      const token = await AsyncStorage.getItem('token');
  
      const response = await axios.put(
        `${process.env.EXPO_PUBLIC_API_URL}/distributor/orders/${selectedOrder.id}`,
        {
          items: updatedItems,  // Send the updated quantities of items
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
  
      if (response.status === 200) {
        Alert.alert('Success', 'Order updated successfully!');
        await fetchOrders();  // Refresh orders after update
        setShowQtyChange(false);  // Close the modal
        setQtyConfirmVisible(false);  // Hide confirmation if applicable
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update order');
    } finally {
      setUpdating(false);  // Hide loading indicator
    }
  }, [selectedOrder, quantityFormData, fetchOrders]);
  

  // const sortedOrders = useMemo(() => {
  //   return [...orders].sort((a, b) => {
  //     // Sort by status priority (Pending > Delivered > Cancelled)
  //     const statusPriority = { PENDING: 0, DELIVERED: 1, CANCELED: 2 };
  //     const statusDiff = statusPriority[a.status as keyof typeof statusPriority] - 
  //                       statusPriority[b.status as keyof typeof statusPriority];
      
  //     if (statusDiff !== 0) return statusDiff;
      
  //     // If same status, sort by delivery date (newest first)
  //     return new Date(b.deliveryDate).getTime() - new Date(a.deliveryDate).getTime();
  //   });
  // }, [orders]);

  const renderOrderItem = useCallback(({ item }: { item: Order }) => (
    <OrderCard item={item} onPress={handleOrderPress} />
  ), [handleOrderPress]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
 
        <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.replace('/(app)/distributor/dashboard')}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Orders</Text>
        <TouchableOpacity onPress={fetchOrders} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#007BFF" />
        </TouchableOpacity>
      </View>
      <View style={styles.filterSection}>
        <View style={styles.dateContainer}>
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => setStartPickerVisible(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#007AFF" />
            <Text style={styles.dateButtonText}>
              {startDate || "Select Date"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filterButtons}>
          <TouchableOpacity 
            style={[styles.button, styles.filterButton]} 
            onPress={filterOrdersByDate}
          >
            <Ionicons name="search-outline" size={20} color="#fff" />
            <Text style={styles.buttonText}>Filter</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.resetButton]} 
            onPress={resetFilters}
          >
            <Ionicons name="refresh-outline" size={20} color="#fff" />
            <Text style={styles.buttonText}>Reset</Text>
          </TouchableOpacity>
        </View>
      </View>
      {startPickerVisible && (
        <DateTimePicker
          value={startDate ? new Date(startDate) : new Date()}
          mode="date"
          display="default"
          onChange={handleStartDateChange}
        />
      )}
      <FlatList
        data={filteredOrders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshing={loading}
        onRefresh={fetchOrders}
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Order Details</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            {selectedOrder && (
              <>
                <OrderItemsList items={selectedOrder.items} />
                <TouchableOpacity
                      style={styles.partialPaymentButton}
                      onPress={handleUpdateQty}
                    >
                      <Text style={styles.buttonText}>Update Qunatity Change</Text>
                </TouchableOpacity>

                <View style={styles.orderActions}>
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Delivery Date</Text>
                    <TouchableOpacity
                      onPress={() => setShowDatePicker(true)}
                      style={styles.datePickerButton}
                    >
                      <Ionicons name="calendar" size={20} color="#007BFF" />
                      <Text style={styles.dateText}>
                        {deliveryDate.toLocaleDateString()}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {showDatePicker && (
                    <DateTimePicker
                      value={deliveryDate}
                      mode="date"
                      display="default"
                      onChange={(_, selectedDate) => {
                        setShowDatePicker(false);
                        if (selectedDate) {
                          setDeliveryDate(selectedDate);
                        }
                      }}
                      minimumDate={new Date()}
                    />
                  )}

                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Status</Text>
                    <View style={styles.pickerWrapper}>
                      <Picker
                        selectedValue={status}
                        onValueChange={handleStatusChange}
                        style={styles.picker}
                      >
                        {Object.entries(ORDER_STATUSES).map(([key, value]) => (
                          <Picker.Item key={key} label={value} value={key} />
                        ))}
                      </Picker>
                    </View>
                  </View>

                  {selectedOrder?.partialPayment && (
                    <TouchableOpacity
                      style={styles.partialPaymentButton}
                      onPress={handleShowPartialPayment}
                    >
                      <Text style={styles.buttonText}>Update Partial Payment</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      <ConfirmationModal
        visible={confirmationVisible}
        status={ORDER_STATUSES[status as keyof typeof ORDER_STATUSES]}
        onConfirm={handleUpdateOrder}
        onCancel={() => setConfirmationVisible(false)}
      />

      {showPartialPaymentForm && partialPaymentFormData && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={showPartialPaymentForm}
          onRequestClose={() => setShowPartialPaymentForm(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <PartialPaymentForm
                partialPayment={selectedOrder?.partialPayment}
                formData={partialPaymentFormData}
                onUpdate={handlePartialPaymentSubmit}
                onClose={() => setShowPartialPaymentForm(false)}
                loading={updatingPayment}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* handle quantity */}
      {showQtyChange && quantityFormData && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={showQtyChange}
          onRequestClose={() => setShowQtyChange(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <QuantityForm
                orderItem={selectedOrder?.items[0]}
                formData={quantityFormData}
                onUpdate={handleQuantityChangeSubmit}
                onClose={() => setShowQtyChange(false)}
                loading={updating}
              />
            </View>
          </View>
        </Modal>
      )}

      <QuantityUpdateConfirmationModal
      visible={qtyConfirmVisible}
      onConfirm={handleQtyChange}
      onCancel={() => setQtyConfirmVisible(false)}
      loading={updating}
      />

      <PartialPaymentConfirmationModal
        visible={partialPaymentConfirmVisible}
        onConfirm={handleUpdatePartialPayment}
        onCancel={() => setPartialPaymentConfirmVisible(false)}
        loading={updatingPayment}
      />
    </ScrollView>
  );
};

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 16,
    paddingTop: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  listContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  orderDetail: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    width: '90%',
    maxHeight: '80%',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  confirmationContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    width: '80%',
  },
  modalDetail: {
    fontSize: 16,
    marginVertical: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  confirmButton: {
    backgroundColor: '#28A745',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#DC3545',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  updateButton: {
    backgroundColor: '#007BFF',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  disabledButton: {
    opacity: 0.7,
  },
  orderDetails: {
    maxHeight: '40%',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  itemContainer: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  itemText: {
    fontSize: 14,
    marginBottom: 4,
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  formField: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
  },
  dateText: {
    marginLeft: 8,
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  partialPaymentButton: {
    backgroundColor: '#6C757D',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  partialPaymentForm: {
    padding: 16,
  },
  orderActions: {
    borderTopWidth: 1,
    borderTopColor: '#DDD',
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  backButton: {
    padding: 8,
  },
  refreshButton: {
    padding: 8,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginLeft: 8,
  },
  filterSection: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    marginBottom: 8,
},
dateContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,

},
dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:'center',
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    flex: 0.48,
},
dateButtonText: {
    marginLeft: 8,
    color: '#333',
    fontSize: 14,
},
filterButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
},
button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    elevation: 1,
},
filterButton: {
    backgroundColor: '#007AFF',
    flex: 0.48,
},
resetButton: {
    backgroundColor: '#FF3B30',
    flex: 0.48,
},
});

export default DistributorOrdersScreen;