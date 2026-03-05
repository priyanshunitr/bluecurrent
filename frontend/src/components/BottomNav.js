import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Home, Calendar, User } from 'lucide-react-native';
import { useNavigate, useLocation } from 'react-router-native';

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = location.pathname;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.tab} onPress={() => navigate('/')}>
        <Home color={currentPath === '/' ? '#000' : '#8E8E93'} size={24} />
        <Text style={[styles.tabText, currentPath === '/' && styles.activeText]}>Home</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.tab} onPress={() => navigate('/schedule')}>
        <Calendar color={currentPath === '/schedule' ? '#000' : '#8E8E93'} size={24} />
        <Text style={[styles.tabText, currentPath === '/schedule' && styles.activeText]}>Schedule</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.tab} onPress={() => navigate('/profile')}>
        <User color={currentPath === '/profile' ? '#000' : '#8E8E93'} size={24} />
        <Text style={[styles.tabText, currentPath === '/profile' && styles.activeText]}>Profile</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingBottom: 24, // for safe area
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 12,
    marginTop: 4,
    color: '#8E8E93',
  },
  activeText: {
    color: '#000000',
    fontWeight: '600',
  },
});

export default BottomNav;
