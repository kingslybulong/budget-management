import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';

const firebaseConfig = {
  projectId: 'hbm-system',
  appId: '1:178794951090:web:61822910f9f24c9d0874ab',
  storageBucket: 'hbm-system.firebasestorage.app',
  apiKey: 'AIzaSyA7_YT_Hg8OZftHeT5VEXLVoyU5pk9zqeg',
  authDomain: 'hbm-system.firebaseapp.com',
  messagingSenderId: '178794951090',
  measurementId: 'G-3Q6PM2NKXS',
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
  ],
};
