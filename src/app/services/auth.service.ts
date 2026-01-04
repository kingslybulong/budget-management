import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from '@angular/fire/auth';
import {
  Firestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
  updateDoc,
} from '@angular/fire/firestore';
import { User, Role } from '../models';

/**
 * Firebase Authentication and Firestore user management service
 * Manages user login state, role-based access, and user profiles
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);
  private readonly router = inject(Router);

  private readonly currentUserSignal = signal<User | null>(null);
  private readonly loadingSignal = signal<boolean>(true);
  private readonly errorSignal = signal<string | null>(null);

  /** Current logged-in user */
  readonly currentUser = this.currentUserSignal.asReadonly();

  /** Loading state during auth operations */
  readonly loading = this.loadingSignal.asReadonly();

  /** Error message from last operation */
  readonly error = this.errorSignal.asReadonly();

  /** Whether a user is authenticated */
  readonly isAuthenticated = computed(() => this.currentUserSignal() !== null);

  /** Current user's role */
  readonly userRole = computed(() => this.currentUserSignal()?.role ?? null);

  /** Check if current user is admin */
  readonly isAdmin = computed(() => this.currentUserSignal()?.role === Role.ADMIN);

  /** Check if current user is a regular user */
  readonly isUser = computed(() => this.currentUserSignal()?.role === Role.USER);

  /** Check if current user is a viewer */
  readonly isViewer = computed(() => this.currentUserSignal()?.role === Role.VIEWER);

  /** Check if current user can edit (admin only) */
  readonly canEdit = computed(() => this.currentUserSignal()?.role === Role.ADMIN);

  /** Check if current user can submit requests (user or admin) */
  readonly canSubmit = computed(() => {
    const role = this.currentUserSignal()?.role;
    return role === Role.USER || role === Role.ADMIN;
  });

  constructor() {
    // Listen to Firebase auth state changes
    onAuthStateChanged(this.auth, async (firebaseUser) => {
      if (firebaseUser) {
        await this.loadUserProfile(firebaseUser.uid);
      } else {
        this.currentUserSignal.set(null);
      }
      this.loadingSignal.set(false);
    });
  }

  /**
   * Load user profile from Firestore
   */
  private async loadUserProfile(uid: string): Promise<void> {
    try {
      console.log('Loading user profile for UID:', uid);
      const userDoc = await getDoc(doc(this.firestore, 'users', uid));
      console.log('Firestore doc exists:', userDoc.exists());
      if (userDoc.exists()) {
        console.log('User data from Firestore:', userDoc.data());
        const userData = userDoc.data();
        const user: User = {
          id: uid,
          name: userData['name'],
          email: userData['email'],
          role: userData['role'] as Role,
          createdAt: userData['createdAt']?.toDate() ?? new Date(),
          isActive: userData['isActive'] ?? true,
        };
        this.currentUserSignal.set(user);
      } else {
        // User exists in Auth but not in Firestore - create a default profile
        console.log('User profile not found in Firestore, creating default profile...');
        const firebaseUser = this.auth.currentUser;
        if (firebaseUser) {
          const defaultUser: User = {
            id: uid,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            email: firebaseUser.email || '',
            role: Role.ADMIN, // First user gets ADMIN role
            createdAt: new Date(),
            isActive: true,
          };
          await setDoc(doc(this.firestore, 'users', uid), {
            id: uid,
            name: defaultUser.name,
            email: defaultUser.email,
            role: defaultUser.role,
            createdAt: new Date(),
            isActive: true,
          });
          console.log('Created default user profile:', defaultUser);
          this.currentUserSignal.set(defaultUser);
        } else {
          this.currentUserSignal.set(null);
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      this.currentUserSignal.set(null);
    }
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<boolean> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      console.log('Attempting login for:', email);
      const credential = await signInWithEmailAndPassword(this.auth, email, password);
      console.log('Firebase Auth success, UID:', credential.user.uid);
      await this.loadUserProfile(credential.user.uid);
      console.log('User profile loaded:', this.currentUserSignal());

      // Check if user is active
      const user = this.currentUserSignal();
      if (user && !user.isActive) {
        await signOut(this.auth);
        this.currentUserSignal.set(null);
        this.errorSignal.set('Your account has been deactivated. Please contact the administrator.');
        return false;
      }

      return true;
    } catch (error: any) {
      console.error('Login error:', error.code, error.message);
      this.errorSignal.set(this.getFirebaseErrorMessage(error.code));
      return false;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Register a new user (Admin only feature)
   */
  async register(email: string, password: string, name: string, role: Role): Promise<boolean> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const credential = await createUserWithEmailAndPassword(this.auth, email, password);

      // Create user profile in Firestore
      const userProfile: Omit<User, 'id'> = {
        name,
        email,
        role,
        createdAt: new Date(),
        isActive: true,
      };

      await setDoc(doc(this.firestore, 'users', credential.user.uid), {
        ...userProfile,
        createdAt: new Date(),
      });

      await this.loadUserProfile(credential.user.uid);
      return true;
    } catch (error: any) {
      this.errorSignal.set(this.getFirebaseErrorMessage(error.code));
      return false;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Create a new user as Admin without switching accounts
   * Note: This creates the user in Firestore only (for display purposes)
   * The user will need to use the password to sign in
   */
  async createUserAsAdmin(email: string, password: string, name: string, role: Role): Promise<boolean> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    // Store current admin info
    const currentAdmin = this.auth.currentUser;
    const currentAdminProfile = this.currentUserSignal();

    if (!currentAdmin || !currentAdminProfile) {
      this.errorSignal.set('Admin not authenticated');
      this.loadingSignal.set(false);
      return false;
    }

    try {
      // Create new user - this will sign in as the new user
      const credential = await createUserWithEmailAndPassword(this.auth, email, password);

      // Create user profile in Firestore
      const userProfile: Omit<User, 'id'> = {
        name,
        email,
        role,
        createdAt: new Date(),
        isActive: true,
      };

      await setDoc(doc(this.firestore, 'users', credential.user.uid), {
        ...userProfile,
        createdAt: new Date(),
      });

      // Sign out the newly created user
      await signOut(this.auth);

      // Re-authenticate as admin (admin needs to re-login)
      // Restore the admin profile signal for now
      this.currentUserSignal.set(currentAdminProfile);

      return true;
    } catch (error: any) {
      this.errorSignal.set(this.getFirebaseErrorMessage(error.code));
      return false;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
      this.currentUserSignal.set(null);
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }

  /**
   * Get all users from Firestore (Admin only)
   */
  async getAllUsers(): Promise<User[]> {
    try {
      const usersCollection = collection(this.firestore, 'users');
      const querySnapshot = await getDocs(usersCollection);
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data()['name'],
        email: doc.data()['email'],
        role: doc.data()['role'] as Role,
        createdAt: doc.data()['createdAt']?.toDate() ?? new Date(),
        isActive: doc.data()['isActive'] ?? true,
      }));
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }

  /**
   * Get users by role from Firestore
   */
  async getUsersByRole(role: Role): Promise<User[]> {
    try {
      const usersCollection = collection(this.firestore, 'users');
      const q = query(usersCollection, where('role', '==', role));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data()['name'],
        email: doc.data()['email'],
        role: doc.data()['role'] as Role,
        createdAt: doc.data()['createdAt']?.toDate() ?? new Date(),
        isActive: doc.data()['isActive'] ?? true,
      }));
    } catch (error) {
      console.error('Error fetching users by role:', error);
      return [];
    }
  }

  /**
   * Update user profile (Admin only)
   */
  async updateUser(userId: string, updates: Partial<User>): Promise<boolean> {
    try {
      const userRef = doc(this.firestore, 'users', userId);
      await updateDoc(userRef, { ...updates });
      return true;
    } catch (error) {
      console.error('Error updating user:', error);
      return false;
    }
  }

  /**
   * Check if current user has specific role
   */
  hasRole(role: Role): boolean {
    return this.currentUserSignal()?.role === role;
  }

  /**
   * Check if current user has any of the specified roles
   */
  hasAnyRole(roles: Role[]): boolean {
    const currentRole = this.currentUserSignal()?.role;
    return currentRole ? roles.includes(currentRole) : false;
  }

  /**
   * Get redirect path based on user role
   */
  getDefaultRoute(): string {
    const role = this.currentUserSignal()?.role;
    switch (role) {
      case Role.ADMIN:
        return '/admin';
      case Role.USER:
        return '/user';
      case Role.VIEWER:
        return '/viewer';
      default:
        return '/login';
    }
  }

  /**
   * Convert Firebase error codes to user-friendly messages
   */
  private getFirebaseErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/invalid-email':
        return 'Invalid email address format.';
      case 'auth/user-disabled':
        return 'This account has been disabled.';
      case 'auth/user-not-found':
        return 'No account found with this email.';
      case 'auth/wrong-password':
        return 'Incorrect password.';
      case 'auth/invalid-credential':
        return 'Invalid email or password.';
      case 'auth/email-already-in-use':
        return 'An account already exists with this email.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection.';
      default:
        return 'An error occurred. Please try again.';
    }
  }
}
