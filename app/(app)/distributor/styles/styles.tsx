import { StyleSheet } from "react-native";
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
        justifyContent: 'center',
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