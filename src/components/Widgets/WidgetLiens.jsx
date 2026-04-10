import { useState, useEffect } from "react";
import { ref, onValue, push, remove, update } from "firebase/database";
import { db } from "../../firebase";
import { FiLink, FiExternalLink, FiPlus, FiTrash2, FiEdit2 } from "react-icons/fi";
import { useAdmin } from "../../hooks/useAdmin";

const LinkIcon = ({ url, name }) => {
  const [imgLoading, setImgLoading] = useState(true);
  const [imgError, setImgError] = useState(false);
  const getFaviconUrl = (urlString) => {
    try {
      const hostname = new URL(urlString).hostname;
      return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
    } catch { return null; }
  };
  const faviconUrl = getFaviconUrl(url);
  const fallbackImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3b82f6&color=fff&size=64&bold=true`;

  return (
    <div className="link-icon-wrapper">
      {imgLoading && <div className="link-icon-loader"><div className="circular-progress-small"></div></div>}
      {!imgError && faviconUrl ? (
        <img src={faviconUrl} alt={name} onLoad={() => setImgLoading(false)} onError={() => { setImgLoading(false); setImgError(true); }} style={{ display: imgLoading ? 'none' : 'block' }} className="link-favicon" />
      ) : (
        <img src={fallbackImage} alt={name} onLoad={() => setImgLoading(false)} style={{ display: imgLoading ? 'none' : 'block' }} className="link-fallback-icon" />
      )}
    </div>
  );
};

const WidgetLiens = () => {
  const [liens, setLiens] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ nom: "", url: "" });
  const isAdmin = useAdmin();

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

    const lienData = {
      nom: formData.nom.trim(),
      url: finalUrl,
      updatedAt: Date.now()
    };

    try {
      if (editingId) {
        const lienRef = ref(db, `liens/${editingId}`);
        await update(lienRef, lienData);
      } else {
        const liensRef = ref(db, "liens");
        await push(liensRef, { ...lienData, createdAt: Date.now() });
      }
      resetForm();
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
    }
  };

  const handleEdit = (lien) => {
    setFormData({ nom: lien.nom || "", url: lien.url || "" });
    setEditingId(lien.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer ce lien ?")) return;
    const lienRef = ref(db, `liens/${id}`);
    await remove(lienRef);
    if (editingId === id) resetForm();
  };

  const resetForm = () => {
    setFormData({ nom: "", url: "" });
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div className="widget">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3><FiLink /> Liens & Apps</h3>
        {isAdmin && (
          <button className="icon-btn" onClick={() => { resetForm(); setShowForm(!showForm); }} title="Ajouter un lien">
            <FiPlus size={20} />
          </button>
        )}
      </div>

      {isAdmin && showForm && (
        <form onSubmit={handleAddOrUpdate} className="add-secret-form">
          <input type="text" placeholder="Nom" value={formData.nom} onChange={(e) => setFormData({ ...formData, nom: e.target.value })} required />
          <input type="text" placeholder="URL" value={formData.url} onChange={(e) => setFormData({ ...formData, url: e.target.value })} required />
          <div className="form-actions">
            <button type="submit" className="primary">{editingId ? 'Mettre à jour' : 'Ajouter'}</button>
            <button type="button" onClick={resetForm}>Annuler</button>
          </div>
        </form>
      )}

      <div className="liens-list-playstore">
        {liens.length === 0 ? (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px 0' }}>Aucun lien pour le moment.</p>
        ) : (
          liens.map(lien => (
            <div key={lien.id} style={{ position: 'relative' }}>
              <a href={lien.url} target="_blank" rel="noopener noreferrer" className="lien-card">
                <LinkIcon url={lien.url} name={lien.nom} />
                <div className="lien-info">
                  <span className="lien-nom">{lien.nom}</span>
                  <span className="lien-url">{lien.url}</span>
                </div>
                <FiExternalLink className="lien-external-icon" />
              </a>
              {isAdmin && (
                <div style={{ position: 'absolute', top: 8, right: 40, display: 'flex', gap: '4px' }}>
                  <button className="icon-btn delete-lien-btn" onClick={() => handleEdit(lien)} title="Modifier">
                    <FiEdit2 size={14} />
                  </button>
                  <button className="icon-btn delete-lien-btn" onClick={() => handleDelete(lien.id)} title="Supprimer">
                    <FiTrash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default WidgetLiens;