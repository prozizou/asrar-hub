import { useState, useEffect } from "react";
import { ref, onValue, push, remove, update } from "firebase/database";
import { db, auth } from "../../firebase";
import { 
  FiBook, FiPlus, FiTrash2, FiEdit2, FiDownload, 
  FiMaximize2, FiMinimize2, FiLink, FiImage, FiLock, FiStar
} from "react-icons/fi";
import { useAdmin } from "../../hooks/useAdmin";
import CloudinaryUploader from "../CloudinaryUploader";
import { useNavigate } from "react-router-dom";

const WidgetDocuments = ({ isExpanded, onToggleExpand }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({ 
    titre: "", 
    description: "", 
    coverUrl: "", 
    pdfUrl: "" 
  });
  
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
    const docsRef = ref(db, "documents");
    const unsubscribe = onValue(docsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const docsArray = Object.entries(data).map(([id, value]) => ({ id, ...value }));
        docsArray.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setDocuments(docsArray);
      } else {
        setDocuments([]);
      }
      setLoading(false);
    }, (error) => {
      console.error("Erreur de chargement :", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAddOrUpdate = async (e) => {
    e.preventDefault();
    if (!formData.titre.trim() || !formData.pdfUrl.trim()) {
      alert("Le titre et le lien du document sont obligatoires.");
      return;
    }

    let finalUrl = formData.pdfUrl.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }

    const docData = {
      titre: formData.titre.trim(),
      description: formData.description.trim(),
      coverUrl: formData.coverUrl,
      pdfUrl: finalUrl,
      updatedAt: Date.now()
    };

    try {
      if (editingId) {
        await update(ref(db, `documents/${editingId}`), docData);
      } else {
        await push(ref(db, "documents"), { ...docData, createdAt: Date.now() });
      }
      resetForm();
    } catch (error) {
      alert("Erreur lors de l'enregistrement. Vérifiez vos permissions Firebase.");
    }
  };

  const handleEdit = (doc) => {
    setFormData({ 
      titre: doc.titre || "", 
      description: doc.description || "", 
      coverUrl: doc.coverUrl || "", 
      pdfUrl: doc.pdfUrl || "" 
    });
    setEditingId(doc.id);
    setShowForm(true);
  };

  const handleDelete = async (docId) => {
    if (!window.confirm("Voulez-vous vraiment supprimer ce livre ?")) return;
    try { await remove(ref(db, `documents/${docId}`)); } catch (error) {}
  };

  const resetForm = () => {
    setFormData({ titre: "", description: "", coverUrl: "", pdfUrl: "" });
    setEditingId(null);
    setShowForm(false);
  };

  const handlePdfUrlChange = (e) => {
    const url = e.target.value;
    let newCoverUrl = formData.coverUrl;

    const driveRegex = /\/file\/d\/([-\w]+)/;
    const match = url.match(driveRegex);

    if (match && match[1]) {
      const driveId = match[1];
      newCoverUrl = `https://drive.google.com/thumbnail?id=${driveId}&sz=w600`;
    }

    setFormData({ ...formData, pdfUrl: url, coverUrl: newCoverUrl });
  };

  const openPdf = (url) => {
    window.open(url, "_blank");
  };

  // --- LOGIQUE FREEMIUM ---
  const visibleDocuments = (!isAdmin && !isVip) ? documents.slice(0, 5) : documents;
  const hiddenCount = (!isAdmin && !isVip && documents.length > 5) ? documents.length - 5 : 0;

  if (loading) {
    return (
      <div className={`widget widget-glass ${isExpanded ? 'widget-maximized' : ''}`}>
        <h3 className="widget-title"><FiBook /> Bibliothèque Mystique</h3>
        <div className="loading-placeholder">Chargement des livres...</div>
      </div>
    );
  }

  return (
    <div className={`widget widget-glass ${isExpanded ? 'widget-maximized' : ''}`} style={{ fontFamily: "'Calibri', 'Segoe UI', 'Roboto', sans-serif" }}>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 className="widget-title" style={{ margin: 0 }}>
          <FiBook /> Bibliothèque Mystique
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          {isAdmin && (
            <button className="icon-btn" onClick={() => { resetForm(); setShowForm(!showForm); }} title="Ajouter un livre">
              <FiPlus size={20} />
            </button>
          )}
          {onToggleExpand && (
            <button className="icon-btn" onClick={onToggleExpand}>
              {isExpanded ? <FiMinimize2 size={20} /> : <FiMaximize2 size={20} />}
            </button>
          )}
        </div>
      </div>

      {isAdmin && showForm && (
        <form onSubmit={handleAddOrUpdate} className="add-secret-form" style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '16px', marginBottom: '20px' }}>
          <input type="text" placeholder="Titre du livre" value={formData.titre} onChange={(e) => setFormData({ ...formData, titre: e.target.value })} required />
          <textarea placeholder="Description de l'ouvrage..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
          
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px', background: 'rgba(59, 130, 246, 0.1)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: '#60a5fa', fontWeight: 'bold' }}>1. Collez le lien Google Drive</label>
              
              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '0 12px' }}>
                <FiLink color="#9ca3af" />
                <input 
                  type="text" placeholder="https://drive.google.com/file/d/..." 
                  value={formData.pdfUrl} onChange={handlePdfUrlChange} 
                  style={{ background: 'transparent', border: 'none', margin: 0, padding: '12px', flex: 1, boxShadow: 'none' }} required 
                />
              </div>
              <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '8px', marginBottom: 0 }}>⚠️ Assurez-vous que le lien Drive est réglé sur "Tous ceux qui ont le lien".</p>
            </div>

            <div style={{ flex: 1, minWidth: '200px', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem', color: '#9ca3af' }}>
                2. Couverture {formData.coverUrl && formData.coverUrl.includes('drive.google.com') && <span style={{ color: '#10b981' }}>(Extraite ✨)</span>}
              </label>
              <CloudinaryUploader onUploadSuccess={(url) => setFormData(prev => ({ ...prev, coverUrl: url }))} buttonText="Modifier manuellement" />
              {formData.coverUrl && <img src={formData.coverUrl} alt="Cover" style={{ width: '80px', height: '110px', objectFit: 'cover', borderRadius: '8px', marginTop: '8px', border: '1px solid rgba(255,255,255,0.2)' }} />}
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="primary">{editingId ? 'Mettre à jour' : 'Ajouter le livre'}</button>
            <button type="button" onClick={resetForm}>Annuler</button>
          </div>
        </form>
      )}

      {/* GRILLE DES LIVRES (AVEC LIMITE FREEMIUM) */}
      <div style={{ 
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px', overflowY: 'auto', maxHeight: isExpanded ? 'calc(100vh - 120px)' : '500px', paddingRight: '8px'
      }}>
        {visibleDocuments.length === 0 ? (
          <p className="empty-state" style={{ gridColumn: '1 / -1' }}>La bibliothèque est vide pour le moment.</p>
        ) : (
          visibleDocuments.map(doc => (
            <div key={doc.id} style={{ 
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s, background 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
            >
              <div style={{ height: '220px', width: '100%', background: doc.coverUrl ? '#000' : 'linear-gradient(135deg, #1e293b, #0f172a)', position: 'relative' }}>
                {doc.coverUrl ? (
                  <img src={doc.coverUrl} alt={doc.titre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.1)' }}><FiImage size={64} /></div>
                )}
                
                {isAdmin && (
                  <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.6)', padding: '4px', borderRadius: '8px', backdropFilter: 'blur(4px)' }}>
                    <button className="icon-btn" onClick={() => handleEdit(doc)} style={{ padding: '4px' }}><FiEdit2 size={14} color="white" /></button>
                    <button className="icon-btn" onClick={() => handleDelete(doc.id)} style={{ padding: '4px' }}><FiTrash2 size={14} color="#ef4444" /></button>
                  </div>
                )}
              </div>

              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '1.05rem', color: '#f8fafc' }}>{doc.titre}</h4>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0 0 16px 0', flex: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {doc.description || "Aucune description"}
                </p>
                <button 
                  onClick={() => openPdf(doc.pdfUrl)}
                  style={{ width: '100%', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', border: 'none', padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  <FiDownload size={16} /> Ouvrir le document
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* --- BANNIÈRE VIP --- */}
      {hiddenCount > 0 && (
        <div style={{ marginTop: '16px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '16px', padding: '16px', textAlign: 'center' }}>
          <FiLock size={24} color="#60a5fa" style={{ marginBottom: '8px' }} />
          <h4 style={{ color: 'white', margin: '0 0 8px 0' }}>{hiddenCount} autres livres disponibles</h4>
          <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '16px', marginTop: 0 }}>Devenez membre VIP pour débloquer l'intégralité de la bibliothèque mystique.</p>
          <button 
            onClick={() => navigate('/')} 
            style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <FiStar /> Débloquer l'accès VIP
          </button>
        </div>
      )}

    </div>
  );
};

export default WidgetDocuments;