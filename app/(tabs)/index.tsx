import { Picker } from '@react-native-picker/picker';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { get, onValue, push, ref, remove, set } from 'firebase/database';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth, db } from '../../firebase';

const screenWidth = Dimensions.get('window').width;

type CheckInEntry = {
  id: string;
  uid: string;
  muscleGroup?: string;
  timestamp?: number;
};

type UsersMap = {
  [uid: string]: {
    name: string;
    role?: string;
  };
};

type GymData = {
  peopleInGym: number;
  bodyParts: {
    [key: string]: number;
  };
};

export default function IndexScreen() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<'user' | 'admin' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [selectedRole, setSelectedRole] = useState<'user' | 'admin'>('user');
  const [isRegistering, setIsRegistering] = useState(false);
  const [checkIns, setCheckIns] = useState<CheckInEntry[]>([]);
  const [users, setUsers] = useState<UsersMap>({});
  const [userCheckIns, setUserCheckIns] = useState<CheckInEntry[]>([]);

  // Check-In States (user)
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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setRole(null);
        return;
      }

      const snapshot = await get(ref(db, `users/${firebaseUser.uid}`));
      const data = snapshot.val();
      setRole(data?.role);

      if (data?.role === 'user') {
        loadUserCheckIns(firebaseUser.uid);
        checkUserStatus(firebaseUser.uid);
        subscribeToGymData();
      } else if (data?.role === 'admin') {
        loadAdminData();
      }
    });

    return () => unsubscribe();
  }, []);

  const loadUserCheckIns = (uid: string) => {
    const historyRef = ref(db, 'check-ins-history');
    onValue(historyRef, (snapshot) => {
      const now = Date.now();
      const data = snapshot.val() || {};
      const entries: CheckInEntry[] = [];

      Object.entries(data).forEach(([id, entry]: [string, any]) => {
        if (entry.uid === uid && now - entry.timestamp < 7 * 24 * 60 * 60 * 1000) {
          entries.push({ id, ...entry });
        }
      });

      entries.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
      setUserCheckIns(entries);
    });
  };

  const checkUserStatus = async (uid: string) => {
    const snapshot = await get(ref(db, `check-ins/${uid}`));
    if (snapshot.exists()) {
      const data = snapshot.val();
      setUserInGym(true);
      setSelectedBodyPart(data.muscleGroup || '');
    } else {
      setUserInGym(false);
    }
  };

  const subscribeToGymData = () => {
    const checkInsRef = ref(db, 'check-ins');
    onValue(checkInsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const newBodyParts: GymData['bodyParts'] = {
        Chest: 0,
        Back: 0,
        Legs: 0,
        Arms: 0,
        Shoulders: 0,
        Core: 0,
      };

      let total = 0;
      Object.values(data).forEach((entry: any) => {
        total++;
        const part = entry.muscleGroup;
        if (newBodyParts[part] !== undefined) newBodyParts[part]++;
      });

      setGymData({ peopleInGym: total, bodyParts: newBodyParts });
    });
  };

  const loadAdminData = () => {
    onValue(ref(db, 'check-ins'), (snapshot) => {
      const data = snapshot.val();
      const entries: CheckInEntry[] = Object.entries(data || {}).map(
        ([id, entry]: [string, any]) => ({ id, ...entry })
      );
      setCheckIns(entries.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)));
    });

    onValue(ref(db, 'users'), (snapshot) => {
      setUsers(snapshot.val() || {});
    });
  };

  const handleToggleChange = async (checked: boolean) => {
    if (!user) return;

    const uid = user.uid;

    if (checked && selectedBodyPart === '') {
      Alert.alert('Please select a body part before checking in.');
      return;
    }

    setUserInGym(checked);

    if (checked) {
      const data = { uid, timestamp: Date.now(), muscleGroup: selectedBodyPart };
      await set(ref(db, `check-ins/${uid}`), data);
      await push(ref(db, 'check-ins-history'), data);
    } else {
      await remove(ref(db, `check-ins/${uid}`));
      setSelectedBodyPart('');
    }
  };

  const handleBodyPartChange = async (part: string) => {
    setSelectedBodyPart(part);
    if (!userInGym || !user) return;
    const data = { uid: user.uid, timestamp: Date.now(), muscleGroup: part };
    await set(ref(db, `check-ins/${user.uid}`), data);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setRole(null);
  };

  const handleAuth = async () => {
    try {
      if (isRegistering) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await set(ref(db, `users/${cred.user.uid}`), {
          name,
          age,
          role: selectedRole,
          email,
        });
        Alert.alert('Registered', 'Account created!');
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const snapshot = await get(ref(db, `users/${cred.user.uid}`));
        const data = snapshot.val();
        setRole(data?.role);
      }
    } catch (err: any) {
      Alert.alert('Auth Error', err.message);
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>🏋️ Welcome to Smart Gym</Text>
        <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} />
        <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
        {isRegistering && (
          <>
            <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder="Age" value={age} onChangeText={setAge} />
            <Picker selectedValue={selectedRole} onValueChange={(val) => setSelectedRole(val)}>
              <Picker.Item label="User" value="user" />
              <Picker.Item label="Admin" value="admin" />
            </Picker>
          </>
        )}
        <Button title={isRegistering ? 'Register' : 'Login'} onPress={handleAuth} />
        <TouchableOpacity onPress={() => setIsRegistering(!isRegistering)}>
          <Text style={{ color: 'blue', marginTop: 10 }}>
            {isRegistering ? 'Already have an account? Login' : "Don't have an account? Register"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (role === 'user') {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>👤 Profile</Text>
        <Text style={styles.info}>Email: {user.email}</Text>
        <Text style={styles.info}>Last Login: {user.metadata?.lastSignInTime}</Text>

        <Text style={styles.sectionTitle}>Check-In History</Text>
        <FlatList
          data={userCheckIns}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.cell}>{item.muscleGroup}</Text>
              <Text style={styles.cell}>{new Date(item.timestamp ?? 0).toLocaleString()}</Text>
            </View>
          )}
        />

        {/* 🏋️‍♂️ Check-In Section */}
        <View style={styles.infoBox}>
          <Text style={styles.infoHeader}>🏋️ Gym Check-In</Text>
          <View style={styles.toggleRow}>
            <Text>In Gym</Text>
            <Switch value={userInGym} onValueChange={handleToggleChange} />
          </View>

          <Picker
            enabled={!userInGym}
            selectedValue={selectedBodyPart}
            onValueChange={handleBodyPartChange}
          >
            <Picker.Item label="Select body part" value="" />
            {['Chest', 'Back', 'Legs', 'Arms', 'Shoulders', 'Core'].map((part) => (
              <Picker.Item key={part} label={part} value={part} />
            ))}
          </Picker>

          <Text style={styles.infoText}>People in Gym: {gymData.peopleInGym}</Text>
          {Object.entries(gymData.bodyParts).map(([key, val]) => (
            <Text key={key} style={styles.infoText}>
              {key}: {val}
            </Text>
          ))}
        </View>

        <View style={styles.logoutButton}>
          <Button title="🚪 Logout" onPress={handleLogout} color="#d9534f" />
        </View>
      </ScrollView>
    );
  }

  if (role === 'admin') {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>🔐 Admin Dashboard</Text>
        <FlatList
          data={checkIns}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.cell}>{users[item.uid]?.name ?? 'Unknown'}</Text>
              <Text style={styles.cell}>{item.muscleGroup}</Text>
              <Text style={styles.cell}>{new Date(item.timestamp ?? 0).toLocaleString()}</Text>
            </View>
          )}
        />
        <View style={styles.logoutButton}>
          <Button title="🚪 Logout" onPress={handleLogout} color="#d9534f" />
        </View>
      </ScrollView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 80,
    backgroundColor: '#fff',
    flexGrow: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    fontWeight: 'bold',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  info: {
    fontSize: 14,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomColor: '#ccc',
    borderBottomWidth: 1,
  },
  cell: {
    flex: 1,
    fontSize: 14,
  },
  infoBox: {
    marginTop: 30,
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    width: '100%',
  },
  infoHeader: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  logoutButton: {
    marginTop: 40,
    width: '100%',
  },
});