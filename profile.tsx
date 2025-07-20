import { useRouter } from "expo-router";
import { onValue, ref, remove } from "firebase/database";
import React, { useEffect, useState } from "react";
import {
    Alert,
    Button,
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { auth, db } from "../../firebase";

type CheckInEntry = {
  id: string;
  uid: string;
  muscleGroup?: string;
  timestamp?: number;
};

export default function ProfileScreen() {
  const user = auth.currentUser;
  const [userCheckIns, setUserCheckIns] = useState<CheckInEntry[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    // 🔍 Check if user is admin
    const userRef = ref(db, `users/${user.uid}`);
    onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      if (data?.role === "admin") {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    });

    const checkInsRef = ref(db, "check-ins-history");

    const cleanupAndLoad = () => {
      onValue(
        checkInsRef,
        (snapshot) => {
          const data = snapshot.val();
          if (!data) return setUserCheckIns([]);

          const now = Date.now();
          const fiveMinutesAgo = now - 5 * 60 * 1000;
          const filtered: CheckInEntry[] = [];

          Object.entries(data).forEach(([id, details]: [string, any]) => {
            const { timestamp = 0, uid } = details;

            if (timestamp <= fiveMinutesAgo) {
              remove(ref(db, `check-ins-history/${id}`));
              return;
            }

            if (uid === user.uid && timestamp > fiveMinutesAgo) {
              filtered.push({ id, ...details });
            }
          });

          filtered.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          setUserCheckIns(filtered);
        },
        { onlyOnce: true }
      );
    };

    cleanupAndLoad();
    const interval = setInterval(cleanupAndLoad, 30 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      Alert.alert("👋 Logged Out", "You have been signed out.");
      router.replace("/"); // Navigate back to login
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  const renderItem = ({ item }: { item: CheckInEntry }) => (
    <View style={styles.row}>
      <Text style={styles.cell}>{item.muscleGroup || "N/A"}</Text>
      <Text style={styles.cell}>
        {item.timestamp ? new Date(item.timestamp).toLocaleString() : "N/A"}
      </Text>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.inner}>
        <Text style={styles.title}>👤 Profile</Text>
        <Text style={styles.info}>Email: {user?.email}</Text>
        <Text style={styles.info}>UID: {user?.uid}</Text>
        <Text style={styles.info}>
          Last Login: {user?.metadata?.lastSignInTime}
        </Text>

        <Text style={styles.sectionTitle}>
          Check-In History (Last 5 Minutes)
        </Text>

        {userCheckIns.length === 0 ? (
          <Text style={styles.emptyText}>No recent check-ins.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.header}>
              <Text style={[styles.cell, styles.headerCell]}>
                Muscle Group
              </Text>
              <Text style={[styles.cell, styles.headerCell]}>Time</Text>
            </View>

            <FlatList
              data={userCheckIns}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
            />
          </View>
        )}

        {/* ✅ Show logout only if user is NOT admin */}
        {user && !isAdmin && (
          <View style={styles.logoutButton}>
            <Button title="🚪 Logout" onPress={handleLogout} color="#d9534f" />
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    paddingTop: 100,
    paddingHorizontal: 16,
    flexGrow: 1,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  inner: {
    width: "100%",
    maxWidth: 600,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  info: {
    fontSize: 14,
    marginBottom: 6,
    textAlign: "center",
  },
  sectionTitle: {
    marginTop: 30,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  table: {
    width: "100%",
  },
  header: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    marginBottom: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  cell: {
    flex: 1,
    fontSize: 14,
  },
  headerCell: {
    fontWeight: "bold",
  },
  emptyText: {
    fontStyle: "italic",
    color: "#888",
    textAlign: "center",
    marginTop: 20,
  },
  logoutButton: {
    marginTop: 40,
    width: "100%",
  },
});
