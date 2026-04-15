import { useState, useEffect } from "react";
import { ref, onValue, push, remove, update } from "firebase/database";
import { db } from "../../firebase";
import {
  FiBookOpen, FiChevronRight, FiX, FiImage, FiFile,
  FiLock, FiUnlock, FiZap, FiEye, FiShield, FiPlus, 
  FiTrash2, FiEdit2, FiGrid, FiList
} from "react-icons/fi";
import { useAdmin } from "../../hooks/useAdmin";
import CloudinaryUploader from "../CloudinaryUploader";

// Composant pour texte mixte (séparation intelligente)
const MixedText = ({ text }) => {
  if (!text) return null;
  const lines = text.split('\n');
  const arabicPhraseRegex = /([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+(?:[\s،؛\?\!\.\,]+[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+)*)/g;
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  const renderLine = (line, lineIndex) => {
    if (!line.trim()) return <br key={lineIndex} />;
    const segments = line.split(arabicPhraseRegex);

    return (
      <div key={lineIndex} style={{ marginBottom: '0.8rem' }}>
        {segments.map((seg, idx) => {
          if (!seg || seg.trim().length === 0) return null;
          if (urlRegex.test(seg)) {
            const parts = seg.split(urlRegex);
            return (
              <div key={idx} dir="auto" style={{ textAlign: 'start', marginBottom: '0.4rem', lineHeight: '1.6' }}>
                {parts.map((part, i) =>
                  urlRegex.test(part) ? (
                    <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="secret-link">{part}</a>
                  ) : (<span key={i}>{part}</span>)
                )}
              </div>
            );
          }
          return (
            <div key={idx} dir="auto" style={{ textAlign: 'start', marginBottom: '0.4rem', unicodeBidi: 'plaintext', lineHeight: '1.6' }}>
              {seg.trim()}
            </div>
          );
        })}
      </div>
    );
  };
  return <div className="secret-text-container">{lines.map((line, idx) => renderLine(line, idx))}</div>;
};

const MediaPreview = ({ url }) => {
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

const WidgetSecrets = () => {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].key);
  const [secrets, setSecrets] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedSecret, setSelectedSecret] = useState(null);
  
  // Nouveau : État pour gérer la vue Liste vs Grille
  const [viewMode, setViewMode] = useState("list"); 
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ faida: "", sirr: "", mediaUrl: "" });
  const isAdmin = useAdmin();

  useEffect(() => {
    const rootRef = ref(db);
    const unsubscribe = onValue(rootRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const sirrData = {};
        Object.keys(data).forEach(key => { if (key.startsWith("db_sirr_")) sirrData[key] = data[key]; });
        setSecrets(sirrData);
      } else {
        setSecrets({});
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const getCurrentSecrets = () => {
    const categoryData = secrets[activeCategory];
    if (!categoryData) return [];
    return Object.entries(categoryData)
      .map(([id, value]) => ({ id, ...value }))
      .filter(item => item.faida && item.sirr)
      .sort((a, b) => (a.faida || "").localeCompare(b.faida || ""));
  };

  const currentSecrets = getCurrentSecrets();
  const activeCategoryInfo = CATEGORIES.find(c => c.key === activeCategory);

  const openDetail = (secret) => setSelectedSecret(secret);
  const closeDetail = () => setSelectedSecret(null);

  const handleAddOrUpdate = async (e) => {
    e.preventDefault();
    if (!formData.faida.trim() || !formData.sirr.trim()) return;

    const secretData = {
      faida: formData.faida.trim(),
      sirr: formData.sirr.trim(),
      img: formData.mediaUrl || null,
      updatedAt: Date.now()
    };

    if (editingId) {
      await update(ref(db, `${activeCategory}/${editingId}`), secretData);
    } else {
      await push(ref(db, activeCategory), { ...secretData, createdAt: Date.now() });
    }
    resetForm();
    closeDetail();
  };

  const handleEdit = (secret) => {
    setFormData({ faida: secret.faida || "", sirr: secret.sirr || "", mediaUrl: secret.img || "" });
    setEditingId(secret.id);
    setShowForm(true);
    closeDetail();
  };

  const handleDelete = async (secretId) => {
    if (!window.confirm("Supprimer ce secret ?")) return;
    await remove(ref(db, `${activeCategory}/${secretId}`));
    if (selectedSecret?.id === secretId) closeDetail();
  };

  const resetForm = () => {
    setFormData({ faida: "", sirr: "", mediaUrl: "" });
    setEditingId(null);
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="widget widget-glass">
        <h3 className="widget-title"><FiBookOpen /> Secrets Mystiques</h3>
        <div className="loading-placeholder">Chargement des secrets...</div>
      </div>
    );
  }

  return (
    <div className="widget widget-glass widget-secrets-enhanced" style={{ fontFamily: "'Calibri', 'Segoe UI', 'Roboto', sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 className="widget-title" style={{ fontFamily: "'Calibri', 'Segoe UI', sans-serif", margin: 0 }}>
          <FiBookOpen /> Secrets Mystiques
        </h3>
        {isAdmin && (
          <button className="icon-btn" onClick={() => { resetForm(); setShowForm(!showForm); }} title="Ajouter un secret">
            <FiPlus size={20} />
          </button>
        )}
      </div>

      {isAdmin && showForm && (
        <form onSubmit={handleAddOrUpdate} className="add-secret-form">
          <input type="text" placeholder="Titre (faida)" value={formData.faida} onChange={(e) => setFormData({ ...formData, faida: e.target.value })} required />
          <textarea placeholder="Description (sirr)" value={formData.sirr} onChange={(e) => setFormData({ ...formData, sirr: e.target.value })} rows={3} required />
          <div style={{ marginBottom: '10px' }}>
            <CloudinaryUploader onUploadSuccess={(url) => setFormData(prev => ({ ...prev, mediaUrl: url }))} buttonText="Télécharger un média (image, PDF, audio)" />
            {formData.mediaUrl && <MediaPreview url={formData.mediaUrl} />}
          </div>
          <div className="form-actions">
            <button type="submit" className="primary">{editingId ? 'Mettre à jour' : 'Ajouter'}</button>
            <button type="button" onClick={resetForm}>Annuler</button>
          </div>
        </form>
      )}

      {/* Barre d'outils : Catégories + Toggle d'affichage */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div className="category-tabs-glass" style={{ marginBottom: 0 }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              className={`category-tab-glass ${activeCategory === cat.key ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.key)}
              style={{ '--cat-color': cat.color }}
            >
              <span className="tab-icon">{cat.icon}</span>
              <span className="tab-label">{cat.label}</span>
              {secrets[cat.key] && <span className="tab-count">{Object.keys(secrets[cat.key]).length}</span>}
            </button>
          ))}
        </div>
        
        {/* Le Sélecteur Vue Liste / Vue Grille */}
        <div className="view-toggle">
          <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')} title="Vue Liste">
            <FiList size={18} />
          </button>
          <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')} title="Vue Grille">
            <FiGrid size={18} />
          </button>
        </div>
      </div>

      {/* Conteneur des secrets qui change de classe selon le mode */}
      <div className={`secrets-list-glass secrets-layout-${viewMode}`}>
        {currentSecrets.length === 0 ? (
          <p className="empty-state">Aucun secret dans cette catégorie.</p>
        ) : (
          currentSecrets.map(secret => {
            const isImage = secret.img && /\.(jpg|jpeg|png|gif|webp)$/i.test(secret.img);

            return (
              <div key={secret.id} className="secret-item-glass">
                
                {/* --- VUE EN LISTE --- */}
                {viewMode === 'list' ? (
                  <div className="list-view-card" onClick={() => openDetail(secret)} style={{ cursor: 'pointer' }}>
                    <div style={{ flex: 1, paddingRight: '12px' }}>
                      <span className="secret-title-glass">{secret.faida}</span>
                      {secret.img && !isImage && (
                        <div className="secret-has-image" style={{ marginTop: '6px', fontSize: '0.75rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <FiFile size={12} /> Document joint
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      {isImage && <img src={secret.img} alt="Aperçu" className="secret-thumbnail-list" />}
                      {isAdmin && (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button className="icon-btn" onClick={(e) => { e.stopPropagation(); handleEdit(secret); }}><FiEdit2 size={14} /></button>
                          <button className="icon-btn" onClick={(e) => { e.stopPropagation(); handleDelete(secret.id); }}><FiTrash2 size={14} /></button>
                        </div>
                      )}
                      <FiChevronRight className="secret-arrow" />
                    </div>
                  </div>
                ) : (
                  
                /* --- VUE EN GRILLE (PlayStore Style) --- */
                  <div className="grid-view-card" onClick={() => openDetail(secret)} style={{ cursor: 'pointer' }}>
                    <div className="grid-card-header">
                      <div>
                        <span className="secret-title-glass">{secret.faida}</span>
                        {secret.img && !isImage && (
                          <div className="secret-has-image" style={{ marginTop: '6px', fontSize: '0.75rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <FiFile size={12} /> Document joint
                          </div>
                        )}
                      </div>
                      {isAdmin && (
                        <div style={{ display: 'flex', gap: '4px', flexDirection: 'column' }}>
                          <button className="icon-btn" onClick={(e) => { e.stopPropagation(); handleEdit(secret); }}><FiEdit2 size={14} /></button>
                          <button className="icon-btn" onClick={(e) => { e.stopPropagation(); handleDelete(secret.id); }}><FiTrash2 size={14} /></button>
                        </div>
                      )}
                    </div>
                    
                    {/* La partie basse centrée pour l'image */}
                    {isImage && (
                      <div className="grid-image-container">
                        <img src={secret.img} alt="Aperçu" className="secret-thumbnail-grid" />
                      </div>
                    )}
                  </div>
                )}

              </div>
            );
          })
        )}
      </div>

      {selectedSecret && (
        <div className="modal-overlay-glass" onClick={closeDetail}>
          <div className="modal-glass" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-glass" style={{ borderColor: activeCategoryInfo?.color }}>
              <h4 dir="ltr">{selectedSecret.faida}</h4>
              <button className="modal-close-glass" onClick={closeDetail}><FiX /></button>
            </div>
            <div className="modal-body-glass">
              <div className="secret-description-glass"><MixedText text={selectedSecret.sirr} /></div>
              {selectedSecret.img && <MediaPreview url={selectedSecret.img} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WidgetSecrets;