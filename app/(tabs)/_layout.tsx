// app/_layout.tsx
import { Stack } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { onValue, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import { auth, db } from '../../firebase';

export default function RootLayout() {
  const [role, setRole] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const roleRef = ref(db, `users/${user.uid}/role`);
        onValue(roleRef, (snapshot) => {
          const fetchedRole = snapshot.val();
          setRole(fetchedRole);
          setInitializing(false);
        });
      } else {
        setRole(null);
        setInitializing(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (initializing) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {role === 'admin' ? (
        <Stack.Screen name="admin" />
      ) : role === 'user' ? (
        <Stack.Screen name="index" />
      ) : (
        <Stack.Screen name="index" />
      )}
    </Stack>
  );
}
