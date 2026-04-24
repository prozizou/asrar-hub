import { useState, useEffect } from "react";
import { ref, onValue, push, remove, update, set } from "firebase/database";
import { db, auth } from "../../firebase";
import { 
  FiLink, FiPlus, FiTrash2, FiEdit2, FiDownload, 
  FiThumbsUp, FiThumbsDown, FiMessageSquare, FiSend, FiChevronDown, FiChevronUp,
  FiMaximize2, FiMinimize2
} from "react-icons/fi";
import { useAdmin } from "../../hooks/useAdmin";
import CloudinaryUploader from "../CloudinaryUploader";

const WidgetLiens = ({ isExpanded, onToggleExpand }) => { // <-- Ajout des props
  const [liens, setLiens] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ nom: "", url: "", description: "", image: "" });
  
  const [activeReviewId, setActiveReviewId] = useState(null);
  const [newReview, setNewReview] = useState("");
  
  const isAdmin = useAdmin();
  const user = auth.currentUser;

  useEffect(() => {
    const liensRef = ref(db, "liens");
    const unsubscribe = onValue(liensRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const liensArray = Object.entries(data).map(([id, value]) => ({ id, ...value }));
        liensArray.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setLiens(liensArray);
      } else setLiens([]);
    });
    return () => unsubscribe();
  }, []);

  const handleAddOrUpdate = async (e) => {
    e.preventDefault();
    if (!formData.nom.trim() || !formData.url.trim()) return;
    let finalUrl = formData.url;
    if (!/^https?:\/\//i.test(finalUrl)) finalUrl = 'https://' + finalUrl;

    const lienData = { nom: formData.nom.trim(), url: finalUrl, description: formData.description.trim(), image: formData.image, updatedAt: Date.now() };

    try {
      if (editingId) { await update(ref(db, `liens/${editingId}`), lienData); } 
      else { await push(ref(db, "liens"), { ...lienData, createdAt: Date.now() }); }
      resetForm();
    } catch (error) {}
  };

  const handleEdit = (lien) => {
    setFormData({ nom: lien.nom || "", url: lien.url || "", description: lien.description || "", image: lien.image || "" });
    setEditingId(lien.id); setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer définitivement cette application/lien ?")) return;
    await remove(ref(db, `liens/${id}`));
    if (editingId === id) resetForm();
  };

  const resetForm = () => { setFormData({ nom: "", url: "", description: "", image: "" }); setEditingId(null); setShowForm(false); };

  const handleDownload = async (lien) => {
    if (user) { await set(ref(db, `liens/${lien.id}/downloads/${user.uid}`), true); }
    window.open(lien.url, "_blank");
  };

  const handleVote = async (lien, voteType) => {
    if (!user) return;
    const voteRef = ref(db, `liens/${lien.id}/votes/${user.uid}`);
    if (lien.votes?.[user.uid] === voteType) { await remove(voteRef); } 
    else { await set(voteRef, voteType); }
  };

  const submitReview = async (e, lienId) => {
    e.preventDefault();
    if (!newReview.trim() || !user) return;
    await push(ref(db, `liens/${lienId}/reviews`), { text: newReview.trim(), author: user.displayName || "Anonyme", date: Date.now() });
    setNewReview("");
  };

  return (
    <div className={`widget widget-glass ${isExpanded ? 'widget-maximized' : ''}`}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={{ margin: 0 }}><FiLink /> Applications & Ressources</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          {isAdmin && (<button className="icon-btn" onClick={() => { resetForm(); setShowForm(!showForm); }}><FiPlus size={20} /></button>)}
          {/* BOUTON D'AGRANDISSEMENT */}
          {onToggleExpand && (
            <button className="icon-btn" onClick={onToggleExpand}>
              {isExpanded ? <FiMinimize2 size={20} /> : <FiMaximize2 size={20} />}
            </button>
          )}
        </div>
      </div>

      {isAdmin && showForm && (
        <form onSubmit={handleAddOrUpdate} className="add-secret-form">
          <input type="text" placeholder="Nom de l'application" value={formData.nom} onChange={(e) => setFormData({ ...formData, nom: e.target.value })} required />
          <input type="text" placeholder="URL du lien" value={formData.url} onChange={(e) => setFormData({ ...formData, url: e.target.value })} required />
          <textarea placeholder="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
          <div style={{ marginBottom: '12px' }}>
            <CloudinaryUploader onUploadSuccess={(url) => setFormData(prev => ({ ...prev, image: url }))} buttonText="Choisir l'icône" />
            {formData.image && <img src={formData.image} style={{ width: '48px', height: '48px', borderRadius: '10px', marginTop: '8px', objectFit: 'cover' }} />}
          </div>
          <div className="form-actions"><button type="submit" className="primary">{editingId ? 'Mettre à jour' : 'Ajouter'}</button><button type="button" onClick={resetForm}>Annuler</button></div>
        </form>
      )}

      <div className="liens-list-playstore" style={{ maxHeight: isExpanded ? 'calc(100vh - 120px)' : '600px', overflowY: 'auto', paddingRight: '8px' }}>
        {liens.length === 0 ? (<p className="empty-state">Aucune application disponible.</p>) : (
          liens.map(lien => {
            const reviewsArray = lien.reviews ? Object.values(lien.reviews) : [];
            const votesObj = lien.votes || {};
            const downloadsCount = typeof lien.downloads === 'object' && lien.downloads !== null ? Object.keys(lien.downloads).length : (!isNaN(lien.downloads) ? lien.downloads : 0);
            
            return (
              <div key={lien.id} className="playstore-card">
                <div className="ps-header">
                  {lien.image ? (<img src={lien.image} className="ps-icon" />) : (<div className="ps-icon">{lien.nom.charAt(0).toUpperCase()}</div>)}
                  <div className="ps-info"><h4 className="ps-title">{lien.nom}</h4><p className="ps-desc">{lien.description || "Aucune description."}</p></div>
                  <button className="ps-action-btn" onClick={() => handleDownload(lien)}>Ouvrir</button>
                </div>

                <div className="ps-stats">
                  <span className="ps-stat-btn"><FiDownload /> {downloadsCount}</span>
                  <button className={`ps-stat-btn ${user && votesObj[user.uid] === 'like' ? 'user-liked' : ''}`} onClick={() => handleVote(lien, 'like')}><FiThumbsUp /> {Object.values(votesObj).filter(v => v === 'like').length}</button>
                  <button className={`ps-stat-btn ${user && votesObj[user.uid] === 'dislike' ? 'user-disliked' : ''}`} onClick={() => handleVote(lien, 'dislike')}><FiThumbsDown /> {Object.values(votesObj).filter(v => v === 'dislike').length}</button>
                  <button className="ps-stat-btn" onClick={() => setActiveReviewId(activeReviewId === lien.id ? null : lien.id)}><FiMessageSquare /> {reviewsArray.length} Avis {activeReviewId === lien.id ? <FiChevronUp /> : <FiChevronDown />}</button>
                  {isAdmin && (<div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}><button className="icon-btn" onClick={() => handleEdit(lien)}><FiEdit2 size={14} /></button><button className="icon-btn" onClick={() => handleDelete(lien.id)}><FiTrash2 size={14} /></button></div>)}
                </div>

                {activeReviewId === lien.id && (
                  <div className="ps-reviews-section">
                    <div className="ps-reviews-list">
                      {reviewsArray.length > 0 ? (reviewsArray.map((rev, idx) => (<div key={idx} className="ps-review-item"><div className="ps-review-header"><span className="ps-review-author">{rev.author}</span><span>{new Date(rev.date).toLocaleDateString()}</span></div><div className="ps-review-text">{rev.text}</div></div>))) : (<p style={{ fontSize: '0.8rem', color: '#6b7280', textAlign: 'center' }}>Soyez le premier à donner un avis !</p>)}
                    </div>
                    <form className="ps-review-form" onSubmit={(e) => submitReview(e, lien.id)}>
                      <input type="text" placeholder="Donner un avis..." value={newReview} onChange={(e) => setNewReview(e.target.value)} style={{ borderRadius: '10px' }} />
                      <button type="submit" className="primary" style={{ padding: '8px 12px', borderRadius: '10px' }}><FiSend size={16} /></button>
                    </form>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default WidgetLiens;