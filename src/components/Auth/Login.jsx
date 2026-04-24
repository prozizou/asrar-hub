import { useEffect } from "react";
import { auth, googleProvider } from "../../firebase";
import { signInWithPopup } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import { FiCreditCard, FiShield, FiUnlock, FiStar, FiCheck } from "react-icons/fi";

const Login = () => {
  const navigate = useNavigate();

  // CHARGEMENT DYNAMIQUE DU SCRIPT TOUCHPAY
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://touchpay.gutouch.com/touchpayv2/script/prod_touchpay-0.0.1.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      navigate("/dashboard");
    } catch (err) {
      console.error("Erreur de connexion:", err);
      alert("Échec de la connexion.");
    }
  };

 // FONCTION DE PAIEMENT TOUCHPAY MISE À JOUR
  const handlePayment = (amount, durationStr = "Abonnement") => {
    if (typeof window.SendPaymentInfos === "function") {
      const order_number = `CMD-${durationStr}-${Date.now()}`;
      const agency_code = "VOTRE_CODE_AGENCE"; 
      const secure_code = "VOTRE_CODE_SECURE"; 
      const domain_name = window.location.hostname;
      
      // LE TICKET DE CAISSE EST ICI 👇
      const encodedEmail = encodeURIComponent(user?.email || "client@email.com");
      const url_redirection_success = `${window.location.origin}/dashboard?payment=success&duration=${durationStr}&order=${order_number}&email=${encodedEmail}`;
      const url_redirection_failed = window.location.origin;
      
      const city = "Dakar"; 
      const email = user?.email || "client@email.com";
      const clientFirstName = user?.displayName?.split(' ')[0] || "Client";
      const clientLastName = user?.displayName?.split(' ')[1] || "VIP";
      const clientPhone = "221000000000";

      window.SendPaymentInfos(
        order_number, agency_code, secure_code, domain_name,
        url_redirection_success, url_redirection_failed, amount,
        city, email, clientFirstName, clientLastName, clientPhone
      );
    } else {
      alert("Le système de paiement charge. Veuillez patienter.");
    }
  };

  return (
    <div className="login-container" style={{ flexDirection: 'column', padding: '3rem 1rem', overflowX: 'hidden' }}>
      
      {/* --- SECTION HAUT : CONNEXION GRATUITE --- */}
      <div className="login-card" style={{ width: '100%', maxWidth: '450px', borderTop: '4px solid #10b981', margin: '0 auto 3rem auto', zIndex: 10 }}>
        <div style={{ color: '#10b981', marginBottom: '1rem' }}><FiUnlock size={40} /></div>
        <h1 style={{ fontSize: '2rem', color: 'white' }}>Accès Gratuit</h1>
        <p style={{ color: '#9ca3af', marginBottom: '2rem', fontSize: '1rem', lineHeight: '1.6' }}>
          Connectez-vous librement pour accéder à la <strong>Communauté</strong>, au <strong>Chat</strong>, et à un aperçu des <strong>Secrets Mystiques</strong>.
        </p>
        <button onClick={signInWithGoogle} className="google-btn" style={{ padding: '14px 20px', fontSize: '1.05rem' }}>
          <FcGoogle size={24} /> Continuer avec Google
        </button>
        <p style={{ fontSize: '0.85rem', marginTop: '1.5rem', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <FiShield /> Connexion simple et sécurisée
        </p>
      </div>

      {/* --- SECTION BAS : CARROUSEL DES ABONNEMENTS VIP --- */}
      <div style={{ width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <FiStar color="#3b82f6" /> Pass Universel VIP
          </h2>
          <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Valable sur toutes les applications de l'écosystème</p>
        </div>

        {/* Le conteneur du Carrousel Horizontal */}
        <div 
          style={{ 
            display: 'flex', 
            overflowX: 'auto', 
            gap: '1.5rem', 
            paddingBottom: '2rem',
            paddingTop: '1rem',
            paddingLeft: '0.5rem',
            paddingRight: '0.5rem',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch', // Scroll fluide sur iOS
            scrollbarWidth: 'none' // Cache la scrollbar sur Firefox
          }}
          className="hide-scrollbar" // On peut aussi utiliser une classe CSS si besoin
        >
          
          {/* CARTE 1 : 3 MOIS */}
          <div style={{ flex: '0 0 auto', width: '280px', scrollSnapAlign: 'center', background: 'rgba(20, 30, 45, 0.7)', borderRadius: '24px', padding: '2rem 1.5rem', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', backdropFilter: 'blur(12px)' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#9ca3af' }}>3 Mois</h3>
            <h2 style={{ fontSize: '2rem', margin: '1rem 0', color: 'white' }}>15 000 <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>FCFA</span></h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem 0', textAlign: 'left', color: '#cbd5e1', fontSize: '0.9rem' }}>
              <li style={{ marginBottom: '8px' }}><FiCheck color="#10b981" /> Accès illimité aux secrets</li>
              <li style={{ marginBottom: '8px' }}><FiCheck color="#10b981" /> Valable sur toutes les apps</li>
            </ul>
            <button onClick={() => handlePayment(15000, "3M")} style={{ width: '100%', background: 'transparent', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.2)', padding: '12px', borderRadius: '14px', cursor: 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
              <FiCreditCard /> Souscrire
            </button>
          </div>

          {/* CARTE 2 : 6 MOIS (MISE EN AVANT) */}
          <div style={{ flex: '0 0 auto', width: '280px', scrollSnapAlign: 'center', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '24px', padding: '2rem 1.5rem', border: '2px solid #3b82f6', textAlign: 'center', backdropFilter: 'blur(12px)', transform: 'scale(1.02)' }}>
            <div style={{ background: '#3b82f6', color: 'white', fontSize: '0.75rem', fontWeight: 'bold', padding: '4px 12px', borderRadius: '20px', display: 'inline-block', marginBottom: '1rem' }}>POPULAIRE</div>
            <h3 style={{ fontSize: '1.4rem', color: 'white' }}>6 Mois</h3>
            <h2 style={{ fontSize: '2.2rem', margin: '1rem 0', color: '#3b82f6' }}>25 000 <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>FCFA</span></h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem 0', textAlign: 'left', color: '#cbd5e1', fontSize: '0.9rem' }}>
              <li style={{ marginBottom: '8px' }}><FiCheck color="#3b82f6" /> Tous les avantages VIP</li>
              <li style={{ marginBottom: '8px' }}><FiCheck color="#3b82f6" /> Économie de 5 000 FCFA</li>
            </ul>
            <button onClick={() => handlePayment(25000, "6M")} style={{ width: '100%', background: '#3b82f6', color: 'white', border: 'none', padding: '12px', borderRadius: '14px', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onMouseOver={e => e.currentTarget.style.background = '#2563eb'} onMouseOut={e => e.currentTarget.style.background = '#3b82f6'}>
              <FiCreditCard /> Payer via TouchPay
            </button>
          </div>

          {/* CARTE 3 : 1 AN */}
          <div style={{ flex: '0 0 auto', width: '280px', scrollSnapAlign: 'center', background: 'rgba(20, 30, 45, 0.7)', borderRadius: '24px', padding: '2rem 1.5rem', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', backdropFilter: 'blur(12px)' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#9ca3af' }}>1 An</h3>
            <h2 style={{ fontSize: '2rem', margin: '1rem 0', color: 'white' }}>45 000 <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>FCFA</span></h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem 0', textAlign: 'left', color: '#cbd5e1', fontSize: '0.9rem' }}>
              <li style={{ marginBottom: '8px' }}><FiCheck color="#10b981" /> Tous les avantages VIP</li>
              <li style={{ marginBottom: '8px' }}><FiCheck color="#10b981" /> Économie de 15 000 FCFA</li>
            </ul>
            <button onClick={() => handlePayment(45000, "1A")} style={{ width: '100%', background: 'transparent', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.2)', padding: '12px', borderRadius: '14px', cursor: 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
              <FiCreditCard /> Souscrire
            </button>
          </div>

        </div>
        
        {/* Style embarqué pour s'assurer que la barre de défilement est invisible sur les navigateurs basés sur webkit (Chrome, Safari) */}
        <style dangerouslySetInnerHTML={{__html: `
          .login-container ::-webkit-scrollbar { display: none; }
        `}} />
      </div>

    </div>
  );
};

export default Login;