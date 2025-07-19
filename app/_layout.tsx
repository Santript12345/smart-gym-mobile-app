// app/_layout.tsx
import { Stack } from 'expo-router';
import { FirebaseAuthListener } from '../components/FirebaseAuthListener';

export default function RootLayout() {
  return (
    <>
      <FirebaseAuthListener />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
