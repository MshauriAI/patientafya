import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  StatusBar,
  Modal,
  TextInput,
  Keyboard,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { format } from 'date-fns';

// Get screen dimensions for responsiveness
const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 375;

const toastConfig = {
  success: (props) => (
    <View style={[styles.toastContainer, { backgroundColor: 'rgba(16, 185, 129, 0.95)' }]}>
      <Ionicons name="checkmark-circle" size={22} color="#fff" style={{ marginRight: 8 }} />
      <View>
        <Text style={styles.toastTitle}>{props.text1}</Text>
        {props.text2 && <Text style={styles.toastMessage}>{props.text2}</Text>}
      </View>
    </View>
  ),
  error: (props) => (
    <View style={[styles.toastContainer, { backgroundColor: 'rgba(239, 68, 68, 0.95)' }]}>
      <Ionicons name="alert-circle" size={22} color="#fff" style={{ marginRight: 8 }} />
      <View>
        <Text style={styles.toastTitle}>{props.text1}</Text>
        {props.text2 && <Text style={styles.toastMessage}>{props.text2}</Text>}
      </View>
    </View>
  ),
};

// Transaction item component
const TransactionItem = ({ transaction }) => {
  // Determine if transaction is a deposit or withdrawal
  const isDeposit = transaction.destination === 'Wallet';
  
  // Format transaction date
  const formattedDate = format(new Date(transaction.transaction_time), 'MMM d, yyyy • h:mm a');
  
  // Determine status color
  const getStatusColor = (status) => {
    switch(status) {
      case 'COMPLETED':
        return '#22c55e'; // green
      case 'PENDING':
        return '#f59e0b'; // amber
      case 'FAILED':
        return '#ef4444'; // red
      default:
        return '#9ca3af'; // gray
    }
  };
  
  // Icons based on transaction type
  const getTransactionIcon = () => {
    if (isDeposit) {
      return 'arrow-down-circle';
    } else {
      return 'arrow-up-circle';
    }
  };
  
  const getChannelIcon = (channel) => {
    switch(channel) {
      case 'BANK_TRANSFER':
        return 'card';
      case 'MOBILE_MONEY':
        return 'phone-portrait';
      case 'CASH':
        return 'cash';
      default:
        return 'wallet';
    }
  };

  return (
    <View style={styles.transactionItem}>
      <View style={[styles.iconContainer, {
        backgroundColor: isDeposit ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)'
      }]}>
        <Ionicons 
          name={getTransactionIcon()} 
          size={22} 
          color={isDeposit ? '#22c55e' : '#ef4444'} 
        />
      </View>
      
      <View style={styles.detailsContainer}>
        <View style={styles.row}>
          <Text style={styles.type}>
            {isDeposit ? 'Deposit' : 'Withdrawal'}
          </Text>
          <Text style={[styles.amount, isDeposit ? styles.depositAmount : styles.depositAmount]}>
            {isDeposit ? '+' : '-'} KSH {parseFloat(transaction.amount).toLocaleString()}
          </Text>
        </View>
        
        <View style={styles.row}>
          <Text style={styles.source}>
            {isDeposit ? `From: ${transaction.source}` : `To: ${transaction.destination}`}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(transaction.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(transaction.status) }]}>
              {transaction.status}
            </Text>
          </View>
        </View>
        
        {transaction.receipt_no && (
          <Text style={styles.comment} numberOfLines={1}>
            Receipt Number: {transaction.receipt_no}
          </Text>
        )}
        
        <View style={styles.footer}>
          <Text style={styles.date}>{formattedDate}</Text>
          <View style={styles.channelContainer}>
            <Ionicons name={getChannelIcon(transaction.channel)} size={14} color="#6b7280" />
            <Text style={styles.channel}>{transaction.channel.replace(/_/g, ' ')}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default function WalletScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const [walletData, setWalletData] = useState({
    balance: 0,
    currency: 'KSH',
  });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [depositModalVisible, setDepositModalVisible] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [authToken, setAuthToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [user, setUser] = useState({ name: '' });

  // Load custom fonts
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  // Set navigation options
  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, []);

  // Get auth token and user info
  useEffect(() => {
    const getAuthData = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        
        if (!token) {
          console.error('No access token found');
          Toast.show({
            type: 'error',
            text1: 'Authentication Error',
            text2: 'Please log in again',
            position: 'bottom'
          });
          setTimeout(() => router.back(), 0);
          return;
        }

        setAuthToken(token);
        
        // Fetch profile data to get user ID
        const profileResponse = await fetch(
          'https://api.afyamkononi.co.ke/api/v1.0/profile',
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (!profileResponse.ok) {
          throw new Error('Failed to fetch profile');
        }
        
        const profileData = await profileResponse.json();
        const patientId = profileData.id || profileData.user_id;
        
        if (!patientId) {
          throw new Error('User ID not found in profile');
        }
        
        setUserId(patientId);
        setPhoneNumber(profileData.phone_number || '');
        fetchWalletData(token, profileData.phone_number);
      } catch (error) {
        console.error('Error getting auth data', error);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: error.message || 'Failed to load wallet data',
        });
      }
    };

    getAuthData();
  }, []);

  // Fetch wallet data and transactions
  const fetchWalletData = async (token, phoneNumber) => {
    try {
      setLoading(true);
      
      // Fetch wallet balance
      const balanceResponse = await fetch(
        `https://api.afyamkononi.co.ke/api/v1.0/wallet/balance?phone_number=${phoneNumber}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Fetch transactions
      const transactionsResponse = await fetch(
        `https://api.afyamkononi.co.ke/api/v1.0/wallet/transactions?phone_number=${phoneNumber}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Update state with fetched data
      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        if (balanceData && balanceData.balance) {
          setWalletData({
            balance: balanceData.balance || 0,
            currency: balanceData.currency || 'KSH',
          });
        } else {
          setWalletData({
            balance: 0,
            currency: 'KSH',
          });
        }
      }

      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        if (transactionsData) {
          setTransactions(transactionsData || []);
        } else {
          setTransactions([]);
        }
      } else {
        setTransactions([]);
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error);
      setWalletData({
        balance: 0,
        currency: 'KSH',
      });
      setTransactions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    if (authToken && userId) {
      fetchWalletData(authToken, phoneNumber);
    } else {
      setRefreshing(false);
    }
  };

  // Handle withdrawal submission
  const handleDeposit = async () => {
    // Validate input
    if (!depositAmount || isNaN(parseFloat(depositAmount)) || parseFloat(depositAmount) <= 0) {
      showToast('error', 'Please enter a valid amount');
      return;
    }

    if (!phoneNumber) {
      showToast('error', 'Please enter your phone number');
      return;
    }

    try {
      setSubmitting(true);
      
      const response = await fetch(
        `https://api.afyamkononi.co.ke/api/v1.0/stk-push`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            Amount: parseFloat(depositAmount),
            PhoneNumber: phoneNumber,
            PartyA: phoneNumber
          }),
        }
      );

      const data = await response.json();
      
      if (response.ok && data.success) {
        showToast('success', 'Deposit request submitted successfully');
        setDepositModalVisible(false);
        setDepositAmount('');
        
        // Refresh wallet data
        fetchWalletData(authToken, phoneNumber);
      } else {
        showToast('error', data.message || 'Failed to process deposit');
      }
    } catch (error) {
      console.error('Withdrawal error:', error);
      showToast('error', error.message || 'Failed to process deposit');
    } finally {
      setSubmitting(false);
    }
  };

  // Toast message helper
  const showToast = (type, message) => {
    Toast.show({
      type,
      text1: type === 'error' ? 'Error' : 'Success',
      text2: message,
      visibilityTime: 3000,
      position: 'bottom',
    });
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={22} color="#0ea5e9" />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>My Wallet</Text>
              <Text style={styles.headerSubtitle}>Manage your earnings</Text>
            </View>
          </View>

          {/* Balance Card */}
          <View style={styles.balanceCard}>
            <LinearGradient
              colors={['#0ea5e9', '#38bdf8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.balanceGradient}
            >
              <View style={styles.balanceContent}>
                <View style={styles.balanceHeader}>
                  <Text style={styles.balanceLabel}>Current Balance</Text>
                  <TouchableOpacity 
                    onPress={onRefresh}
                    disabled={loading || refreshing}
                    style={styles.refreshButton}
                  >
                    <Ionicons 
                      name="refresh" 
                      size={20} 
                      color="#ffffff" 
                      style={refreshing ? styles.refreshingIcon : {}}
                    />
                  </TouchableOpacity>
                </View>
                
                {loading ? (
                  <ActivityIndicator size="large" color="#ffffff" style={styles.loadingIndicator} />
                ) : (
                  <Text style={styles.balanceAmount}>
                    {walletData.currency} {walletData.balance.toLocaleString()}
                  </Text>
                )}
                
                <TouchableOpacity
                  style={styles.withdrawButton}
                  onPress={() => setDepositModalVisible(true)}
                >
                  <View style={styles.withdrawButtonContent}>
                    <Ionicons name="cash-outline" size={20} color="#0ea5e9" style={styles.buttonIcon} />
                    <Text style={styles.withdrawButtonText}>Deposit Funds</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>

          {/* Transactions List */}
          <View style={styles.transactionsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Transaction History</Text>
              {transactions.length > 0 && (
                <Text style={styles.transactionCount}>
                  {transactions.length} {transactions.length === 1 ? 'transaction' : 'transactions'}
                </Text>
              )}
            </View>
            
            {loading && transactions.length === 0 ? (
              <View style={styles.loadingTransactions}>
                <ActivityIndicator size="large" color="#0ea5e9" />
                <Text style={styles.loadingText}>Loading transactions...</Text>
              </View>
            ) : transactions.length === 0 ? (
              <View style={styles.emptyTransactions}>
                <View style={styles.emptyIconContainer}>
                  <Ionicons name="receipt-outline" size={64} color="rgba(0, 0, 0, 0.2)" />
                </View>
                <Text style={styles.emptyTransactionsTitle}>No Transactions Yet</Text>
                <Text style={styles.emptyTransactionsText}>
                  Your transaction history will appear here once you start receiving payments
                </Text>
              </View>
            ) : (
              <FlatList
                data={transactions}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => <TransactionItem transaction={item} />}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.transactionsList}
                refreshControl={
                  <RefreshControl 
                    refreshing={refreshing} 
                    onRefresh={onRefresh} 
                    tintColor="#0ea5e9" 
                    colors={["#0ea5e9"]}
                  />
                }
              />
            )}
          </View>
        </View>
      </SafeAreaView>

      {/* Withdrawal Modal */}
      <Modal
        visible={depositModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDepositModalVisible(false)}
      >
        {/* <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}> */}
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Deposit Funds</Text>
                  <TouchableOpacity
                    onPress={() => setDepositModalVisible(false)}
                    style={styles.modalCloseButton}
                  >
                    <Ionicons name="close" size={24} color="#0ea5e9" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.modalBody}>
                  {/* Available Balance */}
                  <View style={styles.availableBalanceContainer}>
                    <Text style={styles.availableBalanceLabel}>Available Balance</Text>
                    <Text style={styles.availableBalanceAmount}>
                      {walletData.currency} {walletData.balance.toLocaleString()}
                    </Text>
                  </View>
                  
                  {/* Form Fields */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Deposit Amount</Text>
                    <View style={styles.inputContainer}>
                      <View style={styles.inputIconContainer}>
                        <Ionicons name="cash" size={18} color="#0ea5e9" />
                      </View>
                      <TextInput
                        placeholder="Enter amount"
                        placeholderTextColor="#9ca3af"
                        value={depositAmount}
                        onChangeText={setDepositAmount}
                        keyboardType="numeric"
                        style={styles.input}
                      />
                    </View>
                  </View>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Phone Number</Text>
                    <View style={styles.inputContainer}>
                      <View style={styles.inputIconContainer}>
                        <Ionicons name="phone-portrait" size={18} color="#0ea5e9" />
                      </View>
                      <TextInput
                        placeholder="Enter phone number"
                        placeholderTextColor="#9ca3af"
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                        keyboardType="phone-pad"
                        style={styles.input}
                        editable={false}
                      />
                    </View>
                  </View>
                  
                  {/* Submit Button */}
                  <TouchableOpacity
                    style={[styles.submitButton, submitting && styles.disabledButton]}
                    onPress={handleDeposit}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.submitButtonText}>DEPOSIT</Text>
                    )}
                  </TouchableOpacity>
                  
                  {/* Note */}
                  {/* <View style={styles.noteContainer}>
                    <Ionicons name="information-circle" size={16} color="#6b7280" />
                    <Text style={styles.noteText}>
                      Withdrawals are typically processed within 1-3 business days.
                    </Text>
                  </View> */}
                </View>
              </View>
            </View>
          </View>
        {/* </TouchableWithoutFeedback> */}
      </Modal>

      <Toast config={toastConfig} />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 24,
    color: '#1e293b',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: '#64748b',
  },
  
  // Balance Card
  balanceCard: {
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  balanceGradient: {
    borderRadius: 20,
  },
  balanceContent: {
    padding: 24,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 16,
    color: '#FFFFFF',
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshingIcon: {
    transform: [{ rotate: '45deg' }],
  },
  balanceAmount: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 36,
    color: '#FFFFFF',
    marginVertical: 20,
  },
  withdrawButton: {
    height: 50,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  withdrawButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  buttonIcon: {
    marginRight: 8,
  },
  withdrawButtonText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#0ea5e9',
  },
  
  // Transactions Section
  transactionsSection: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: '#1e293b',
  },
  transactionCount: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: '#64748b',
  },
  transactionsList: {
    paddingBottom: 20,
  },
  loadingTransactions: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 16,
    color: '#64748b',
    marginTop: 16,
  },
  emptyTransactions: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTransactionsTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: '#1e293b',
    marginBottom: 8,
  },
  emptyTransactionsText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    maxWidth: '70%',
  },
  
  // Transaction Item
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailsContainer: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  type: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#1e293b',
  },
  amount: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
  },
  depositAmount: {
    color: '#22c55e',
  },
  depositAmount: {
    color: '#ef4444',
  },
  source: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: '#64748b',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
  },
  comment: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  date: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#64748b',
  },
  channelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  channel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#64748b',
    marginLeft: 4,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 22,
    color: '#1e293b',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    paddingTop: 10,
  },
availableBalanceContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  availableBalanceLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  availableBalanceAmount: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 24,
    color: '#1e293b',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: '#1e293b',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    height: 50,
    backgroundColor: '#f8fafc',
  },
  inputIconContainer: {
    paddingHorizontal: 12,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
  },
  input: {
    flex: 1,
    height: '100%',
    fontFamily: 'Poppins_400Regular',
    fontSize: 16,
    color: '#1e293b',
    paddingHorizontal: 12,
  },
  submitButton: {
    backgroundColor: '#0ea5e9',
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  disabledButton: {
    backgroundColor: '#94a3b8',
  },
  submitButtonText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    borderRadius: 12,
    padding: 12,
  },
  noteText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#64748b',
    marginLeft: 8,
    flex: 1,
  },
  toastContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  toastTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  toastMessage: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  loadingIndicator: {
    marginVertical: 20,
  },
});