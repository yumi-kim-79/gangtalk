import { useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  type FirebaseAuthTypes,
} from '@react-native-firebase/auth';
import { auth } from '@/services/firebase';

export function useAuth() {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, next => {
      setUser(next);
      setInitializing(false);
    });
  }, []);

  return { user, initializing, isLoggedIn: user !== null };
}
