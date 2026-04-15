import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  FiMenu, FiX, FiChevronRight, FiBookOpen, FiZap, FiShield,
  FiLock, FiEye, FiGithub, FiTwitter, FiYoutube, FiDisc,
  FiMessageCircle, FiMail, FiPhone, FiCalendar, FiStar, FiCheck
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";

const LandingPage = () => {
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("solutions");
  const [showExitPopup, setShowExitPopup] = useState(false);
  const [emailForm, setEmailForm] = useState({ name: "", email: "" });
  const [showFaq, setShowFaq] = useState(null);
  const exitIntentRef = useRef(false);

  const handleGetStarted = () => navigate("/login");

  // ✅ VOTRE NUMÉRO WHATSAPP (format international sans le +)
  const whatsappMessage = encodeURIComponent(
    "Bonjour, je suis intéressé(e) par ASRAR HUB et j'aimerais en savoir plus sur vos secrets mystiques."
  );
  const whatsappLink = `https://wa.me/221786144737?text=${whatsappMessage}`;

  // Pop-up d'intention de sortie
  useEffect(() => {
    const handleMouseLeave = (e) => {
      if (e.clientY <= 0 && !exitIntentRef.current) {
        exitIntentRef.current = true;
        setShowExitPopup(true);
      }
    };
    document.addEventListener("mouseleave", handleMouseLeave);
    return () => document.removeEventListener("mouseleave", handleMouseLeave);
  }, []);

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    // Ici, connectez à votre service d'email (Firebase, API, etc.)
    alert(`Merci ${emailForm.name} ! Votre guide vous sera envoyé à l'adresse indiquée.`);
    setShowExitPopup(false);
    setEmailForm({ name: "", email: "" });
  };

  const solutions = [
    {
      icon: <FiBookOpen size={24} />,
      title: "Bibliothèque de Secrets",
      description: "Accédez à des connaissances ésotériques classées par objectif. Déblocage, Domptage, Ilham, Ouverture, Protection."
    },
    {
      icon: <FiZap size={24} />,
      title: "Consultation Rapide",
      description: "Discutez directement avec un expert sur WhatsApp pour des conseils personnalisés."
    },
    {
      icon: <FiMail size={24} />,
      title: "Guide Gratuit",
      description: "Recevez notre PDF exclusif 'Les 7 clés de la spiritualité pratique' par email."
    }
  ];

  const products = [
    { category: "Déblocage", description: "Levez les blocages spirituels et énergétiques.", icon: <FiLock />, color: "#3b82f6" },
    { category: "Domptage", description: "Maîtrisez les forces invisibles.", icon: <FiZap />, color: "#f59e0b" },
    { category: "Ilham", description: "Recevez l'inspiration divine et les songes.", icon: <FiEye />, color: "#10b981" },
    { category: "Ouverture", description: "Ouvrez les portes de la chance.", icon: <FiBookOpen />, color: "#8b5cf6" },
    { category: "Protection", description: "Boucliers sacrés contre les influences négatives.", icon: <FiShield />, color: "#ef4444" }
  ];

  const testimonials = [
    { name: "Aïcha D.", text: "Grâce aux secrets de déblocage, ma vie professionnelle a complètement changé.", rating: 5 },
    { name: "Moussa K.", text: "Le chat en direct avec l'expert m'a rassuré immédiatement. Je recommande !", rating: 5 },
    { name: "Fatima B.", text: "Le PDF gratuit est une mine d'or. J'ai commencé à pratiquer dès le lendemain.", rating: 4 }
  ];

  const faqItems = [
    { q: "Comment accéder aux secrets ?", a: "Il vous suffit de créer un compte gratuit et de naviguer dans les catégories." },
    { q: "Les consultations WhatsApp sont-elles payantes ?", a: "La première consultation est offerte. Ensuite, des forfaits sont disponibles." },
    { q: "Mes données sont-elles sécurisées ?", a: "Absolument. Nous utilisons Firebase avec authentification Google et chiffrement." }
  ];

  return (
    <div className="landing-page">
      {/* Widget WhatsApp Flottant */}
      <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="whatsapp-float">
        <FaWhatsapp size={28} />
        <span className="whatsapp-tooltip">Discutez avec un expert</span>
      </a>

      {/* Pop-up d'intention de sortie */}
      {showExitPopup && (
        <div className="exit-popup-overlay" onClick={() => setShowExitPopup(false)}>
          <div className="exit-popup" onClick={(e) => e.stopPropagation()}>
            <button className="close-popup" onClick={() => setShowExitPopup(false)}><FiX /></button>
            <h3>🎁 Recevez votre Guide Gratuit</h3>
            <p>Inscrivez-vous pour obtenir "Les 7 clés de la spiritualité pratique"</p>
            <form onSubmit={handleEmailSubmit}>
              <input type="text" placeholder="Votre prénom" value={emailForm.name} onChange={(e) => setEmailForm({...emailForm, name: e.target.value})} required />
              <input type="email" placeholder="Votre email" value={emailForm.email} onChange={(e) => setEmailForm({...emailForm, email: e.target.value})} required />
              <button type="submit" className="btn-primary">Envoyez-moi le guide</button>
            </form>
            <p className="privacy-note">🔒 Vos données restent confidentielles</p>
          </div>
        </div>
      )}

      <header className="landing-header">
        <div className="header-container">
          <div className="logo">
            <span className="logo-icon">✦</span>
            <span className="logo-text">ASRAR HUB</span>
          </div>
          <nav className={`main-nav ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <button className={`nav-link ${activeTab === 'solutions' ? 'active' : ''}`} onClick={() => { setActiveTab('solutions'); setMobileMenuOpen(false); }}>Solutions</button>
            <button className={`nav-link ${activeTab === 'products' ? 'active' : ''}`} onClick={() => { setActiveTab('products'); setMobileMenuOpen(false); }}>Secrets</button>
            <button className={`nav-link ${activeTab === 'testimonials' ? 'active' : ''}`} onClick={() => { setActiveTab('testimonials'); setMobileMenuOpen(false); }}>Avis</button>
            <button className={`nav-link ${activeTab === 'faq' ? 'active' : ''}`} onClick={() => { setActiveTab('faq'); setMobileMenuOpen(false); }}>FAQ</button>
            {user ? (
              <button className="nav-cta" onClick={() => navigate("/dashboard")}>Dashboard</button>
            ) : (
              <button className="nav-cta" onClick={handleGetStarted}>Se connecter</button>
            )}
          </nav>
          <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>
      </header>

      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-title">Votre Portail vers <br /><span className="gradient-text">la Connaissance Mystique</span></h1>
            <p className="hero-description">Accédez à des secrets ancestraux et bénéficiez d'un accompagnement personnalisé.</p>
            <div className="hero-buttons">
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="btn-primary">
                <FaWhatsapp size={20} /> Discutez avec un expert
              </a>
              <button className="btn-secondary" onClick={() => setActiveTab('products')}>Découvrir les secrets</button>
            </div>
            <div className="hero-stats">
              <div className="stat-item"><span className="stat-number">5+</span><span className="stat-label">Catégories</span></div>
              <div className="stat-item"><span className="stat-number">100%</span><span className="stat-label">Sécurisé</span></div>
              <div className="stat-item"><span className="stat-number">24/7</span><span className="stat-label">Support</span></div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="dashboard-preview">
              <div className="preview-header"><span className="preview-dot"></span><span className="preview-dot"></span><span className="preview-dot"></span></div>
              <div className="preview-grid">
                <div className="preview-widget"></div><div className="preview-widget"></div>
                <div className="preview-widget"></div><div className="preview-widget"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="content-section">
        <div className="content-container">
          {activeTab === 'solutions' && (
            <div className="solutions-grid">
              <div className="section-header"><h2>Des solutions sur mesure</h2><p>Pour les chercheurs de vérité et les organisateurs du quotidien.</p></div>
              <div className="cards-grid">
                {solutions.map((sol, idx) => (
                  <div key={idx} className="solution-card"><div className="card-icon">{sol.icon}</div><h3>{sol.title}</h3><p>{sol.description}</p></div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <div className="products-showcase">
              <div className="section-header"><h2>Notre bibliothèque de secrets</h2><p>Explorez les cinq piliers de la connaissance mystique.</p></div>
              <div className="products-grid">
                {products.map((prod, idx) => (
                  <div key={idx} className="product-card" style={{ '--accent': prod.color }}><div className="product-icon">{prod.icon}</div><h3>{prod.category}</h3><p>{prod.description}</p></div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'testimonials' && (
            <div className="testimonials-section">
              <div className="section-header"><h2>Ce que disent nos utilisateurs</h2></div>
              <div className="testimonials-grid">
                {testimonials.map((t, idx) => (
                  <div key={idx} className="testimonial-card">
                    <div className="stars">{Array(t.rating).fill(<FiStar size={16} fill="#fbbf24" color="#fbbf24" />)}</div>
                    <p>"{t.text}"</p>
                    <span className="author">— {t.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'faq' && (
            <div className="faq-section">
              <div className="section-header"><h2>Questions fréquentes</h2></div>
              <div className="faq-list">
                {faqItems.map((item, idx) => (
                  <div key={idx} className="faq-item">
                    <button className="faq-question" onClick={() => setShowFaq(showFaq === idx ? null : idx)}>
                      <span>{item.q}</span>
                      <FiChevronRight className={`faq-icon ${showFaq === idx ? 'open' : ''}`} />
                    </button>
                    {showFaq === idx && <div className="faq-answer"><p>{item.a}</p></div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="social-proof-section">
        <div className="social-proof-container">
          <div className="trust-badges">
            <div className="badge"><FiCheck /> Paiement 100% sécurisé</div>
            <div className="badge"><FiCheck /> Support WhatsApp 24/7</div>
            <div className="badge"><FiCheck /> Données chiffrées</div>
          </div>
          <div className="partners">
            <p>Ils nous font confiance :</p>
            <div className="partner-logos">
              <span>🔮 Mystic Academy</span>
              <span>🌙 Spiritualité Moderne</span>
              <span>✨ Éveil Cosmique</span>
            </div>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-columns">
            <div className="footer-col">
              <h4>Contact</h4>
              <ul>
                <li><FiMail /> prozizou298@gmail.com</li>
                <li><FiPhone /> +221 78 614 47 37</li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Réseaux</h4>
              <div className="footer-social"><FiTwitter size={20} /><FiYoutube size={20} /><FiDisc size={20} /></div>
            </div>
            <div className="footer-col">
              <h4>Légal</h4>
              <ul>
                <li>Mentions légales</li>
                <li>Confidentialité</li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p className="copyright">© 2026 ASRAR HUB. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;