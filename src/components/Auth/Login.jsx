import { auth, googleProvider } from "../../firebase";
import { signInWithPopup } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";

const Login = () => {
  const navigate = useNavigate();

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      // Redirection explicite après succès
      navigate("/dashboard");
    } catch (err) {
      console.error("Erreur de connexion:", err);
      alert("Échec de la connexion. Vérifiez la console.");
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>🔐 Asrar Hub</h1>
        <p>Votre centre de données personnel</p>
        <button onClick={signInWithGoogle} className="google-btn">
          <FcGoogle size={24} /> Se connecter avec Google
        </button>
        <p style={{ fontSize: '0.8rem', marginTop: '2rem', opacity: 0.5 }}>
          Accès privé · Vos données sont sécurisées
        </p>
      </div>
    </div>
  );
};

export default Login;