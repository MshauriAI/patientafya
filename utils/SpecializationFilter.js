// SpecializationFilter.js
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  TextInput, 
  StyleSheet,
  ScrollView,
  Platform,
  Dimensions,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

// Always use mobile UI regardless of platform or screen size
const SpecializationFilter = ({ specializations = [], activeCategory, onCategoryPress, isLoading = false }) => {
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [specialtySearchQuery, setSpecialtySearchQuery] = useState('');
  const dropdownButtonRef = useRef(null);
  const [dropdownButtonLayout, setDropdownButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  
  // Filter specializations by search query
  const filteredSpecializations = useMemo(() => {
    if (!specialtySearchQuery.trim()) return specializations;
    
    const query = specialtySearchQuery.toLowerCase().trim();
    return specializations.filter(spec => 
        spec.name.toLowerCase().includes(query)
    );
  }, [specializations, specialtySearchQuery]);

  // Reset dropdown state when component unmounts
  useEffect(() => {
    return () => {
      setIsDropdownVisible(false);
      setSpecialtySearchQuery('');
    };
  }, []);

  const toggleDropdown = () => {
    if (!isDropdownVisible && dropdownButtonRef.current) {
      if (isWeb) {
        // For web, get button position (for future reference although using modal)
        const rect = dropdownButtonRef.current.getBoundingClientRect();
        setDropdownButtonLayout({ 
          x: rect.left, 
          y: rect.top, 
          width: rect.width, 
          height: rect.height 
        });
        setIsDropdownVisible(true);
      } else {
        // For native
        dropdownButtonRef.current.measure((x, y, width, height, pageX, pageY) => {
          setDropdownButtonLayout({ x: pageX, y: pageY, width, height });
          setIsDropdownVisible(true);
        });
      }
    } else {
      setIsDropdownVisible(false);
    }
  };

  const handleCategorySelect = (category) => {
    onCategoryPress(category);
    setIsDropdownVisible(false);
    setSpecialtySearchQuery('');
  };

  // This now renders for both web and mobile
  const renderDropdown = () => {
    if (!isDropdownVisible) return null;
    
    return (
      <Modal
        visible={true}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsDropdownVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.dragHandle}>
              <View style={styles.dragHandleBar} />
            </View>
            
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={18} color="#64748b" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search specializations..."
                placeholderTextColor="#a0aec0"
                value={specialtySearchQuery}
                onChangeText={setSpecialtySearchQuery}
                autoFocus={false}
              />
              {specialtySearchQuery.length > 0 && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => setSpecialtySearchQuery('')}
                  accessibilityLabel="Clear search"
                >
                  <Ionicons name="close-circle" size={16} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>
            
            <ScrollView 
              style={styles.dropdownScrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              <TouchableOpacity
                style={[
                  styles.dropdownItem,
                  !activeCategory && styles.dropdownItemActive
                ]}
                onPress={() => handleCategorySelect(null)}
                accessibilityRole="button"
                accessibilityLabel="Select all specializations"
                accessibilityState={{ selected: !activeCategory }}
              >
                <View style={styles.allSpecIcon}>
                  <Ionicons name="apps" size={16} color="#ffffff" />
                </View>
                <Text 
                  style={[
                    styles.dropdownItemText,
                    !activeCategory && styles.dropdownItemTextActive
                  ]}
                >
                  All Specializations
                </Text>
                {!activeCategory && (
                  <Ionicons name="checkmark" size={18} color="#0070f3" />
                )}
              </TouchableOpacity>
              
              {filteredSpecializations.length > 0 ? (
                filteredSpecializations.map((specialty) => (
                  <TouchableOpacity
                    key={specialty.id || `specialty-${specialty.name}`}
                    style={[
                      styles.dropdownItem,
                      activeCategory === specialty.name && styles.dropdownItemActive
                    ]}
                    onPress={() => handleCategorySelect(specialty.name)}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${specialty.name} specialization`}
                    accessibilityState={{ selected: activeCategory === specialty.name }}
                  >
                    <Text style={styles.specialtyIcon}>{specialty.icon}</Text>
                    <Text 
                      style={[
                        styles.dropdownItemText,
                        activeCategory === specialty.name && styles.dropdownItemTextActive
                      ]}
                      numberOfLines={1}
                    >
                      {specialty.name}
                    </Text>
                    {activeCategory === specialty.name && (
                      <Ionicons name="checkmark" size={18} color="#0070f3" />
                    )}
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.noResultsContainer}>
                  <Ionicons name="search-outline" size={24} color="#cbd5e1" />
                  <Text style={styles.noResultsText}>No specializations found</Text>
                  <TouchableOpacity 
                    style={styles.resetButton}
                    onPress={() => setSpecialtySearchQuery('')}
                    accessibilityLabel="Clear search"
                  >
                    <Text style={styles.resetButtonText}>Clear search</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
            
            <View style={styles.mobileFooter}>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setIsDropdownVisible(false)}
                accessibilityLabel="Close dropdown"
                accessibilityRole="button"
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Specialization</Text>
      <TouchableOpacity
        ref={dropdownButtonRef}
        style={[
          styles.filterButton,
          isDropdownVisible && styles.filterButtonActive,
          activeCategory && !isDropdownVisible && styles.filterButtonWithSelection
        ]}
        onPress={toggleDropdown}
        disabled={isLoading}
        activeOpacity={0.8}
        accessibilityLabel={`Select specialization, currently ${activeCategory || 'All Specializations'}`}
        accessibilityRole="button"
        accessibilityState={{ disabled: isLoading }}
      >
        <View style={styles.filterButtonContent}>
          <View style={styles.selectedTextContainer}>
            {activeCategory ? (
              <>
                <View style={styles.activeDot} />
                <Text 
                  style={[
                    styles.filterButtonText, 
                    styles.activeFilterText,
                    isDropdownVisible && styles.filterButtonTextLight
                  ]}
                  numberOfLines={1}
                >
                  {activeCategory}
                </Text>
              </>
            ) : (
              <Text 
                style={[
                  styles.filterButtonText,
                  isDropdownVisible && styles.filterButtonTextLight
                ]}
              >
                All Specializations
              </Text>
            )}
          </View>
          <View style={styles.iconContainer}>
            {isLoading ? (
              <View style={styles.loadingIndicator} />
            ) : (
              <Ionicons 
                name={isDropdownVisible ? "chevron-up" : "chevron-down"} 
                size={18} 
                color={isDropdownVisible ? "#ffffff" : "#475569"} 
              />
            )}
          </View>
        </View>
      </TouchableOpacity>
      
      {renderDropdown()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    position: 'relative',
    zIndex: 100,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
    marginLeft: 4,
  },
  filterButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    height: 48,
    paddingHorizontal: 16,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  filterButtonActive: {
    backgroundColor: '#0070f3',
    borderColor: '#0070f3',
  },
  filterButtonWithSelection: {
    borderColor: '#0070f3',
  },
  filterButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 8,
  },
  filterButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#475569',
  },
  activeFilterText: {
    color: '#0f172a',
  },
  filterButtonTextLight: {
    color: '#ffffff',
  },
  iconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderTopColor: '#0070f3',
  },
  // Modal styles for both mobile and web
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    // Make sure the modal appears correctly on web
    ...(isWeb ? {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
    } : {})
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: 500,
    ...(isWeb ? {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)'
    } : {})
  },
  dragHandle: {
    width: '100%',
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dragHandleBar: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#e2e8f0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#334155',
    padding: 0,
    height: 22,
    outlineStyle: 'none',
  },
  clearButton: {
    padding: 4,
  },
  dropdownScrollView: {
    flex: 1,
    ...(isWeb ? {
      maxHeight: 'calc(90vh - 150px)', // Adjust to avoid taking full height on web
      overflowY: 'auto'
    } : {})
  },
  scrollContent: {
    paddingBottom: 20
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownItemActive: {
    backgroundColor: '#f0f9ff',
  },
  allSpecIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#0070f3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  specialtyIcon: {
    fontSize: 20,
    width: 32,
    textAlign: 'center',
    marginRight: 12,
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#334155',
    flex: 1,
  },
  dropdownItemTextActive: {
    color: '#0070f3',
    fontWeight: '600',
  },
  noResultsContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noResultsText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 12,
    marginBottom: 16,
  },
  resetButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  resetButtonText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  mobileFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  closeButton: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  }
});

export default SpecializationFilter;