import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import tw from 'tailwind-react-native-classnames';
import { useRouter } from 'expo-router';

const DoctorCard = ({ doctor }) => {
  const router = useRouter();
  
  // Default image if doctor.image_url is not available
  const defaultImage = require('../assets/images/doctor-placeholder.jpg');
  
  // Handle navigation to doctor profile
  const handleViewProfile = () => {
    router.push({
      pathname: '/doctor-details',
      params: { doctorId: doctor.id }
    });
  };

  // Calculate rating stars
  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<FontAwesome key={i} name="star" size={14} color="#FFD700" style={tw`mr-0.5`} />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<FontAwesome key={i} name="star-half-o" size={14} color="#FFD700" style={tw`mr-0.5`} />);
      } else {
        stars.push(<FontAwesome key={i} name="star-o" size={14} color="#FFD700" style={tw`mr-0.5`} />);
      }
    }
    
    return stars;
  };

  return (
    <TouchableOpacity 
      style={tw`bg-white rounded-2xl shadow-md mb-4 overflow-hidden`}
      onPress={handleViewProfile}
      activeOpacity={0.9}
    >
      <View style={tw`flex-row`}>
        {/* Doctor image */}
        <View style={tw`w-1/3 h-32`}>
          <Image
            source={doctor.image_url ? { uri: doctor.image_url } : defaultImage}
            style={tw`w-full h-full`}
            resizeMode="cover"
          />
        </View>
        
        {/* Doctor info */}
        <View style={tw`w-2/3 p-3`}>
          {/* Name and specialty */}
          <View style={tw`mb-1`}>
            <Text style={tw`text-lg font-bold text-gray-800`}>
              Dr. {doctor.first_name} {doctor.last_name}
            </Text>
            <Text style={tw`text-sm font-medium text-blue-600`}>
              {doctor.specialty || 'General Practitioner'}
            </Text>
          </View>
          
          {/* Rating */}
          <View style={tw`flex-row items-center mb-1`}>
            <View style={tw`flex-row`}>
              {renderStars(doctor.rating || 0)}
            </View>
            <Text style={tw`text-gray-600 text-xs ml-1`}>
              ({doctor.reviews_count || 0} reviews)
            </Text>
          </View>
          
          {/* Hospital/Location */}
          <View style={tw`flex-row items-center`}>
            <MaterialIcons name="location-on" size={14} color="#4B5563" />
            <Text style={tw`text-gray-600 text-xs ml-0.5 flex-shrink`} numberOfLines={1}>
              {doctor.hospital || doctor.location || 'Afya Hospital'}
            </Text>
          </View>
          
          {/* Experience */}
          <View style={tw`flex-row items-center mt-1`}>
            <MaterialIcons name="work" size={14} color="#4B5563" />
            <Text style={tw`text-gray-600 text-xs ml-0.5`}>
              {doctor.experience || '5'} years experience
            </Text>
          </View>
          
          {/* Consultation fee */}
          <View style={tw`flex-row items-center justify-between mt-2`}>
            <View style={tw`flex-row items-center`}>
              <MaterialIcons name="payments" size={16} color="#4B5563" />
              <Text style={tw`text-gray-800 font-medium text-sm ml-1`}>
                KSh {doctor.consultation_fee || '1,500'}
              </Text>
            </View>
            
            <View style={tw`bg-blue-500 px-2 py-1 rounded`}>
              <Text style={tw`text-white text-xs font-medium`}>Book Now</Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default DoctorCard;
