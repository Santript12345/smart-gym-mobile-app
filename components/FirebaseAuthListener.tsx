// components/FirebaseAuthListener.tsx
import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect } from 'react';
import { auth } from '../firebase';

export function FirebaseAuthListener() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) router.replace('/login');
    });

    return unsubscribe;
  }, []);

  return null;
}
