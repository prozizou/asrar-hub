import { useState, useEffect } from "react";
import { ref, onValue, push, remove, update, set } from "firebase/database";
import { db, auth } from "../../firebase";
import { FiBookOpen, FiChevronRight, FiX, FiFile, FiLock, FiUnlock, FiZap, FiEye, FiShield, FiPlus, FiTrash2, FiEdit2, FiGrid, FiList, FiMaximize2, FiMinimize2, FiStar } from "react-icons/fi";
import { useAdmin } from "../../hooks/useAdmin";
import CloudinaryUploader from "../CloudinaryUploader";
import { useNavigate } from "react-router-dom"; // Pour la redirection VIP

const MixedText = ({ text }) => { /* ... Identique ... */
  if (!text) return null;
  const lines = text.split('\n');
  const arabicPhraseRegex = /([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+(?:[\s،؛\?\!\.\,]+[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+)*)/g;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const renderLine = (line, lineIndex) => {
    if (!line.trim()) return <br key={lineIndex} />;
    const segments = line.split(arabicPhraseRegex);
    return (<div key={lineIndex} style={{ marginBottom: '0.8rem' }}>{segments.map((seg, idx) => {
          if (!seg || seg.trim().length === 0) return null;
          if (urlRegex.test(seg)) { return (<div key={idx} dir="auto" style={{ textAlign: 'start', marginBottom: '0.4rem', lineHeight: '1.6' }}>{seg.split(urlRegex).map((part, i) => urlRegex.test(part) ? (<a key={i} href={part} target="_blank" rel="noopener noreferrer" className="secret-link">{part}</a>) : (<span key={i}>{part}</span>))}</div>); }
          return (<div key={idx} dir="auto" style={{ textAlign: 'start', marginBottom: '0.4rem', unicodeBidi: 'plaintext', lineHeight: '1.6' }}>{seg.trim()}</div>);
        })}</div>);
  };
  return <div className="secret-text-container">{lines.map((line, idx) => renderLine(line, idx))}</div>;
};

const MediaPreview = ({ url }) => { /* ... Identique ... */
  if (!url) return null;
  const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
  const isAudio = /\.(mp3|wav|ogg|m4a)$/i.test(url);
  if (isImage) return <img src={url} alt="Preview" style={{ maxWidth: '100%', borderRadius: '12px', marginTop: '16px' }} />;
  if (isAudio) return <audio controls src={url} style={{ width: '100%', marginTop: '16px' }} />;
  return <div className="file-link"><FiFile /> <a href={url} target="_blank" rel="noopener noreferrer">Ouvrir le fichier</a></div>;
};

const CATEGORIES = [
  { key: "db_sirr_deblocage", label: "Déblocage", icon: <FiUnlock />, color: "#3b82f6" },
  { key: "db_sirr_domptage", label: "Domptage", icon: <FiZap />, color: "#f59e0b" },
  { key: "db_sirr_ilham", label: "Ilham", icon: <FiEye />, color: "#10b981" },
  { key: "db_sirr_ouverture", label: "Ouverture", icon: <FiBookOpen />, color: "#8b5cf6" },
  { key: "db_sirr_protection", label: "Protection", icon: <FiShield />, color: "#ef4444" }
];

const WidgetSecrets = ({ isExpanded, onToggleExpand }) => {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].key);
  const [secrets, setSecrets] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedSecret, setSelectedSecret] = useState(null);
  const [viewMode, setViewMode] = useState("list"); 
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ faida: "", sirr: "", mediaUrl: "", category: CATEGORIES[0].key });
  
  const user = auth.currentUser;
  const isAdmin = useAdmin();
  const navigate = useNavigate();

 // --- NOUVELLE VÉRIFICATION VIP (via allowedUsers et Date d'expiration) ---
  const [isVip, setIsVip] = useState(false);

  useEffect(() => {
    if (!user || !user.email) return;
    
    // Firebase n'accepte pas les points '.' dans les clés, on les remplace par des virgules ','
    const emailKey = user.email.replace(/\./g, ',');
    const vipRef = ref(db, `allowedUsers/${emailKey}`);
    
    const unsubscribe = onValue(vipRef, (snapshot) => {
      const val = snapshot.val();
      
      if (val === true) {
        // Accès illimité / Administrateur
        setIsVip(true);
      } else if (typeof val === 'number' && val > Date.now()) {
        // Le timestamp d'expiration est supérieur à la date actuelle = Actif
        setIsVip(true);
      } else {
        // Expiré ou inexistant
        setIsVip(false);
      }
    });
    
    return () => unsubscribe();
  }, [user]);
  // -------------------------------------------------------------------------

  useEffect(() => {
    const timeoutId = setTimeout(() => { setLoading(false); }, 3000);
    const unsubscribes = CATEGORIES.map(cat => {
      const catRef = ref(db, cat.key);
      return onValue(catRef, 
        (snapshot) => { setSecrets(prevSecrets => ({ ...prevSecrets, [cat.key]: snapshot.val() || {} })); setLoading(false); },
        (error) => { setLoading(false); }
      );
    });
    return () => { clearTimeout(timeoutId); unsubscribes.forEach(unsubscribe => unsubscribe()); };
  }, []);

  const getCurrentSecrets = () => {
    const categoryData = secrets[activeCategory];
    if (!categoryData) return [];
    let allSecrets = Object.entries(categoryData)
      .map(([id, value]) => ({ id, ...value }))
      .filter(item => item.faida && item.sirr)
      .sort((a, b) => (a.faida || "").localeCompare(b.faida || ""));
    
    // NOUVEAU : LIMITE FREEMIUM À 5 SECRETS
    if (!isAdmin && !isVip) {
      return allSecrets.slice(0, 5);
    }
    return allSecrets;
  };

  const getHiddenSecretsCount = () => {
    if (isAdmin || isVip) return 0;
    const categoryData = secrets[activeCategory];
    if (!categoryData) return 0;
    const total = Object.keys(categoryData).length;
    return total > 5 ? total - 5 : 0;
  };

  const currentSecrets = getCurrentSecrets();
  const hiddenCount = getHiddenSecretsCount();
  const activeCategoryInfo = CATEGORIES.find(c => c.key === activeCategory);

  const openDetail = (secret) => setSelectedSecret(secret);
  const closeDetail = () => setSelectedSecret(null);

  const handleAddOrUpdate = async (e) => {
    e.preventDefault();
    if (!formData.faida.trim() || !formData.sirr.trim()) return;
    const secretData = { faida: formData.faida.trim(), sirr: formData.sirr.trim(), img: formData.mediaUrl || null, updatedAt: Date.now() };
    try {
      if (editingId) {
        if (formData.category !== activeCategory) { await remove(ref(db, `${activeCategory}/${editingId}`)); await set(ref(db, `${formData.category}/${editingId}`), { ...secretData, createdAt: Date.now() }); } 
        else { await update(ref(db, `${formData.category}/${editingId}`), secretData); }
      } else { await push(ref(db, formData.category), { ...secretData, createdAt: Date.now() }); }
      resetForm(); closeDetail(); setActiveCategory(formData.category); 
    } catch (error) { alert("Erreur lors de l'enregistrement."); }
  };

  const handleEdit = (secret) => {
    setFormData({ faida: secret.faida || "", sirr: secret.sirr || "", mediaUrl: secret.img || "", category: activeCategory });
    setEditingId(secret.id); setShowForm(true); closeDetail();
  };

  const handleDelete = async (secretId) => {
    if (!window.confirm("Supprimer ce secret ?")) return;
    try { await remove(ref(db, `${activeCategory}/${secretId}`)); if (selectedSecret?.id === secretId) closeDetail(); } catch (error) { alert("Erreur."); }
  };

  const resetForm = () => { setFormData({ faida: "", sirr: "", mediaUrl: "", category: activeCategory }); setEditingId(null); setShowForm(false); };

  if (loading) return (<div className={`widget widget-glass ${isExpanded ? 'widget-maximized' : ''}`}><h3 className="widget-title"><FiBookOpen /> Secrets Mystiques</h3><div className="loading-placeholder">Chargement...</div></div>);

  return (
    <div className={`widget widget-glass widget-secrets-enhanced ${isExpanded ? 'widget-maximized' : ''}`} style={{ fontFamily: "'Calibri', 'Segoe UI', 'Roboto', sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 className="widget-title" style={{ fontFamily: "'Calibri', 'Segoe UI', sans-serif", margin: 0 }}><FiBookOpen /> Secrets Mystiques</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          {isAdmin && (<button className="icon-btn" onClick={() => { resetForm(); setShowForm(!showForm); }}><FiPlus size={20} /></button>)}
          {onToggleExpand && (<button className="icon-btn" onClick={onToggleExpand}>{isExpanded ? <FiMinimize2 size={20} /> : <FiMaximize2 size={20} />}</button>)}
        </div>
      </div>

      {isAdmin && showForm && (
        <form onSubmit={handleAddOrUpdate} className="add-secret-form">
          <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '14px', background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.95rem' }}>
            {CATEGORIES.map(cat => (<option key={cat.key} value={cat.key} style={{ background: '#1e293b' }}>{cat.label}</option>))}
          </select>
          <input type="text" placeholder="Titre (faida)" value={formData.faida} onChange={(e) => setFormData({ ...formData, faida: e.target.value })} required />
          <textarea placeholder="Description (sirr)" value={formData.sirr} onChange={(e) => setFormData({ ...formData, sirr: e.target.value })} rows={3} required />
          <div style={{ marginBottom: '10px' }}>
            <CloudinaryUploader onUploadSuccess={(url) => setFormData(prev => ({ ...prev, mediaUrl: url }))} buttonText="Télécharger média" />
            {formData.mediaUrl && <MediaPreview url={formData.mediaUrl} />}
          </div>
          <div className="form-actions"><button type="submit" className="primary">{editingId ? 'Mettre à jour' : 'Ajouter'}</button><button type="button" onClick={resetForm}>Annuler</button></div>
        </form>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div className="category-tabs-glass" style={{ marginBottom: 0 }}>
          {CATEGORIES.map(cat => (
            <button key={cat.key} className={`category-tab-glass ${activeCategory === cat.key ? 'active' : ''}`} onClick={() => setActiveCategory(cat.key)} style={{ '--cat-color': cat.color }}>
              <span className="tab-icon">{cat.icon}</span><span className="tab-label">{cat.label}</span>
              {secrets[cat.key] && <span className="tab-count">{Object.keys(secrets[cat.key]).length}</span>}
            </button>
          ))}
        </div>
        <div className="view-toggle">
          <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}><FiList size={18} /></button>
          <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}><FiGrid size={18} /></button>
        </div>
      </div>

      <div className={`secrets-list-glass secrets-layout-${viewMode}`}>
        {currentSecrets.length === 0 ? (<p className="empty-state">Aucun secret dans cette catégorie.</p>) : (
          currentSecrets.map(secret => {
            const isImage = secret.img && /\.(jpg|jpeg|png|gif|webp)$/i.test(secret.img);
            return (
              <div key={secret.id} className="secret-item-glass" style={{ display: 'flex', flexDirection: 'column' }}>
                {viewMode === 'list' ? (
                  <div className="list-view-card" onClick={() => openDetail(secret)} style={{ cursor: 'pointer', display: 'flex', width: '100%' }}>
                    <div style={{ flex: 1, paddingRight: '12px' }}><span className="secret-title-glass">{secret.faida}</span>
                      {secret.img && !isImage && (<div className="secret-has-image" style={{ marginTop: '6px', fontSize: '0.75rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px' }}><FiFile size={12} /> Document joint</div>)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      {isImage && <img src={secret.img} alt="Aperçu" className="secret-thumbnail-list" />}
                      {isAdmin && (<div style={{ display: 'flex', gap: '4px' }}><button className="icon-btn" onClick={(e) => { e.stopPropagation(); handleEdit(secret); }}><FiEdit2 size={14} /></button><button className="icon-btn" onClick={(e) => { e.stopPropagation(); handleDelete(secret.id); }}><FiTrash2 size={14} /></button></div>)}
                      <FiChevronRight className="secret-arrow" />
                    </div>
                  </div>
                ) : (
                  <div className="grid-view-card" onClick={() => openDetail(secret)} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div className="grid-card-header" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', flex: 1 }}>
                      <div><span className="secret-title-glass">{secret.faida}</span>
                        {secret.img && !isImage && (<div className="secret-has-image" style={{ marginTop: '6px', fontSize: '0.75rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px' }}><FiFile size={12} /> Document joint</div>)}
                      </div>
                      {isAdmin && (<div style={{ display: 'flex', gap: '4px', flexDirection: 'column' }}><button className="icon-btn" onClick={(e) => { e.stopPropagation(); handleEdit(secret); }}><FiEdit2 size={14} /></button><button className="icon-btn" onClick={(e) => { e.stopPropagation(); handleDelete(secret.id); }}><FiTrash2 size={14} /></button></div>)}
                    </div>
                    <div style={{ height: '100px', width: '100%', background: isImage ? '#000' : 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px', overflow: 'hidden' }}>
                      {isImage ? (<img src={secret.img} alt="Aperçu" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />) : (<FiBookOpen size={40} color="rgba(255,255,255,0.1)" />)}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* NOUVEAU : BANNIÈRE VIP */}
      {hiddenCount > 0 && (
        <div style={{ marginTop: '16px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '16px', padding: '16px', textAlign: 'center' }}>
          <FiLock size={24} color="#60a5fa" style={{ marginBottom: '8px' }} />
          <h4 style={{ color: 'white', margin: '0 0 8px 0' }}>{hiddenCount} autres secrets disponibles</h4>
          <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '16px', marginTop: 0 }}>Devenez membre VIP pour débloquer l'intégralité de la bibliothèque mystique.</p>
          <button 
            onClick={() => navigate('/')} 
            style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <FiStar /> Débloquer l'accès VIP
          </button>
        </div>
      )}

      {selectedSecret && (
        <div className="modal-overlay-glass" onClick={closeDetail}>
          <div className="modal-glass" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-glass" style={{ borderColor: activeCategoryInfo?.color }}><h4 dir="ltr">{selectedSecret.faida}</h4><button className="modal-close-glass" onClick={closeDetail}><FiX /></button></div>
            <div className="modal-body-glass"><div className="secret-description-glass"><MixedText text={selectedSecret.sirr} /></div>{selectedSecret.img && <MediaPreview url={selectedSecret.img} />}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WidgetSecrets;