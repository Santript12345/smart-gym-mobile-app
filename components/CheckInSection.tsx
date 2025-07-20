// components/CheckInSection.tsx
import { Picker } from '@react-native-picker/picker';
import { getAuth } from 'firebase/auth';
import { get, onValue, push, ref, remove, set } from 'firebase/database';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { db } from '../firebase';

type GymData = {
  peopleInGym: number;
  bodyParts: {
    [key: string]: number;
  };
};

export default function CheckInSection() {
  const [userInGym, setUserInGym] = useState<boolean>(false);
  const [selectedBodyPart, setSelectedBodyPart] = useState<string>('');
  const [gymData, setGymData] = useState<GymData>({
    peopleInGym: 0,
    bodyParts: {
      Chest: 0,
      Back: 0,
      Legs: 0,
      Arms: 0,
      Shoulders: 0,
      Core: 0,
    },
  });

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;

    const checkInRef = ref(db, `check-ins/${user.uid}`);
    get(checkInRef).then((snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setUserInGym(true);
        setSelectedBodyPart(data.muscleGroup || '');
      } else {
        setUserInGym(false);
      }
    });

    const checkInsRef = ref(db, 'check-ins');
    const unsubscribe = onValue(checkInsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const newBodyParts: GymData['bodyParts'] = {
        Chest: 0,
        Back: 0,
        Legs: 0,
        Arms: 0,
        Shoulders: 0,
        Core: 0,
      };
      let count = 0;

      Object.values(data).forEach((entry: any) => {
        count++;
        const part = entry.muscleGroup;
        if (newBodyParts[part] !== undefined) {
          newBodyParts[part]++;
        }
      });

      setGymData({ peopleInGym: count, bodyParts: newBodyParts });
    });

    return () => unsubscribe();
  }, []);

  const handleToggleChange = async (checked: boolean) => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return Alert.alert('User not logged in');

    const uid = user.uid;

    if (checked && selectedBodyPart === '') {
      Alert.alert('Please select a body part before checking in.');
      return;
    }

    setUserInGym(checked);

    if (checked) {
      const data = {
        uid,
        timestamp: Date.now(),
        muscleGroup: selectedBodyPart || null,
      };

      await set(ref(db, `check-ins/${uid}`), data);
      await push(ref(db, 'check-ins-history'), data);
    } else {
      await remove(ref(db, `check-ins/${uid}`));
      setSelectedBodyPart('');
    }
  };

  const handleBodyPartChange = async (newPart: string) => {
    setSelectedBodyPart(newPart);
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;

    const uid = user.uid;
    const data = {
      uid,
      timestamp: Date.now(),
      muscleGroup: newPart,
    };

    const checkInRef = ref(db, `check-ins/${uid}`);
    const snapshot = await get(checkInRef);
    if (snapshot.exists()) {
      await set(checkInRef, data);
    }
  };

  return (
    <View style={styles.box}>
      <Text style={styles.heading}>📍 Real-Time Check-In</Text>
      <View style={styles.toggleRow}>
        <Text style={styles.label}>In Gym</Text>
        <Switch value={userInGym} onValueChange={handleToggleChange} />
      </View>
      <Text style={styles.label}>Select Muscle Group</Text>
      <Picker
        enabled={!userInGym}
        selectedValue={selectedBodyPart}
        onValueChange={handleBodyPartChange}
        style={styles.picker}>
        <Picker.Item label="Select body part" value="" />
        <Picker.Item label="Chest" value="Chest" />
        <Picker.Item label="Back" value="Back" />
        <Picker.Item label="Legs" value="Legs" />
        <Picker.Item label="Arms" value="Arms" />
        <Picker.Item label="Shoulders" value="Shoulders" />
        <Picker.Item label="Core" value="Core" />
      </Picker>

      <View style={styles.infoBox}>
        <Text style={styles.infoHeader}>Current Gym Status</Text>
        <Text style={styles.infoText}>People in Gym: {gymData.peopleInGym}</Text>
        {Object.entries(gymData.bodyParts).map(([part, count]) => (
          <Text key={part} style={styles.infoText}>
            {part}: {count}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginTop: 40,
    width: '100%',
    alignItems: 'center',
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    justifyContent: 'space-between',
    width: '80%',
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  picker: {
    backgroundColor: '#f0f0f0',
    width: '80%',
    marginBottom: 20,
    borderRadius: 8,
  },
  infoBox: {
    marginTop: 20,
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 10,
    width: '90%',
    alignItems: 'center',
  },
  infoHeader: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
  },
});
