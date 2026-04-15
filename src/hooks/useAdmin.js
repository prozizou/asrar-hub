import { auth } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";

const ADMIN_EMAIL = "prozizou298@gmail.com";

export const useAdmin = () => {
  const [user] = useAuthState(auth);
  return user?.email === ADMIN_EMAIL;
};