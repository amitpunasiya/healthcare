import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { Colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

// Screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { HomeScreen } from '../screens/customer/HomeScreen';
import { BookServiceScreen } from '../screens/customer/BookServiceScreen';
import { MyBookingsScreen } from '../screens/customer/MyBookingsScreen';
import { BookingDetailScreen } from '../screens/customer/BookingDetailScreen';
import { ProviderDashboardScreen } from '../screens/provider/ProviderDashboardScreen';
import { ProfileScreen } from '../screens/common/ProfileScreen';

const AuthStack = createNativeStackNavigator();
const CustomerTab = createBottomTabNavigator();
const ProviderTab = createBottomTabNavigator();
const CustomerHomeStack = createNativeStackNavigator();
const CustomerBookingsStack = createNativeStackNavigator();

// Customer Home Stack (Home -> Book -> Details)
const CustomerHomeStackNavigator = () => (
  <CustomerHomeStack.Navigator screenOptions={{ headerShown: false }}>
    <CustomerHomeStack.Screen name="Home" component={HomeScreen} />
    <CustomerHomeStack.Screen
      name="BookService"
      component={BookServiceScreen}
      options={{ headerShown: true, title: 'Schedule Visit', headerTintColor: Colors.primary }}
    />
  </CustomerHomeStack.Navigator>
);

// Customer Bookings Stack (List -> Detail)
const CustomerBookingsStackNavigator = () => (
  <CustomerBookingsStack.Navigator screenOptions={{ headerShown: false }}>
    <CustomerBookingsStack.Screen name="BookingsList" component={MyBookingsScreen} />
    <CustomerBookingsStack.Screen
      name="BookingDetail"
      component={BookingDetailScreen}
      options={{ headerShown: true, title: 'Appointment Details', headerTintColor: Colors.primary }}
    />
  </CustomerBookingsStack.Navigator>
);

// Customer Main Tabs
const CustomerTabNavigator = () => (
  <CustomerTab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: Colors.primary,
      tabBarInactiveTintColor: Colors.textLight,
      tabBarStyle: {
        backgroundColor: Colors.surface,
        borderTopColor: Colors.border,
        height: 60,
        paddingBottom: 8,
        paddingTop: 6,
      },
      tabBarLabelStyle: {
        fontSize: 11,
        fontWeight: '700',
      },
      tabBarIcon: ({ focused, color, size }) => {
        let iconName: any = 'home';
        if (route.name === 'HomeTab') {
          iconName = focused ? 'home' : 'home-outline';
        } else if (route.name === 'BookTab') {
          iconName = focused ? 'add-circle' : 'add-circle-outline';
        } else if (route.name === 'MyBookingsTab') {
          iconName = focused ? 'calendar' : 'calendar-outline';
        } else if (route.name === 'ProfileTab') {
          iconName = focused ? 'person' : 'person-outline';
        }
        return <Ionicons name={iconName} size={size} color={color} />;
      },
    })}
  >
    <CustomerTab.Screen name="HomeTab" component={CustomerHomeStackNavigator} options={{ title: 'Home' }} />
    <CustomerTab.Screen name="BookTab" component={BookServiceScreen} options={{ title: 'Book Visit' }} />
    <CustomerTab.Screen name="MyBookingsTab" component={CustomerBookingsStackNavigator} options={{ title: 'Bookings' }} />
    <CustomerTab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: 'Profile' }} />
  </CustomerTab.Navigator>
);

// Provider Main Tabs
const ProviderTabNavigator = () => (
  <ProviderTab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: Colors.primary,
      tabBarInactiveTintColor: Colors.textLight,
      tabBarStyle: {
        backgroundColor: Colors.surface,
        borderTopColor: Colors.border,
        height: 60,
        paddingBottom: 8,
        paddingTop: 6,
      },
      tabBarLabelStyle: {
        fontSize: 11,
        fontWeight: '700',
      },
      tabBarIcon: ({ focused, color, size }) => {
        let iconName: any = 'medkit';
        if (route.name === 'DutyTab') {
          iconName = focused ? 'medkit' : 'medkit-outline';
        } else if (route.name === 'ProviderProfileTab') {
          iconName = focused ? 'person' : 'person-outline';
        }
        return <Ionicons name={iconName} size={size} color={color} />;
      },
    })}
  >
    <ProviderTab.Screen name="DutyTab" component={ProviderDashboardScreen} options={{ title: 'My Duties' }} />
    <ProviderTab.Screen name="ProviderProfileTab" component={ProfileScreen} options={{ title: 'My Account' }} />
  </ProviderTab.Navigator>
);

// Root Navigator Switching between Auth, Customer and Provider
export const RootNavigator = () => {
  const { user, token, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!token || !user ? (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
          <AuthStack.Screen name="Register" component={RegisterScreen} />
        </AuthStack.Navigator>
      ) : user.role === 'PROVIDER' ? (
        <ProviderTabNavigator />
      ) : (
        <CustomerTabNavigator />
      )}
    </NavigationContainer>
  );
};
