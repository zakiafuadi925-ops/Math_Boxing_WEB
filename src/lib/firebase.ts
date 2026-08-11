import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfigData from '../../firebase-applet-config.json';

// Initialize Firebase
const firebaseConfig = {
  apiKey: firebaseConfigData.apiKey,
  authDomain: firebaseConfigData.authDomain,
  projectId: firebaseConfigData.projectId,
  storageBucket: firebaseConfigData.storageBucket,
  messagingSenderId: firebaseConfigData.messagingSenderId,
  appId: firebaseConfigData.appId,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use named database if specified in config, otherwise default
export const db = firebaseConfigData.firestoreDatabaseId
  ? getFirestore(app, firebaseConfigData.firestoreDatabaseId)
  : getFirestore(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export interface PlayerProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  lifetimeScore: number;
  selectedSkinId: string;
  diamonds?: number;
  purchasedSkins?: string[];
  purchasedArenas?: string[];
  purchasedAttributes?: string[];
  equippedArena?: string;
  equippedAttribute?: string;
}

// Google Sign-In helper
export async function signInWithGoogle(): Promise<PlayerProfile | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    if (!user) return null;

    // Check or create profile in Firestore
    const userDocRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userDocRef);

    let localLifetime = 0;
    let localSkin = 'classic';
    try {
      const savedScore = localStorage.getItem('mb_lifetime_score');
      if (savedScore) localLifetime = parseInt(savedScore, 10) || 0;
      const savedSkin = localStorage.getItem('mb_selected_skin');
      if (savedSkin) localSkin = savedSkin;
    } catch (e) {
      console.error('LocalStorage read error:', e);
    }

    if (!userSnap.exists()) {
      // First time login - save initial user profile
      const newProfile: PlayerProfile = {
        uid: user.uid,
        displayName: user.displayName || user.email?.split('@')[0] || 'Petinju',
        email: user.email || '',
        photoURL: user.photoURL || '',
        lifetimeScore: localLifetime,
        selectedSkinId: localSkin,
        diamonds: 100, // Welcome gift 100 diamonds
        purchasedSkins: ['rookie_red'],
        purchasedArenas: ['classic_ring'],
        purchasedAttributes: [],
        equippedArena: 'classic_ring',
        equippedAttribute: 'none',
      };

      await setDoc(userDocRef, {
        ...newProfile,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      });

      return newProfile;
    } else {
      // Existing user - fetch remote profile, sync score if local is higher
      const data = userSnap.data();
      const remoteLifetime = data.lifetimeScore || 0;
      const remoteSkin = data.selectedSkinId || 'classic';

      const finalLifetime = Math.max(localLifetime, remoteLifetime);
      const finalSkin = localSkin !== 'classic' ? localSkin : remoteSkin;

      await setDoc(
        userDocRef,
        {
          displayName: user.displayName || data.displayName,
          photoURL: user.photoURL || data.photoURL,
          lifetimeScore: finalLifetime,
          selectedSkinId: finalSkin,
          lastLoginAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Update local storage to match synced state
      localStorage.setItem('mb_lifetime_score', finalLifetime.toString());
      localStorage.setItem('mb_selected_skin', finalSkin);

      return {
        uid: user.uid,
        displayName: user.displayName || data.displayName || 'Petinju',
        email: user.email || '',
        photoURL: user.photoURL || data.photoURL || '',
        lifetimeScore: finalLifetime,
        selectedSkinId: finalSkin,
        diamonds: data.diamonds ?? 100,
        purchasedSkins: data.purchasedSkins || ['rookie_red'],
        purchasedArenas: data.purchasedArenas || ['classic_ring'],
        purchasedAttributes: data.purchasedAttributes || [],
        equippedArena: data.equippedArena || 'classic_ring',
        equippedAttribute: data.equippedAttribute || 'none',
      };
    }
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
}

// Save profile updates to Firestore
export async function syncUserProfileToFirestore(
  uid: string,
  lifetimeScore: number,
  selectedSkinId: string,
  diamonds?: number,
  equippedArena?: string,
  equippedAttribute?: string
) {
  try {
    if (!uid) return;
    const userDocRef = doc(db, 'users', uid);
    const updateData: Record<string, any> = {
      lifetimeScore,
      selectedSkinId,
      updatedAt: serverTimestamp(),
    };
    if (diamonds !== undefined) updateData.diamonds = diamonds;
    if (equippedArena) updateData.equippedArena = equippedArena;
    if (equippedAttribute) updateData.equippedAttribute = equippedAttribute;

    await setDoc(userDocRef, updateData, { merge: true });
  } catch (e) {
    console.error('Error syncing profile to Firestore:', e);
  }
}

// Fetch a user profile from Firestore by UID
export async function getUserProfile(uid: string): Promise<PlayerProfile | null> {
  try {
    if (!uid) return null;
    const userDocRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      const data = userSnap.data();
      return {
        uid,
        displayName: data.displayName || 'Petinju',
        email: data.email || '',
        photoURL: data.photoURL || '',
        lifetimeScore: data.lifetimeScore || 0,
        selectedSkinId: data.selectedSkinId || 'rookie_red',
        diamonds: data.diamonds ?? 100,
        purchasedSkins: data.purchasedSkins || ['rookie_red'],
        purchasedArenas: data.purchasedArenas || ['classic_ring'],
        purchasedAttributes: data.purchasedAttributes || [],
        equippedArena: data.equippedArena || 'classic_ring',
        equippedAttribute: data.equippedAttribute || 'none',
      };
    }
  } catch (e) {
    console.error('Error fetching user profile:', e);
  }
  return null;
}

// Sign out helper
export async function signOutPlayer(): Promise<void> {
  await firebaseSignOut(auth);
}

// Auth State listener
export function subscribeToAuthChanges(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}
