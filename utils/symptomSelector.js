import React, { useState, useEffect, useCallback } from 'react';
import DropDownPicker from 'react-native-dropdown-picker';
import { 
  View, 
  StyleSheet, 
  Text, 
  Dimensions, 
  ActivityIndicator, 
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Dummy symptom data for testing purposes
const DUMMY_SYMPTOMS = [
  { code: 'R50.9', name: 'Fever, unspecified' },
  { code: 'R51', name: 'Headache' },
  { code: 'R07.0', name: 'Pain in throat' },
  { code: 'R06.0', name: 'Dyspnea' },
  { code: 'R05', name: 'Cough' },
  { code: 'R11.0', name: 'Nausea' },
  { code: 'R11.10', name: 'Vomiting, unspecified' },
  { code: 'R19.7', name: 'Diarrhea' },
  { code: 'R52', name: 'Pain, unspecified' },
  { code: 'R53.1', name: 'Weakness' },
  { code: 'R53.83', name: 'Fatigue' },
  { code: 'R42', name: 'Dizziness and giddiness' },
  { code: 'L29.9', name: 'Pruritus, unspecified' },
  { code: 'R10.9', name: 'Abdominal pain, unspecified' },
  { code: 'R10.13', name: 'Epigastric pain' },
  { code: 'R60.0', name: 'Localized swelling' },
  { code: 'R61', name: 'Hyperhidrosis' },
  { code: 'R63.0', name: 'Anorexia' },
  { code: 'R63.4', name: 'Abnormal weight loss' },
  { code: 'R63.5', name: 'Abnormal weight gain' },
  { code: 'R40.0', name: 'Somnolence' },
  { code: 'R06.82', name: 'Shortness of breath' },
  { code: 'G47.00', name: 'Insomnia, unspecified' },
  { code: 'H93.1', name: 'Tinnitus' },
  { code: 'H53.40', name: 'Unspecified visual field defects' },
];

const SymptomSelector = ({ 
  onSelectionChange,
  maxSymptoms = 10,
  testMode = true  // Set to true by default for testing
}) => {
  // State management - initialize with empty arrays
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Get device dimensions for responsive design
  const { width } = Dimensions.get('window');
  const isMobileWeb = Platform.OS === 'web' && width < 768;
  
  // Function to load data - immediately load dummy data for testing
  const loadSymptoms = useCallback(async () => {
    setLoading(true);
    
    try {
      if (testMode) {
        // Format the dummy data immediately
        const formattedItems = DUMMY_SYMPTOMS.map(symptom => ({
          label: symptom.name,
          value: symptom.code,
          // Add some sample descriptions to a few items
          ...(Math.random() > 0.7 && { 
            description: `Common symptom with ICD-10 code ${symptom.code}` 
          })
        }));
        
        // Set the items state
        setItems(formattedItems);
        setLoading(false);
        setError(null);
      } else {
        // Production API fetch
        try {
          const response = await fetch('http://your-backend-url/symptoms');
          if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
          }
          const data = await response.json();
          
          const formattedItems = data.map(symptom => ({
            label: symptom.name,
            value: symptom.code,
            ...(symptom.description && { description: symptom.description })
          }));
          
          setItems(formattedItems);
          setError(null);
        } catch (error) {
          console.error('Failed to fetch symptoms:', error);
          setError('Unable to load symptoms');
        } finally {
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('Error in loadSymptoms:', error);
      setError('Unable to load symptoms');
      setLoading(false);
    }
  }, [testMode]);
  
  // Load data on component mount
  useEffect(() => {
    loadSymptoms();
  }, [loadSymptoms]);
  
  // Notify parent component when selection changes
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(value);
    }
  }, [value, onSelectionChange]);
  
  // Function to simulate error state for testing
  const simulateError = () => {
    setError('Simulated error for testing purposes');
    setLoading(false);
  };
  
  // Function to add random symptoms for testing
  const addRandomSymptoms = () => {
    if (items.length > 0) {
      // Get 1-3 random symptoms
      const randomCount = Math.floor(Math.random() * 3) + 1;
      const randomIndices = Array.from(
        { length: randomCount }, 
        () => Math.floor(Math.random() * items.length)
      );
      
      const randomSymptoms = randomIndices.map(index => items[index].value);
      setValue(prev => {
        // Combine with existing, remove duplicates
        const combined = [...new Set([...prev, ...randomSymptoms])];
        // Respect maxSymptoms limit
        return combined.slice(0, maxSymptoms);
      });
    }
  };

  // Debug - log the current state of items
  console.log("Current items state:", items);
  console.log("Current value state:", value);
  
  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.inputLabel}>ICD-11 Symptoms</Text>
        {/* {testMode && (
          <View style={styles.testControls}>
            <Text 
              style={styles.testButton} 
              onPress={simulateError}
            >
              Test Error
            </Text>
            <Text 
              style={styles.testButton} 
              onPress={addRandomSymptoms}
            >
              Add Random
            </Text>
            <Text 
              style={styles.testButton} 
              onPress={loadSymptoms}
            >
              Reload
            </Text>
          </View>
        )} */}
        {value.length > 0 && (
          <Text style={styles.selectedCount}>
            {value.length} selected
          </Text>
        )}
      </View>
      
      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={20} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <Text 
            style={styles.retryText}
            onPress={loadSymptoms}
          >
            Retry
          </Text>
        </View>
      ) : loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading symptoms...</Text>
        </View>
      ) : (
        <View style={styles.dropdownWrapper}>
          <DropDownPicker
            multiple={true}
            min={0}
            max={maxSymptoms}
            open={open}
            value={value}
            items={items}
            setOpen={setOpen}
            setValue={setValue}
            setItems={setItems}
            placeholder="Search symptoms..."
            searchable={true}
            searchPlaceholder="Type to search symptoms"
            listMode="SCROLLVIEW"
            scrollViewProps={{
              nestedScrollEnabled: true,
            }}
            mode="BADGE"
            badgeColors={["#e0f2fe"]}
            badgeTextStyle={{ color: "#3b82f6" }}
            style={styles.dropdown}
            dropDownContainerStyle={styles.dropdownContainer}
            selectedItemContainerStyle={styles.selectedItemContainer}
            selectedItemLabelStyle={styles.selectedItemLabel}
            searchContainerStyle={styles.searchContainer}
            searchTextInputStyle={styles.searchInput}
            placeholderStyle={styles.placeholderText}
            listItemLabelStyle={styles.itemLabel}
            itemSeparator={true}
            itemSeparatorStyle={styles.separator}
            // ⚠️ Important: Ensure proper zIndex management
            zIndex={9000}
            zIndexInverse={9000}
            maxHeight={300}
            autoScroll={true}
            showBadgeDot={false}
            closeAfterSelecting={false}
            disableBorderRadius={false}
            onChangeSearchText={(text) => {
              console.log("Search text:", text);
            }}
            onPress={() => {
              console.log("Dropdown pressed, current open state:", open);
            }}
          />
        </View>
      )}
      
      {value.length > 0 && (
        <View style={styles.selectedContainer}>
          <Text style={styles.selectedSymptomsText}>Selected symptoms:</Text>
          <View style={styles.badgeContainer}>
            {value.slice(0, 3).map((symptomCode, index) => {
              const symptom = items.find(item => item.value === symptomCode);
              return (
                <View key={symptomCode} style={styles.symptomBadge}>
                  <Text style={styles.symptomBadgeText}>
                    {symptom?.label || symptomCode}
                  </Text>
                </View>
              );
            })}
            {value.length > 3 && (
              <View style={styles.moreBadge}>
                <Text style={styles.moreBadgeText}>+{value.length - 3} more</Text>
              </View>
            )}
          </View>
        </View>
      )}
      
      {testMode && (
        <View style={styles.testInfo}>
          <Text style={styles.testInfoText}>
            Test Mode: {items.length} of {DUMMY_SYMPTOMS.length} symptoms loaded
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    position: 'relative',
    // ⚠️ Important: Set a higher zIndex for the entire container
    zIndex: 1000,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1f36',
    marginBottom: 6,
  },
  selectedCount: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  testControls: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'center',
  },
  testButton: {
    fontSize: 12,
    color: '#6366f1',
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: 4,
  },
  testInfo: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    alignItems: 'center',
  },
  testInfoText: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
  },
  dropdownWrapper: {
    borderRadius: 12,
    overflow: 'visible', // Changed from 'hidden' to 'visible'
    zIndex: 1000, // Add zIndex here
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }
    }),
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 50,
    backgroundColor: '#ffffff',
  },
  dropdownContainer: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#e2e8f0',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: '#ffffff',
    // Add maximum height to ensure scrollability
    maxHeight: 300,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }
    }),
  },
  placeholderText: {
    color: '#a0aec0',
    fontSize: 15,
  },
  searchContainer: {
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    fontSize: 15,
    color: '#1a1f36',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8faff',
  },
  itemLabel: {
    fontSize: 15,
    color: '#1a1f36',
    paddingVertical: 2,
  },
  selectedItemContainer: {
    backgroundColor: '#e0f2fe',
  },
  selectedItemLabel: {
    fontWeight: '500',
    color: '#3b82f6',
  },
  separator: {
    backgroundColor: '#f1f5f9',
    height: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  errorText: {
    color: '#ef4444',
    marginLeft: 8,
    flex: 1,
    fontSize: 14,
  },
  retryText: {
    color: '#3b82f6',
    fontWeight: '500',
    fontSize: 14,
    marginLeft: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8faff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    justifyContent: 'center',
  },
  loadingText: {
    color: '#64748b',
    marginLeft: 10,
    fontSize: 14,
  },
  selectedContainer: {
    marginTop: 12,
    zIndex: 1, // Lower zIndex than dropdown
  },
  selectedSymptomsText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  symptomBadge: {
    backgroundColor: '#e0f2fe',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  symptomBadgeText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '500',
  },
  moreBadge: {
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
  },
  moreBadgeText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default SymptomSelector;