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
  ScrollView,
} from 'react-native';
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
}

interface Shopkeeper {
  name: string;
  contactNumber: string;
}

interface Order {
  id: number;
  deliveryDate: string;
  totalAmount: number;
  status: string;
  shopkeeper: Shopkeeper;
  items: OrderItem[];
}

interface OrderItemProps {
  item: Order;
  onPress: (order: Order) => void;
}

const ORDER_STATUSES = {
  PENDING: 'Pending',
  DELIVERED: 'Delivered',
  CANCELED: 'Cancelled',
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
      <Text style={styles.orderDetail}>Amount: ₹{item.totalAmount.toLocaleString()}</Text>
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
  const router = useRouter();
  const [updating, setUpdating] = useState(false);


  const fetchOrders = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(
        `${process.env.EXPO_PUBLIC_API_URL}/distributor/get-orders`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setOrders(response.data.responseOrders);
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

  const handleUpdateOrder = useCallback(async () => {
    if (!selectedOrder) return;
  
    setUpdating(true); // Start loading
  
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.put(
        `${process.env.EXPO_PUBLIC_API_URL}/distributor/orders/${selectedOrder.id}`,
        {
          deliveryDate: deliveryDate.toISOString(),
          status,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
  
      if (response.status === 200) {
        Alert.alert('Success', 'Order updated successfully!');
        await fetchOrders();
      }
  
      setModalVisible(false);
      setConfirmationVisible(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to update order. Please try again.');
    } finally {
      setUpdating(false); // Stop loading
    }
  }, [selectedOrder, deliveryDate, status, fetchOrders]);
  

  const openModal = useCallback((order: Order) => {
    setSelectedOrder(order);
    setDeliveryDate(new Date(order.deliveryDate));
    setStatus(order.status);
    setModalVisible(true);
  }, []);

  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      // Sort by status priority and then by date
      const statusPriority = { PENDING: 0, DELIVERED: 1, CANCELED: 2 };
      const statusDiff = 
        statusPriority[a.status as keyof typeof statusPriority] - 
        statusPriority[b.status as keyof typeof statusPriority];
      
      if (statusDiff !== 0) return statusDiff;
      return new Date(b.deliveryDate).getTime() - new Date(a.deliveryDate).getTime();
    });
  }, [orders]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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

      <FlatList
        data={sortedOrders}
        renderItem={({ item }) => (
          <OrderCard item={item} onPress={openModal} />
        )}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              onPress={() => setModalVisible(false)} 
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
            
            <Text style={styles.modalTitle}>Order Details</Text>
            
            {selectedOrder && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.orderIdText}>Order #{selectedOrder.id}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
                    <Text style={styles.statusBadgeText}>{status}</Text>
                  </View>
                </View>

                <View style={styles.shopkeeperInfo}>
                  <Text style={styles.shopkeeperName}>
                    {selectedOrder.shopkeeper.name}
                  </Text>
                  <Text style={styles.shopkeeperContact}>
                    {selectedOrder.shopkeeper.contactNumber}
                  </Text>
                </View>

                <View style={styles.datePickerContainer}>
                  <Text style={styles.modalLabel}>Delivery Date</Text>
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
                      if (selectedDate) setDeliveryDate(selectedDate);
                    }}
                    minimumDate={new Date()}
                  />
                )}

                <View style={styles.statusPickerContainer}>
                  <Text style={styles.modalLabel}>Status</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker
                      selectedValue={status}
                      onValueChange={setStatus}
                      style={styles.picker}
                    >
                      {Object.entries(ORDER_STATUSES).map(([value, label]) => (
                        <Picker.Item key={value} label={label} value={value} />
                      ))}
                    </Picker>
                  </View>
                </View>

                <OrderItemsList items={selectedOrder.items} />

                <TouchableOpacity 
                  style={styles.updateButton}
                  onPress={() => setConfirmationVisible(true)}
                >
                  <Text style={styles.buttonText}>Update Order</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      <ConfirmationModal
  visible={confirmationVisible}
  status={status}
  onConfirm={handleUpdateOrder}
  onCancel={() => setConfirmationVisible(false)}
/>

{updating && (
  <Modal
    transparent={true}
    visible={updating}
    animationType="fade"
  >
    <View style={styles.modalContainer}>
      <ActivityIndicator size="large" color="#007BFF" />
      <Text style={styles.loadingText}>Updating...</Text>
    </View>
  </Modal>
)}

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
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
  list: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    color: '#1A1A1A',
  },
  orderDetail: {
    fontSize: 15,
    color: '#4A4A4A',
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
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  confirmationContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '80%',
    maxWidth: 400,
},
closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
},
modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 16,
    marginTop: 8,
},
modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
},
orderIdText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
},
statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
},
statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
},
shopkeeperInfo: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
},
shopkeeperName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
},
shopkeeperContact: {
    fontSize: 14,
    color: '#4A4A4A',
},
datePickerContainer: {
    marginBottom: 16,
},
modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
},
datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
},
dateText: {
    marginLeft: 8,
    fontSize: 15,
    color: '#1A1A1A',
},
statusPickerContainer: {
    marginBottom: 16,
},
pickerWrapper: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    overflow: 'hidden',
},
picker: {
    height: 50,
    width: '100%',
},
orderDetails: {
    maxHeight: 200,
    marginTop: 16,
},
sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
},
itemContainer: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
},
itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
},
itemText: {
    fontSize: 14,
    color: '#4A4A4A',
},
itemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
},
buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
},
updateButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
},
confirmButton: {
    flex: 1,
    backgroundColor: '#28A745',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
},
cancelButton: {
    flex: 1,
    backgroundColor: '#DC3545',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
},
buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
},
modalDetail: {
    fontSize: 16,
    color: '#4A4A4A',
    marginBottom: 16,
    textAlign: 'center',
},
loadingText: {
  fontSize: 18,
  color: '#1A1A1A',
  marginTop: 10,
},

});

export default DistributorOrdersScreen;