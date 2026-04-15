import { auth } from "../firebase";

const ADMIN_EMAIL = "prozizou298@gmail.com";

export const useAdmin = () => {
  // On récupère l'utilisateur de manière synchrone, sans créer d'écouteur lourd
  const user = auth.currentUser;
  return user?.email === ADMIN_EMAIL;
};