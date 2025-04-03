import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDhWB9tPOg7Bsb2IaNjke8rkOB8i08OvvE",
  authDomain: "onlineartfestival-com.firebaseapp.com",
  projectId: "onlineartfestival-com",
  appId: "1:513917944286:web:b766fb1dca1d203cd7dd4f"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
export default app;