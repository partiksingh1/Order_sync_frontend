import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';

type Product = {
  name: string;
  retailerPrice: number;
};

type Item = {
  id: number;
  quantity: number;
  product: Product;
};

type Order = {
  id: number;
  deliveryDate: string;
  deliverySlot: string;
  totalAmount: number;
  status: string;
  items: Item[];
  shopkeeper: {
    name: string;
    contactNumber: string;
  };
};

const DistributorOrdersScreen = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [deliverySlot, setDeliverySlot] = useState('11AM-2PM');
  const [status, setStatus] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchOrders();
}, []);
  const fetchOrders = async () => {
    try {
        const token = await AsyncStorage.getItem('token');
        const response = await axios.get(`${process.env.EXPO_PUBLIC_API_URL}/distributor/get-orders`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        setOrders(response.data.responseOrders);
        setLoading(false);
    } catch (error) {
        console.error('Failed to fetch orders:', error);
        setLoading(false);
    }
};

  const openModal = (order: Order) => {
    setSelectedOrder(order);
    setDeliveryDate(new Date(order.deliveryDate));
    setDeliverySlot(order.deliverySlot);
    setStatus(order.status);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedOrder(null);
  };

  const handleConfirm = () => {
    setConfirmationVisible(true);
  };

  const handleUpdateOrder = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!selectedOrder) return;

      const response = await axios.put(
        `${process.env.EXPO_PUBLIC_API_URL}/distributor/orders/${selectedOrder.id}`,
        { deliveryDate: deliveryDate.toISOString(), deliverySlot, status },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.status === 200) {
        Alert.alert('Success', 'Order updated successfully!');
        await fetchOrders();
        router.back();
      }

      // Update the state
      const updatedOrders = orders.map((order) =>
        order.id === selectedOrder.id ? { ...order, deliveryDate: deliveryDate.toISOString(), deliverySlot, status } : order
      );
      setOrders(updatedOrders);
      closeModal();
      setConfirmationVisible(false);
    } catch (error) {
      console.error('Failed to update order:', error);
    }
  };

  const onDateChange = (event: any, selectedDate: Date | undefined) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDeliveryDate(selectedDate);
    }
  };

  const renderOrderItem = ({ item }: { item: Order }) => (
    <TouchableOpacity style={styles.card} onPress={() => openModal(item)}>
      <Text style={styles.orderNumber}>Order ID: {item.id}</Text>
      <Text style={styles.orderDetail}>Delivery Date: {item.deliveryDate}</Text>
      <Text style={styles.orderDetail}>Total Amount: Rs. {item.totalAmount}</Text>
      <Text style={styles.orderDetail}>Status: {item.status}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Back Button */}
      <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.replace('/(app)/distributor/dashboard')}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.title}>Your Orders</Text>
        </View>

      {/* Orders List */}
      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
      />

      {/* Order Details Modal */}
      {selectedOrder && (
        <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={closeModal}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="black" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Edit Order Details</Text>
              <Text style={styles.modalDetail}>Order ID: {selectedOrder.id}</Text>

              {/* Edit Delivery Date */}
              <Text style={styles.modalLabel}>Delivery Date:</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.datePickerButton}>
                <Text>{deliveryDate.toDateString()}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={deliveryDate}
                  mode="date"
                  display="default"
                  onChange={onDateChange}
                  minimumDate={new Date()}
                />
              )}

              {/* Edit Delivery Slot */}
              <Text style={styles.modalLabel}>Delivery Slot:</Text>
              <Picker selectedValue={deliverySlot} onValueChange={(itemValue) => setDeliverySlot(itemValue)}>
                <Picker.Item label="11AM-2PM" value="11AM-2PM" />
                <Picker.Item label="4PM-9PM" value="4PM-9PM" />
              </Picker>

              {/* Edit Status */}
              <Text style={styles.modalLabel}>Status:</Text>
              <Picker selectedValue={status} onValueChange={(itemValue) => setStatus(itemValue)}>
                <Picker.Item label="Pending" value="PENDING" />
                <Picker.Item label="Dispatched" value="DISPATCHED" />
                <Picker.Item label="Delivered" value="DELIVERED" />
                <Picker.Item label="Cancelled" value="CANCELED" />
              </Picker>

              <TouchableOpacity style={styles.saveButton} onPress={handleConfirm}>
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Confirmation Modal */}
      {confirmationVisible && selectedOrder && (
        <Modal animationType="slide" transparent={true} visible={confirmationVisible} onRequestClose={() => setConfirmationVisible(false)}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <TouchableOpacity onPress={() => setConfirmationVisible(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="black" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Confirm Changes</Text>
              <Text style={styles.modalDetail}>You are about to update the following details:</Text>

              <Text style={styles.modalLabel}>Delivery Date:</Text>
              <Text style={styles.modalDetail}>{deliveryDate.toDateString()}</Text>

              <Text style={styles.modalLabel}>Delivery Slot:</Text>
              <Text style={styles.modalDetail}>{deliverySlot}</Text>

              <Text style={styles.modalLabel}>Status:</Text>
              <Text style={styles.modalDetail}>{status}</Text>

              <TouchableOpacity style={styles.confirmButton} onPress={handleUpdateOrder}>
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setConfirmationVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 20,
    paddingTop: 50
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    flex: 1,
  },
  list: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  orderDetail: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 3,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    width: '80%',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  modalDetail: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 10,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
  },
  datePickerButton: {
    backgroundColor: '#EFEFEF',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  saveButton: {
    backgroundColor: '#007BFF',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmButton: {
    backgroundColor: '#28A745',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: '#DC3545',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
});

export default DistributorOrdersScreen;