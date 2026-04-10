import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  FiMenu, FiX, FiChevronRight, FiUsers, FiBookOpen,
  FiGrid, FiZap, FiShield, FiLock, FiEye, FiGithub,
  FiTwitter, FiYoutube, FiDisc, FiLink, FiMessageCircle
} from "react-icons/fi";

const LandingPage = () => {
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("solutions");

  const handleGetStarted = () => {
    navigate("/login");
  };

  const solutions = [
    {
      icon: <FiBookOpen size={24} />,
      title: "Bibliothèque de Secrets",
      description: "Cinq catégories de connaissances ésotériques : Déblocage, Domptage, Ilham, Ouverture, Protection."
    },
    {
      icon: <FiLink size={24} />,
      title: "Hub de Liens",
      description: "Centralisez tous vos sites et applications favoris dans une interface élégante."
    },
    {
      icon: <FiMessageCircle size={24} />,
      title: "Messagerie Personnelle",
      description: "Un espace de discussion privé pour vos réflexions et notes importantes."
    }
  ];

  const products = [
    { category: "Déblocage", description: "Levez les blocages spirituels et énergétiques.", icon: <FiLock />, color: "#3b82f6" },
    { category: "Domptage", description: "Maîtrisez les forces invisibles.", icon: <FiZap />, color: "#f59e0b" },
    { category: "Ilham", description: "Recevez l'inspiration divine et les songes.", icon: <FiEye />, color: "#10b981" },
    { category: "Ouverture", description: "Ouvrez les portes de la chance et de l'abondance.", icon: <FiBookOpen />, color: "#8b5cf6" },
    { category: "Protection", description: "Boucliers sacrés contre les influences négatives.", icon: <FiShield />, color: "#ef4444" }
  ];

  const applications = [
    { name: "Secrets Mystiques", desc: "Explorez des formules et rituels ancestraux classés par objectif." },
    { name: "Liens Rapides", desc: "Vos sites préférés à portée de clic, avec icônes et descriptions." },
    { name: "Chat Privé", desc: "Discutez, notez, échangez avec vous-même ou vos proches." }
  ];

  const team = [
    { name: "Asrar Admin", role: "Gardien du Savoir", img: "https://ui-avatars.com/api/?name=Asrar+Admin&background=3b82f6&color=fff" },
    { name: "Maître Mystique", role: "Expert Rituels", img: "https://ui-avatars.com/api/?name=Maître+Mystique&background=8b5cf6&color=fff" },
    { name: "Sage Numérique", role: "Architecte du Hub", img: "https://ui-avatars.com/api/?name=Sage+Numérique&background=10b981&color=fff" },
    { name: "Guide Spirituel", role: "Conseiller Ésotérique", img: "https://ui-avatars.com/api/?name=Guide+Spirituel&background=f59e0b&color=fff" }
  ];

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="header-container">
          <div className="logo">
            <span className="logo-icon">✦</span>
            <span className="logo-text">ASRAR HUB</span>
          </div>

          <nav className={`main-nav ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <button className={`nav-link ${activeTab === 'solutions' ? 'active' : ''}`} onClick={() => { setActiveTab('solutions'); setMobileMenuOpen(false); }}>Solutions</button>
            <button className={`nav-link ${activeTab === 'products' ? 'active' : ''}`} onClick={() => { setActiveTab('products'); setMobileMenuOpen(false); }}>Produits</button>
            <button className={`nav-link ${activeTab === 'applications' ? 'active' : ''}`} onClick={() => { setActiveTab('applications'); setMobileMenuOpen(false); }}>Applications</button>
            {user ? (
              <button className="nav-cta" onClick={() => navigate("/dashboard")}>Accéder au Dashboard</button>
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
            <p className="hero-description">Accédez à des secrets ancestraux, organisez vos liens essentiels et communiquez en privé. Un espace sacré numérique.</p>
            <div className="hero-buttons">
              <button className="btn-primary" onClick={handleGetStarted}>Commencer gratuitement <FiChevronRight /></button>
              <button className="btn-secondary" onClick={() => setActiveTab('products')}>Découvrir les secrets</button>
            </div>
            <div className="hero-stats">
              <div className="stat-item"><span className="stat-number">5+</span><span className="stat-label">Catégories</span></div>
              <div className="stat-item"><span className="stat-number">100%</span><span className="stat-label">Sécurisé</span></div>
              <div className="stat-item"><span className="stat-number">24/7</span><span className="stat-label">Accessible</span></div>
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
          {activeTab === 'applications' && (
            <div className="applications-section">
              <div className="section-header"><h2>Applications intégrées</h2><p>Des outils puissants pour votre développement personnel.</p></div>
              <div className="apps-list">
                {applications.map((app, idx) => (
                  <div key={idx} className="app-item"><h4>{app.name}</h4><p>{app.desc}</p></div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="community-section">
        <div className="community-container">
          <div className="community-header"><h2>Rejoignez notre communauté</h2><p>Connectez-vous avec d'autres initiés et partagez vos expériences.</p></div>
          <div className="community-content">
            <div className="discord-card">
              <div className="discord-icon"><FiDisc size={32} /></div>
              <h3>ASRAR HUB Discord</h3>
              <p>Un espace en temps réel pour poser des questions, partager des découvertes et trouver du soutien.</p>
              <button className="btn-outline">Rejoindre</button>
            </div>
            <div className="team-grid">
              {team.map((member, idx) => (
                <div key={idx} className="team-card"><img src={member.img} alt={member.name} /><h4>{member.name}</h4><p className="team-role">{member.role}</p><p className="team-bio">Gardien des connaissances et contributeur actif.</p><div className="team-social"><FiTwitter size={16} /><FiGithub size={16} /></div></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-columns">
            <div className="footer-col"><h4>Séries Web</h4><ul><li>Introduction aux Secrets</li><li>Guides de Certification</li><li>Rituels Hebdomadaires</li></ul></div>
            <div className="footer-col"><h4>Podcasts</h4><ul><li>Voix de l'Invisible</li><li>Techniques Mystiques</li><li>État de l'Éveil</li></ul></div>
            <div className="footer-col"><h4>Contenus</h4><ul><li>Dictionnaire des Symboles</li><li>Rapport Annuel</li></ul></div>
            <div className="footer-col"><h4>Premium</h4><p>Essayez gratuitement pendant 14 jours.</p><button className="btn-small">Commencer</button></div>
          </div>
          <div className="footer-bottom"><div className="social-links"><FiTwitter size={20} /><FiYoutube size={20} /><FiGithub size={20} /></div><p className="copyright">© 2026 ASRAR HUB. Tous droits réservés.</p></div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;