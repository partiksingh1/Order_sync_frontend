import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  FlatList, 
  SafeAreaView, 
  Modal, 
  ActivityIndicator, 
  Alert,
  StatusBar,
  Dimensions,
  Pressable,
  ScrollView,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import DateTimePicker from '@react-native-community/datetimepicker';

type Order = {
  shopName: string;
  employeeName: string;
  distributorName: string;
  orderDate: string;
  contactNumber: string;
  products: { 
    productName: string; 
    quantity: number;
    variant: string;
    variantValue: string;
  }[];
  totalAmount: number;
  paymentType: string;
  deliveryDate: string;
  deliverySlot: string;
  status: string;
};

const OrderList = () => {
  const router = useRouter();
  const [startPickerVisible, setStartPickerVisible] = useState(false);
  const [endPickerVisible, setEndPickerVisible] = useState(false);
  const [ordersData, setOrdersData] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return '#FFA500';
      case 'completed':
        return '#4CAF50';
      case 'cancelled':
        return '#FF0000';
      default:
        return '#808080';
    }
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setStartPickerVisible(false);
    if (selectedDate) {
      setStartDate(selectedDate.toISOString().split('T')[0]);
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setEndPickerVisible(false);
    if (selectedDate) {
      setEndDate(selectedDate.toISOString().split('T')[0]);
    }
  };

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('No authorization token found');
      const response = await axios.get(`${process.env.EXPO_PUBLIC_API_URL}/admin/get-orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrdersData(response.data);
      setFilteredOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      Alert.alert('Error', 'Failed to fetch orders. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  }, [fetchOrders]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filterOrdersByDate = () => {
    if (!startDate || !endDate) {
      Alert.alert('Warning', 'Please select both start and end dates.');
      return;
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    const filtered = ordersData.filter((order) => {
      const orderDate = new Date(order.orderDate);
      return orderDate >= start && orderDate <= end;
    });
    setFilteredOrders(filtered);
  };

  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
    setFilteredOrders(ordersData);
  };

  const exportOrdersToXLSX = async () => {
    try {
      if (!filteredOrders.length) {
        Alert.alert('Warning', 'No orders to export.');
        return;
      }

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Error', 'Sharing is not available on this device');
        return;
      }

      const fileName = `OrderReport_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`;
      const fileUri = FileSystem.cacheDirectory + fileName;

      const worksheetData = filteredOrders.map(order => ({
        'Shop Name': order.shopName,
        'Employee Name': order.employeeName,
        'Distributor Name': order.distributorName,
        'Order Date': order.orderDate,
        'Contact Number': order.contactNumber,
        'Total Amount': order.totalAmount,
        'Payment Type': order.paymentType,
        'Delivery Date': order.deliveryDate,
        'Delivery Slot': order.deliverySlot,
        'Status': order.status,
        'Products': order.products.map(p => `${p.productName} (${p.variant}) x${p.quantity}`)
        .join(', ')
      }));

      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");

      const wbout = XLSX.write(workbook, {
        type: 'base64',
        bookType: 'xlsx'
      });

      await FileSystem.writeAsStringAsync(fileUri, wbout, {
        encoding: FileSystem.EncodingType.Base64
      });

      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Export Orders Report',
        UTI: 'com.microsoft.excel.xlsx'
      });

      await FileSystem.deleteAsync(fileUri, { idempotent: true });

    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', 'There was an error exporting the file. Please try again.');
    }
  };
  const openModal = (order: Order) => {
    setSelectedOrder(order);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedOrder(null);
  };


  const renderOrderItem = ({ item }: { item: Order }) => (
    <Pressable 
      style={({pressed}) => [
        styles.card,
        pressed && styles.cardPressed
      ]}
      onPress={() => openModal(item)}
      android_ripple={{ color: '#e0e0e0' }}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.shopName}>{item.shopName}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={16} color="#666" />
          <Text style={styles.infoText}>{item.employeeName}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="business-outline" size={16} color="#666" />
          <Text style={styles.infoText}>{item.distributorName}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color="#666" />
          <Text style={styles.infoText}>
            {new Date(item.orderDate).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="cash-outline" size={16} color="#666" />
          <Text style={styles.infoText}>
            Rs. {item.totalAmount.toFixed(2)}
          </Text>
        </View>
      </View>
    </Pressable>
  );

  const OrderDetailsModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={closeModal}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Order Details</Text>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedOrder && (
              <>
                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Shop Information</Text>
                  <Text style={styles.modalDetail}>Shop Name: {selectedOrder.shopName}</Text>
                  <Text style={styles.modalDetail}>Contact: {selectedOrder.contactNumber}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Order Information</Text>
                  <Text style={styles.modalDetail}>Employee: {selectedOrder.employeeName}</Text>
                  <Text style={styles.modalDetail}>Distributor: {selectedOrder.distributorName}</Text>
                  <Text style={styles.modalDetail}>
                    Order Date: {new Date(selectedOrder.orderDate).toLocaleString()}
                  </Text>
                  <Text style={styles.modalDetail}>Payment Type: {selectedOrder.paymentType}</Text>
                  <Text style={styles.modalDetail}>
                    Total Amount: Rs. {selectedOrder.totalAmount.toFixed(2)}
                  </Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Delivery Information</Text>
                  <Text style={styles.modalDetail}>
                    Delivery Date: {new Date(selectedOrder.deliveryDate).toLocaleString()}
                  </Text>
                  <Text style={styles.modalDetail}>Delivery Slot: {selectedOrder.deliverySlot}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedOrder.status) }]}>
                    <Text style={styles.statusText}>{selectedOrder.status}</Text>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Products</Text>
                  {selectedOrder.products.map((product, index) => (
                    <View key={index} style={styles.productItem}>
                      <Text style={styles.productName}>
                        {product.productName} ({product.variant})
                      </Text>
                      <Text style={styles.productQuantity}>x{product.quantity}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading orders...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.replace('/(app)/admin/dashboard')}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Orders</Text>
      </View>

      <View style={styles.filterSection}>
        <View style={styles.dateContainer}>
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => setStartPickerVisible(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#007AFF" />
            <Text style={styles.dateButtonText}>
              {startDate || "Start Date"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => setEndPickerVisible(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#007AFF" />
            <Text style={styles.dateButtonText}>
              {endDate || "End Date"}
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

        <TouchableOpacity 
          style={[styles.button, styles.exportButton]} 
          onPress={exportOrdersToXLSX}
        >
          <Ionicons name="download-outline" size={20} color="#fff" />
          <Text style={styles.buttonText}>Export Orders</Text>
        </TouchableOpacity>
      </View>

      {startPickerVisible && (
        <DateTimePicker
          value={startDate ? new Date(startDate) : new Date()}
          mode="date"
          display="default"
          onChange={handleStartDateChange}
        />
      )}

      {endPickerVisible && (
        <DateTimePicker
          value={endDate ? new Date(endDate) : new Date()}
          mode="date"
          display="default"
          onChange={handleEndDateChange}
        />
      )}

      <FlatList
        data={filteredOrders}
        renderItem={renderOrderItem}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />

      <OrderDetailsModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFF',
    paddingTop: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
},
header: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 20,
},
backButton: {
    marginRight: 16,
},
title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
},
filterSection: {
    backgroundColor: '#fff',
    padding: 16,
    elevation: 2,
    marginBottom: 8,
},
dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
},
dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
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
exportButton: {
    backgroundColor: '#34C759',
},
buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
},
list: {
    padding: 16,
},
card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    overflow: 'hidden',
},
cardPressed: {
    opacity: 0.7,
},
cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
},
shopName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
},
statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
},
statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
},
cardContent: {
    padding: 16,
},
infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
},
infoText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
},
modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
},
modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
},
modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
},
modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
},
closeButton: {
    padding: 8,
},
modalSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
},
sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
},
modalDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
},
productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
},
productName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
},
productQuantity: {
    fontSize: 14,
    color: '#666',
    marginLeft: 16,
}
});

export default OrderList;