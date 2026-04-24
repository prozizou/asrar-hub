import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { FiMenu, FiX, FiCheck, FiCreditCard, FiStar, FiGrid, FiUnlock, FiShield } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";

const LandingPage = () => {
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const whatsappMessage = encodeURIComponent("Bonjour, j'aimerais en savoir plus sur les abonnements VIP ASRAR HUB.");
  const whatsappLink = `https://wa.me/221786144737?text=${whatsappMessage}`;

  // CHARGEMENT DU SCRIPT TOUCHPAY
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://touchpay.gutouch.com/touchpayv2/script/prod_touchpay-0.0.1.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { if (document.body.contains(script)) document.body.removeChild(script); };
  }, []);

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
    <div className="landing-page" style={{ scrollBehavior: 'smooth' }}>
      <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="whatsapp-float">
        <FaWhatsapp size={28} />
      </a>

      {/* HEADER SIMPLIFIÉ */}
      <header className="landing-header">
        <div className="header-container">
          <div className="logo" onClick={() => window.scrollTo(0,0)} style={{ cursor: 'pointer' }}>
            <span className="logo-icon">✦</span>
            <span className="logo-text">ASRAR HUB</span>
          </div>
          <nav className={`main-nav ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <a href="#ecosysteme" className="nav-link" onClick={() => setMobileMenuOpen(false)}>L'Écosystème</a>
            <a href="#tarifs" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Devenir VIP</a>
            {user ? (
              <button className="nav-cta" onClick={() => navigate("/dashboard")}>Mon Espace</button>
            ) : (
              <button className="nav-cta" onClick={() => navigate("/login")}>Se connecter</button>
            )}
          </nav>
          <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="hero-section" style={{ paddingTop: '6rem', paddingBottom: '4rem', textAlign: 'center' }}>
        <div className="hero-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '800px', margin: '0 auto' }}>
          <h1 className="hero-title" style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>
            Le Portail de la <br /><span className="gradient-text">Connaissance Mystique</span>
          </h1>
          <p className="hero-description" style={{ fontSize: '1.2rem', marginBottom: '2.5rem', maxWidth: '600px' }}>
            Accédez à des secrets ancestraux, discutez avec la communauté et profitez de toutes nos applications depuis un seul et même endroit.
          </p>
          <div className="hero-buttons" style={{ justifyContent: 'center' }}>
            <button className="btn-primary" onClick={() => navigate("/login")}>
              Accéder gratuitement
            </button>
            <a href="#tarifs" className="btn-secondary">
              Voir le Pass Universel
            </a>
          </div>
        </div>
      </section>

      {/* SECTION ÉCOSYSTÈME */}
      <section id="ecosysteme" className="content-section" style={{ background: 'rgba(255,255,255,0.02)', padding: '5rem 2rem' }}>
        <div className="content-container">
          <div className="section-header" style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontSize: '2.5rem' }}>Tout en un seul endroit</h2>
            <p>Une plateforme pensée pour votre développement spirituel.</p>
          </div>
          
          <div className="cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            <div className="solution-card">
              <div className="card-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}><FiUnlock size={24} /></div>
              <h3>Secrets Mystiques</h3>
              <p>Déblocage, ouverture, protection. Accédez à 5 secrets gratuits par catégorie, ou débloquez l'intégralité avec le Pass VIP.</p>
            </div>
            <div className="solution-card">
              <div className="card-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}><FiGrid size={24} /></div>
              <h3>Toutes nos Applications</h3>
              <p>Calligraphie, compteurs, et bien plus. Le hub centralise toutes les ressources et applications de notre écosystème.</p>
            </div>
            <div className="solution-card">
              <div className="card-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}><FiStar size={24} /></div>
              <h3>Communauté & Suivi</h3>
              <p>Un journal personnel pour vos zikrs et visions, et un espace pour échanger avec d'autres chercheurs de vérité.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION TARIFS (PASS UNIVERSEL) */}
      <section id="tarifs" className="tarifs-section" style={{ padding: '6rem 2rem' }}>
        <div className="content-container">
          <div className="section-header" style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <span style={{ display: 'inline-block', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '6px 16px', borderRadius: '30px', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '1rem' }}>PASS UNIVERSEL</span>
            <h2 style={{ fontSize: '2.5rem' }}>Débloquez tout l'écosystème</h2>
            <p>Un seul abonnement valable sur <strong>toutes les applications</strong> et secrets du site.</p>
          </div>

          <div className="cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', alignItems: 'center' }}>
            
            {/* 3 MOIS */}
            <div className="solution-card" style={{ textAlign: 'center', background: 'rgba(20, 30, 45, 0.6)' }}>
              <h3 style={{ fontSize: '1.2rem', color: '#9ca3af' }}>3 Mois</h3>
              <h2 style={{ fontSize: '2.5rem', margin: '1.5rem 0', color: 'white' }}>15 000 <span style={{ fontSize: '1rem', color: '#6b7280' }}>FCFA</span></h2>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0', textAlign: 'left', color: '#cbd5e1' }}>
                <li style={{ marginBottom: '10px' }}><FiCheck color="#10b981" /> Accès illimité aux secrets</li>
                <li style={{ marginBottom: '10px' }}><FiCheck color="#10b981" /> Valable sur toutes les apps</li>
                <li style={{ marginBottom: '10px' }}><FiCheck color="#10b981" /> Support prioritaire</li>
              </ul>
              <button className="btn-secondary" onClick={() => handlePayment(15000, "3M")} style={{ width: '100%' }}>Souscrire</button>
            </div>

            {/* 6 MOIS (POPULAIRE) */}
            <div className="solution-card" style={{ textAlign: 'center', borderTop: '4px solid #3b82f6', background: 'rgba(59, 130, 246, 0.05)', transform: 'scale(1.05)', zIndex: 10 }}>
              <div style={{ background: '#3b82f6', color: 'white', fontSize: '0.8rem', fontWeight: 'bold', padding: '4px 12px', borderRadius: '20px', display: 'inline-block', marginBottom: '1rem' }}>RECOMMANDÉ</div>
              <h3 style={{ fontSize: '1.5rem', color: 'white' }}>6 Mois</h3>
              <h2 style={{ fontSize: '3rem', margin: '1rem 0', color: '#3b82f6' }}>25 000 <span style={{ fontSize: '1rem', color: '#6b7280' }}>FCFA</span></h2>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0', textAlign: 'left', color: '#cbd5e1' }}>
                <li style={{ marginBottom: '10px' }}><FiCheck color="#3b82f6" /> Tous les avantages VIP</li>
                <li style={{ marginBottom: '10px' }}><FiCheck color="#3b82f6" /> Valable sur toutes les apps</li>
                <li style={{ marginBottom: '10px' }}><FiCheck color="#3b82f6" /> Économie de 5 000 FCFA</li>
              </ul>
              <button className="btn-primary" onClick={() => handlePayment(25000, "6M")} style={{ width: '100%', justifyContent: 'center' }}><FiCreditCard /> Payer avec TouchPay</button>
            </div>

            {/* 1 AN */}
            <div className="solution-card" style={{ textAlign: 'center', background: 'rgba(20, 30, 45, 0.6)' }}>
              <h3 style={{ fontSize: '1.2rem', color: '#9ca3af' }}>1 An</h3>
              <h2 style={{ fontSize: '2.5rem', margin: '1.5rem 0', color: 'white' }}>45 000 <span style={{ fontSize: '1rem', color: '#6b7280' }}>FCFA</span></h2>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0', textAlign: 'left', color: '#cbd5e1' }}>
                <li style={{ marginBottom: '10px' }}><FiCheck color="#10b981" /> Tous les avantages VIP</li>
                <li style={{ marginBottom: '10px' }}><FiCheck color="#10b981" /> Valable sur toutes les apps</li>
                <li style={{ marginBottom: '10px' }}><FiCheck color="#10b981" /> Économie de 15 000 FCFA</li>
              </ul>
              <button className="btn-secondary" onClick={() => handlePayment(45000, "1A")} style={{ width: '100%' }}>Souscrire</button>
            </div>

          </div>
          <p style={{ textAlign: 'center', marginTop: '2rem', color: '#6b7280', fontSize: '0.9rem' }}>
            <FiShield /> Paiement 100% sécurisé via Wave, Orange Money, Free Money ou Carte Bancaire.
          </p>
        </div>
      </section>

      {/* FOOTER ULTRA SIMPLE */}
      <footer className="landing-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '2rem', textAlign: 'center' }}>
        <p className="copyright" style={{ color: '#6b7280', margin: 0 }}>© 2026 ASRAR HUB. Tous droits réservés.</p>
        <p style={{ color: '#4b5563', fontSize: '0.85rem', marginTop: '8px' }}>Support: prozizou298@gmail.com | +221 78 614 47 37</p>
      </footer>
    </div>
  );
};

export default LandingPage;