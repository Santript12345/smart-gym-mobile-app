import { Picker } from '@react-native-picker/picker';
import { getAuth } from 'firebase/auth';
import { get, push, ref, remove, set } from 'firebase/database';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View,
} from 'react-native';
import { db } from '../../firebase';

type GymData = {
  peopleInGym: number;
  bodyParts: {
    Chest: number;
    Back: number;
    Legs: number;
    Arms: number;
    Shoulders: number;
    Core: number;
    [key: string]: number;
  };
};

export default function CheckIn() {
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

      // ✅ 1. Set current check-in (overwritten on toggle)
      await set(ref(db, `check-ins/${uid}`), data);

      // ✅ 2. Append to history (never overwritten)
      const historyRef = ref(db, `check-ins-history`);
      await push(historyRef, data);
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

    // Update current check-in (in case already checked in)
    const checkInRef = ref(db, `check-ins/${uid}`);
    const snapshot = await get(checkInRef);
    if (snapshot.exists()) {
      await set(checkInRef, data);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.container}>
        <Text style={styles.heading}>🏋️‍♂️ Gym Sync</Text>

        <View style={styles.toggleRow}>
          <Text style={styles.label}>In Gym</Text>
          <Switch value={userInGym} onValueChange={handleToggleChange} />
        </View>

        <Text style={styles.label}>Select Body Part Training Today:</Text>
        <Picker
          enabled={!userInGym} // prevent body part change after check-in
          selectedValue={selectedBodyPart}
          onValueChange={handleBodyPartChange}
          style={styles.picker}
        >
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heading: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
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
    marginBottom: 10,
    textAlign: 'center',
  },
  picker: {
    backgroundColor: '#f0f0f0',
    width: '80%',
    marginBottom: 20,
    borderRadius: 8,
  },
  infoBox: {
    marginTop: 30,
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 10,
    width: '90%',
    alignItems: 'center',
  },
  infoHeader: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 15,
    marginVertical: 2,
  },
});
