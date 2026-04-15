import { useState, useEffect } from "react";
import { ref, onValue, push, remove, update } from "firebase/database";
import { db } from "../../firebase";
import {
  FiBookOpen, FiChevronRight, FiX, FiImage, FiFile,
  FiLock, FiUnlock, FiZap, FiEye, FiShield, FiPlus, FiTrash2, FiEdit2
} from "react-icons/fi";
import { useAdmin } from "../../hooks/useAdmin";
import CloudinaryUploader from "../CloudinaryUploader";

// --- Composant pour texte mixte (arabe/français) avec liens et sauts de ligne ---
const MixedText = ({ text }) => {
  if (!text) return null;
  const lines = text.split('\n');
  const processLine = (lineText) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+/g;
    const segments = [];
    const urlMatches = [];
    let match;
    while ((match = urlRegex.exec(lineText)) !== null) {
      urlMatches.push({ start: match.index, end: match.index + match[0].length, url: match[0] });
    }
    if (urlMatches.length === 0) {
      return processArabicOnly(lineText);
    }
    let pos = 0;
    urlMatches.forEach((urlInfo) => {
      if (urlInfo.start > pos) {
        const textBefore = lineText.substring(pos, urlInfo.start);
        segments.push(...processArabicOnly(textBefore));
      }
      segments.push({ type: 'url', content: urlInfo.url });
      pos = urlInfo.end;
    });
    if (pos < lineText.length) {
      const textAfter = lineText.substring(pos);
      segments.push(...processArabicOnly(textAfter));
    }
    return segments;
  };
  const processArabicOnly = (plainText) => {
    const segments = [];
    const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+/g;
    let lastIndex = 0;
    let match;
    while ((match = arabicRegex.exec(plainText)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ type: 'text', content: plainText.substring(lastIndex, match.index), isArabic: false });
      }
      segments.push({ type: 'text', content: match[0], isArabic: true });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < plainText.length) {
      segments.push({ type: 'text', content: plainText.substring(lastIndex), isArabic: false });
    }
    return segments;
  };
  const renderLine = (line, lineIndex) => {
    const segments = processLine(line);
    if (segments.length === 0) return <br key={lineIndex} />;
    return (
      <div key={lineIndex} className="text-line" style={{ marginBottom: '0.5rem' }}>
        {segments.map((seg, idx) => {
          if (seg.type === 'url') {
            return (
              <a key={idx} href={seg.content} target="_blank" rel="noopener noreferrer" className="secret-link" dir="ltr">
                {seg.content}
              </a>
            );
          } else {
            return (
              <span key={idx} dir={seg.isArabic ? "rtl" : "ltr"} style={{ unicodeBidi: "embed" }}>
                {seg.content}
              </span>
            );
          }
        })}
      </div>
    );
  };
  return <div className="secret-text-container">{lines.map((line, idx) => renderLine(line, idx))}</div>;
};

// --- Aperçu du média ---
const MediaPreview = ({ url }) => {
  if (!url) return null;
  const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
  const isAudio = /\.(mp3|wav|ogg|m4a)$/i.test(url);
  
  if (isImage) return <img src={url} alt="Preview" style={{ maxWidth: '100%', borderRadius: '12px', marginTop: '16px' }} />;
  if (isAudio) return <audio controls src={url} style={{ width: '100%', marginTop: '16px' }} />;
  return <div className="file-link"><FiFile /> <a href={url} target="_blank" rel="noopener noreferrer">Ouvrir le fichier</a></div>;
};

// --- Catégories ---
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
        Object.keys(data).forEach(key => {
          if (key.startsWith("db_sirr_")) {
            sirrData[key] = data[key];
          }
        });
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

    try {
      if (editingId) {
        const secretRef = ref(db, `${activeCategory}/${editingId}`);
        await update(secretRef, secretData);
      } else {
        const categoryRef = ref(db, activeCategory);
        await push(categoryRef, { ...secretData, createdAt: Date.now() });
      }
      resetForm();
      closeDetail();
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
    }
  };

  const handleEdit = (secret) => {
    setFormData({
      faida: secret.faida || "",
      sirr: secret.sirr || "",
      mediaUrl: secret.img || ""
    });
    setEditingId(secret.id);
    setShowForm(true);
    closeDetail();
  };

  const handleDelete = async (secretId) => {
    if (!window.confirm("Supprimer ce secret ?")) return;
    const secretRef = ref(db, `${activeCategory}/${secretId}`);
    await remove(secretRef);
    if (selectedSecret?.id === secretId) closeDetail();
  };

  const resetForm = () => {
    setFormData({ faida: "", sirr: "", mediaUrl: "" });
    setEditingId(null);
    setShowForm(false);
  };

  const handleMediaUpload = (url) => {
    setFormData(prev => ({ ...prev, mediaUrl: url }));
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 className="widget-title" style={{ fontFamily: "'Calibri', 'Segoe UI', sans-serif" }}>
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
            <CloudinaryUploader onUploadSuccess={handleMediaUpload} buttonText="Télécharger un média (image, PDF, audio)" />
            {formData.mediaUrl && <MediaPreview url={formData.mediaUrl} />}
          </div>

          <div className="form-actions">
            <button type="submit" className="primary">{editingId ? 'Mettre à jour' : 'Ajouter'}</button>
            <button type="button" onClick={resetForm}>Annuler</button>
          </div>
        </form>
      )}

      <div className="category-tabs-glass">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            className={`category-tab-glass ${activeCategory === cat.key ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.key)}
            style={{ '--cat-color': cat.color, fontFamily: "'Calibri', 'Segoe UI', sans-serif" }}
          >
            <span className="tab-icon">{cat.icon}</span>
            <span className="tab-label">{cat.label}</span>
            {secrets[cat.key] && <span className="tab-count">{Object.keys(secrets[cat.key]).length}</span>}
          </button>
        ))}
      </div>

      <div className="secrets-list-glass">
        {currentSecrets.length === 0 ? (
          <p className="empty-state">Aucun secret dans cette catégorie.</p>
        ) : (
          currentSecrets.map(secret => {
            // Vérification si le média attaché est une image
            const isImage = secret.img && /\.(jpg|jpeg|png|gif|webp)$/i.test(secret.img);

            return (
              <div key={secret.id} className="secret-item-glass">
                <div className="secret-main" onClick={() => openDetail(secret)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  
                  {/* PARTIE GAUCHE : Titre du secret et indicateur de document */}
                  <div style={{ flex: 1, paddingRight: '12px' }}>
                    <span className="secret-title-glass" style={{ fontFamily: "'Calibri', 'Segoe UI', sans-serif", display: 'block' }}>
                      {secret.faida}
                    </span>
                    {/* Si c'est un média mais PAS une image (ex: PDF ou Audio), on met un petit texte en dessous */}
                    {secret.img && !isImage && (
                      <div className="secret-has-image" style={{ marginTop: '6px', fontSize: '0.75rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FiFile size={12} /> Document joint
                      </div>
                    )}
                  </div>

                  {/* PARTIE DROITE : Miniature de l'image, boutons d'admin et chevron */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    
                    {/* La miniature de l'image s'affiche ici si c'est bien une image */}
                    {isImage && (
                      <img 
                        src={secret.img} 
                        alt="Aperçu" 
                        className="secret-thumbnail"
                      />
                    )}

                    {/* Actions d'administration */}
                    {isAdmin && (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="icon-btn" onClick={(e) => { e.stopPropagation(); handleEdit(secret); }} title="Modifier">
                          <FiEdit2 size={14} />
                        </button>
                        <button className="icon-btn" onClick={(e) => { e.stopPropagation(); handleDelete(secret.id); }} title="Supprimer">
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    )}
                    
                    <FiChevronRight className="secret-arrow" />
                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modale d'affichage détaillé du secret */}
      {selectedSecret && (
        <div className="modal-overlay-glass" onClick={closeDetail}>
          <div className="modal-glass" onClick={(e) => e.stopPropagation()} style={{ fontFamily: "'Calibri', 'Segoe UI', sans-serif" }}>
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