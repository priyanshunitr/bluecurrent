import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AlarmModal({ showModal, setShowModal, activeAlarm, removeSchedule }) {
  if (!activeAlarm) return null;

  const handleDismiss = () => {
    if (activeAlarm.type === 'particular' && removeSchedule) {
      removeSchedule(activeAlarm.id);
    }
    setShowModal(false);
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={showModal}
      onRequestClose={handleDismiss}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>ALARM!</Text>
          </View>
          <View style={styles.modalBody}>
            <Text style={styles.modalTime}>
              {activeAlarm.hour.toString().padStart(2, '0')}:
              {activeAlarm.minute.toString().padStart(2, '0')}
            </Text>
            <Text style={styles.modalMessage}>It's time for your scheduled task!</Text>
            <Text style={styles.modalType}>
              {activeAlarm.type === 'weekly' ? `Every ${DAYS[activeAlarm.day]}` : 
               activeAlarm.type === 'particular' ? `${activeAlarm.date}/${activeAlarm.month}/${activeAlarm.year}` : 'Everyday'}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.dismissBtn} 
            onPress={handleDismiss}
          >
            <Text style={styles.dismissBtnText}>DISMISS</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 30,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#10b981',
    letterSpacing: 4,
    textAlign: 'center',
  },
  modalBody: {
    alignItems: 'center',
    marginBottom: 30,
  },
  modalTime: {
    fontSize: 64,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 18,
    color: '#334155',
    textAlign: 'center',
    fontWeight: '600',
  },
  modalType: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
    fontWeight: '500',
  },
  dismissBtn: {
    backgroundColor: '#0f172a',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
  },
  dismissBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
  },
});
