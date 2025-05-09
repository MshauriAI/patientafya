import React, { useState } from "react";
import { View, Text, Image, TouchableOpacity, ScrollView, TextInput, Modal } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from "react-native-calendars";
import tw from "tailwind-react-native-classnames";
import * as jwt_decode from "jwt-decode"; // Fixed import statement

const doctors = [
    { id: 1, name: "Dr. John Doe", hospital: "City Hospital", email: "mburuelvis19@gmail.com", specialization: "Cardiology", image: require("../../assets/images/profileImage.jpg"), availableDays: ["2025-02-18", "2025-02-20"], slots: ["10:00 AM - 11:00 AM", "3:00 PM - 4:00 PM"] },
    { id: 2, name: "Dr. Jane Smith", hospital: "Metro Clinic", email: "a@gmail.com", specialization: "Dermatology", image: require("../../assets/images/profileImage.jpg"), availableDays: ["2025-02-19", "2025-02-22"], slots: ["9:00 AM - 10:00 AM", "1:00 PM - 2:00 PM"] },
    { id: 3, name: "Dr. Emily Johnson", hospital: "Sunrise Hospital", email: "c@gmail.com", specialization: "Pediatrics", image: require("../../assets/images/profileImage.jpg"), availableDays: ["2025-02-21", "2025-02-23"], slots: ["11:00 AM - 12:00 PM", "4:00 PM - 5:00 PM"] },
];

// Purpose options
const purposeOptions = [
    "Regular check-up",
    "Follow-up visit",
    "Consultation for new symptoms",
    "Annual physical",
    "Other (please specify)"
];

export default function DoctorProfile() {
    const { email } = useLocalSearchParams();
    console.log("Doctor Profile Loaded for email:", email);    
    const doctor = doctors.find(doc => doc.email === email);
    if (!doctor) return <Text style={tw`text-center mt-10 text-lg`}>Doctor not found</Text>;

    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [appointmentType, setAppointmentType] = useState("online");
    const [consultationPurpose, setConsultationPurpose] = useState("");
    const [additionalDetails, setAdditionalDetails] = useState("");
    
    // Modal states
    const [timeSlotModalVisible, setTimeSlotModalVisible] = useState(false);
    const [purposeModalVisible, setPurposeModalVisible] = useState(false);

    const markedDates = {};
    doctor.availableDays.forEach(date => {
        markedDates[date] = { selected: true, selectedColor: "#3b82f6" };
    });

    useEffect(() => {
        const checkToken = async () => {
          try {
            const token = await AsyncStorage.getItem("token");
            if (token) {
              try {
                // Using the correct import method for jwt-decode
                const decoded = jwt_decode.jwtDecode(token);
                const currentTime = Date.now() / 1000;
                
                if (decoded.exp < currentTime) {
                  await AsyncStorage.removeItem("token");
                  router.push('/auth/sign-in');
                  return;
                }
              } catch (decodeError) {
                console.error("Error decoding token", decodeError);
                await AsyncStorage.removeItem("token");
                router.push('/auth/sign-in');
                return;
              }
            }
          } catch (error) {
            console.error("Error validating token", error);
          }
        };
        
        checkToken();
      }, []);
    
    // Update selected date
    if (selectedDate) {
        markedDates[selectedDate] = { 
            ...markedDates[selectedDate], 
            selected: true, 
            selectedColor: "#3b82f6"
        };
    }

    const handleBooking = () => {
        if (!selectedDate || !selectedSlot) {
            alert("Please select a date and time slot.");
            return;
        }
        if (!consultationPurpose) {
            alert("Please select a purpose for your visit.");
            return;
        }
        alert(`Appointment booked with ${doctor.name} on ${selectedDate} at ${selectedSlot} for ${appointmentType} consultation.\nPurpose: ${consultationPurpose}`);
        // Here, you can integrate API calls for booking confirmation and notification
    };
    
    return (
        <ScrollView style={tw`flex-1 bg-gray-100`}> 
            {/* Doctor Details */}
            <View style={tw`items-center p-6 bg-white rounded-b-3xl shadow-xl`}>
                <Image source={doctor.image} style={tw`w-24 h-24 rounded-full border-4 border-blue-500`} />
                <Text style={tw`text-2xl font-bold text-gray-900 mt-4`}>{doctor.name}</Text>
                <Text style={tw`text-gray-600`}>{doctor.hospital}</Text>
                <Text style={tw`text-blue-500 font-semibold`}>{doctor.specialization}</Text>
            </View>
            
            {/* Calendar */}
            <View style={tw`p-6`}>
                <Text style={tw`text-lg font-bold text-gray-900 mb-2`}>Select Date</Text>
                <Calendar
                    markedDates={markedDates}
                    onDayPress={(day) => {
                        if (doctor.availableDays.includes(day.dateString)) {
                            setSelectedDate(day.dateString);
                            setSelectedSlot(null); // Reset selected slot when date changes
                        } else {
                            alert("Doctor is not available on this date.");
                        }
                    }}
                />
            </View>
            
            {/* Time Slots */}
            <View style={tw`p-6`}>
                <Text style={tw`text-lg font-bold text-gray-900 mb-2`}>Select Time Slot</Text>
                <TouchableOpacity 
                    style={tw`p-4 bg-white rounded-lg shadow-md flex-row justify-between items-center`}
                    onPress={() => setTimeSlotModalVisible(true)}
                >
                    <Text style={tw`text-gray-700`}>{selectedSlot || "Select a time slot"}</Text>
                    <Ionicons name="chevron-down" size={20} color="#4b5563" />
                </TouchableOpacity>
                
                {/* Time Slot Modal */}
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={timeSlotModalVisible}
                    onRequestClose={() => setTimeSlotModalVisible(false)}
                >
                    <View style={tw`flex-1 justify-end bg-black bg-opacity-50`}>
                        <View style={tw`bg-white rounded-t-xl p-6`}>
                            <Text style={tw`text-lg font-bold text-center mb-4`}>Select Time Slot</Text>
                            {doctor.slots.map((slot, index) => (
                                <TouchableOpacity 
                                    key={index} 
                                    style={tw`p-4 ${selectedSlot === slot ? 'bg-blue-100' : 'bg-white'} border border-gray-200 rounded-lg mb-2`}
                                    onPress={() => {
                                        setSelectedSlot(slot);
                                        setTimeSlotModalVisible(false);
                                    }}
                                >
                                    <Text style={tw`text-center ${selectedSlot === slot ? 'text-blue-500 font-bold' : 'text-gray-700'}`}>{slot}</Text>
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity 
                                style={tw`mt-4 p-4 bg-gray-200 rounded-lg`}
                                onPress={() => setTimeSlotModalVisible(false)}
                            >
                                <Text style={tw`text-center font-semibold`}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </View>
            
            {/* Appointment Type */}
            <View style={tw`px-6 pb-2`}>
                <Text style={tw`text-lg font-bold text-gray-900 mb-2`}>Appointment Type</Text>
                <View style={tw`flex-row mb-2`}>
                    <TouchableOpacity 
                        style={tw`flex-1 p-4 ${appointmentType === 'online' ? 'bg-blue-500' : 'bg-white'} rounded-l-lg shadow-md`}
                        onPress={() => setAppointmentType('online')}
                    >
                        <Text style={tw`text-center ${appointmentType === 'online' ? 'text-white font-bold' : 'text-gray-700'}`}>Online</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={tw`flex-1 p-4 ${appointmentType === 'in-person' ? 'bg-blue-500' : 'bg-white'} rounded-r-lg shadow-md`}
                        onPress={() => setAppointmentType('in-person')}
                    >
                        <Text style={tw`text-center ${appointmentType === 'in-person' ? 'text-white font-bold' : 'text-gray-700'}`}>In-Person</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Purpose of Visit */}
            <View style={tw`p-6`}>
                <Text style={tw`text-lg font-bold text-gray-900 mb-2`}>Purpose of Visit</Text>
                <TouchableOpacity 
                    style={tw`p-4 bg-white rounded-lg shadow-md flex-row justify-between items-center`}
                    onPress={() => setPurposeModalVisible(true)}
                >
                    <Text style={tw`text-gray-700`}>{consultationPurpose || "Select purpose of visit"}</Text>
                    <Ionicons name="chevron-down" size={20} color="#4b5563" />
                </TouchableOpacity>
                
                {/* Purpose Modal */}
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={purposeModalVisible}
                    onRequestClose={() => setPurposeModalVisible(false)}
                >
                    <View style={tw`flex-1 justify-end bg-black bg-opacity-50`}>
                        <View style={tw`bg-white rounded-t-xl p-6`}>
                            <Text style={tw`text-lg font-bold text-center mb-4`}>Select Purpose</Text>
                            {purposeOptions.map((purpose, index) => (
                                <TouchableOpacity 
                                    key={index} 
                                    style={tw`p-4 ${consultationPurpose === purpose ? 'bg-blue-100' : 'bg-white'} border border-gray-200 rounded-lg mb-2`}
                                    onPress={() => {
                                        setConsultationPurpose(purpose);
                                        setPurposeModalVisible(false);
                                    }}
                                >
                                    <Text style={tw`text-center ${consultationPurpose === purpose ? 'text-blue-500 font-bold' : 'text-gray-700'}`}>{purpose}</Text>
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity 
                                style={tw`mt-4 p-4 bg-gray-200 rounded-lg`}
                                onPress={() => setPurposeModalVisible(false)}
                            >
                                <Text style={tw`text-center font-semibold`}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </View>
            
            {/* Additional details */}
            <View style={tw`px-6 pb-6`}>
                <Text style={tw`text-lg font-bold text-gray-900 mb-2`}>Additional Details (Optional)</Text>
                <TextInput
                    style={tw`p-4 bg-white rounded-lg shadow-md min-h-16`}
                    multiline={true}
                    placeholder="Any additional information you'd like to share with the doctor"
                    value={additionalDetails}
                    onChangeText={setAdditionalDetails}
                />
            </View>
            
            {/* Action Buttons */}
            <View style={tw`flex-row px-6 pb-10`}>
                <TouchableOpacity 
                    style={tw`flex-1 bg-gray-300 p-4 rounded-l-lg shadow-md mr-1 items-center`}
                >
                    <Text style={tw`text-gray-700 font-semibold text-lg`}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={tw`flex-1 bg-blue-500 p-4 rounded-r-lg shadow-md ml-1 items-center`} 
                    onPress={handleBooking}
                >
                    <Text style={tw`text-white font-semibold text-lg`}>Confirm</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}