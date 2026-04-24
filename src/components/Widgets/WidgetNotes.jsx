import { useState, useEffect } from "react";
import { ref, onValue, set, push, remove, update, serverTimestamp } from "firebase/database";
import { db, auth } from "../../firebase";
import { FiEdit3, FiCheckCircle, FiCircle, FiSave, FiMaximize2, FiMinimize2, FiUsers, FiUser, FiMessageSquare, FiThumbsUp, FiSend, FiTrash2, FiEdit2, FiUserX } from "react-icons/fi";
import { useDebounce } from "use-debounce";
import toast from "react-hot-toast";
import { useAdmin } from "../../hooks/useAdmin";

const HABITS_LIST = [
  { id: "zikr_matin", label: "Zikr du matin" },
  { id: "lecture_versets", label: "Lecture des versets" },
  { id: "meditation", label: "Méditation (Ilham)" },
  { id: "zikr_soir", label: "Zikr du soir" }
];

const WidgetNotes = ({ isExpanded, onToggleExpand }) => {
  const user = auth.currentUser;
  const isAdmin = useAdmin();
  const [activeTab, setActiveTab] = useState("perso");

  const [noteText, setNoteText] = useState("");
  const [habits, setHabits] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [debouncedNote] = useDebounce(noteText, 1000);

  const [communityNotes, setCommunityNotes] = useState([]);
  const [activeReplyId, setActiveReplyId] = useState(null);
  const [replyText, setReplyText] = useState("");
  
  const [editingJournalId, setEditingJournalId] = useState(null);
  const [editJournalText, setEditJournalText] = useState("");

  // NOUVEAU : État de bannissement
  const [isBanned, setIsBanned] = useState(false);

  // Vérifier si banni
  useEffect(() => {
    if (!user) return;
    const banRef = ref(db, `banned_users/${user.uid}`);
    onValue(banRef, (snapshot) => setIsBanned(!!snapshot.val()));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    onValue(ref(db, `users_data/${user.uid}/journal_quotidien`), (snapshot) => {
      const data = snapshot.val();
      if (data) { setNoteText(data.notes || ""); setHabits(data.habits || {}); }
    });
  }, [user]);

  useEffect(() => {
    if (activeTab !== "communaute") return;
    onValue(ref(db, "community_journals"), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const arr = Object.entries(data).map(([id, val]) => ({ id, ...val })).sort((a, b) => b.createdAt - a.createdAt);
        setCommunityNotes(arr);
      } else { setCommunityNotes([]); }
    });
  }, [activeTab]);

  useEffect(() => {
    if (!user || debouncedNote === undefined) return;
    saveData(debouncedNote, habits);
  }, [debouncedNote]);

  const toggleHabit = (habitId) => {
    const newHabits = { ...habits, [habitId]: !habits[habitId] };
    setHabits(newHabits); saveData(noteText, newHabits);
  };

  const saveData = async (notes, currentHabits) => {
    if (!user) return;
    setIsSaving(true);
    await set(ref(db, `users_data/${user.uid}/journal_quotidien`), { notes, habits: currentHabits, updatedAt: Date.now() });
    setTimeout(() => setIsSaving(false), 500);
  };

  const publishToCommunity = async () => {
    if (isBanned) return toast.error("Action impossible : Vous avez été bloqué de la communauté.");
    if (!noteText.trim()) return toast.error("Votre journal est vide.");
    if (!window.confirm("Publier ce journal à la vue de tous les membres ?")) return;
    try {
      await push(ref(db, "community_journals"), { uid: user.uid, author: user.displayName || "Anonyme", text: noteText.trim(), createdAt: serverTimestamp() });
      toast.success("Journal publié !"); setActiveTab("communaute");
    } catch (error) { toast.error("Erreur lors de la publication."); }
  };

  const handleDeleteJournal = async (journalId) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cette publication ?")) return;
    await remove(ref(db, `community_journals/${journalId}`)); toast.success("Publication supprimée.");
  };

  const startEditingJournal = (journal) => { setEditingJournalId(journal.id); setEditJournalText(journal.text); };

  const handleEditJournalSubmit = async (journalId) => {
    if (!editJournalText.trim()) return;
    await update(ref(db, `community_journals/${journalId}`), { text: editJournalText.trim(), updatedAt: Date.now() });
    setEditingJournalId(null); toast.success("Modifiée.");
  };

  const handleLike = async (journal) => {
    if (!user) return;
    const likeRef = ref(db, `community_journals/${journal.id}/likes/${user.uid}`);
    if (journal.likes?.[user.uid]) await remove(likeRef); else await set(likeRef, true);
  };

  const handleReplySubmit = async (e, journalId) => {
    e.preventDefault();
    if (isBanned) return toast.error("Vous êtes bloqué.");
    if (!replyText.trim() || !user) return;
    await push(ref(db, `community_journals/${journalId}/replies`), { uid: user.uid, author: user.displayName || "Anonyme", text: replyText.trim(), createdAt: Date.now() });
    setReplyText("");
  };

  // NOUVEAU : Fonction admin pour bannir
  const handleBanUser = async (uid, authorName) => {
    if (!window.confirm(`Bloquer l'utilisateur ${authorName} ?`)) return;
    await set(ref(db, `banned_users/${uid}`), true);
    toast.success(`${authorName} est maintenant bloqué.`);
  };

  const completedCount = HABITS_LIST.filter(h => habits[h.id]).length;
  const progressPercent = Math.round((completedCount / HABITS_LIST.length) * 100);

  return (
    <div className={`widget widget-glass ${isExpanded ? 'widget-maximized' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <h3 className="widget-title" style={{ margin: 0 }}><FiEdit3 /> Journal & Suivi</h3>
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <button onClick={() => setActiveTab("perso")} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: activeTab === 'perso' ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeTab === 'perso' ? 'white' : '#9ca3af', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.85rem' }}><FiUser /> Mon Espace</button>
          <button onClick={() => setActiveTab("communaute")} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: activeTab === 'communaute' ? 'rgba(59, 130, 246, 0.2)' : 'transparent', color: activeTab === 'communaute' ? '#60a5fa' : '#9ca3af', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.85rem' }}><FiUsers /> Communauté</button>
        </div>
        {onToggleExpand && (<button className="icon-btn" onClick={onToggleExpand}>{isExpanded ? <FiMinimize2 size={18} /> : <FiMaximize2 size={18} />}</button>)}
      </div>

      {/* Onglet Perso */}
      {activeTab === "perso" && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.9rem' }}><span style={{ color: '#e2e8f0', fontWeight: '500' }}>Objectifs du jour</span><span style={{ color: '#60a5fa', fontWeight: 'bold' }}>{progressPercent}%</span></div>
            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden', marginBottom: '16px' }}><div style={{ height: '100%', width: `${progressPercent}%`, background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', transition: 'width 0.5s ease-out' }} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
              {HABITS_LIST.map(h => (<button key={h.id} onClick={() => toggleHabit(h.id)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: habits[h.id] ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${habits[h.id] ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.08)'}`, color: habits[h.id] ? '#10b981' : '#cbd5e1', padding: '10px 12px', borderRadius: '12px', cursor: 'pointer', fontSize: '0.85rem' }}>{habits[h.id] ? <FiCheckCircle size={18} /> : <FiCircle size={18} />}<span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.label}</span></button>))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', paddingLeft: '4px' }}><label style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Notes, visions ou songes...</label><span style={{ fontSize: '0.75rem', color: isSaving ? '#60a5fa' : '#9ca3af' }}>{isSaving ? "Enregistrement..." : "Sauvegardé"}</span></div>
            <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Écrivez vos pensées ici..." style={{ flex: 1, minHeight: isExpanded ? '300px' : '150px', background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '16px', color: '#e2e8f0', resize: 'none', lineHeight: '1.6', marginBottom: '12px' }} />
            
            {/* NOUVEAU : Avertissement si banni au lieu du bouton */}
            {isBanned ? (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '14px', textAlign: 'center', color: '#fca5a5', fontSize: '0.9rem', border: '1px solid rgba(239, 68, 68, 0.3)' }}>Vous êtes bloqué de la communauté et ne pouvez pas publier.</div>
            ) : (
              <button onClick={publishToCommunity} className="primary" style={{ width: '100%', justifyContent: 'center', padding: '12px', borderRadius: '14px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}><FiUsers /> Partager ce journal avec la communauté</button>
            )}
          </div>
        </div>
      )}

      {/* Onglet Communauté */}
      {activeTab === "communaute" && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, overflowY: 'auto', paddingRight: '4px', maxHeight: isExpanded ? 'calc(100vh - 150px)' : '400px' }}>
          {communityNotes.length === 0 ? (<p className="empty-state">Soyez le premier à partager votre expérience !</p>) : (
            communityNotes.map(journal => {
              const likesCount = journal.likes ? Object.keys(journal.likes).length : 0;
              const hasLiked = user && journal.likes?.[user.uid];
              const repliesArr = journal.replies ? Object.values(journal.replies) : [];
              const isOwner = user?.uid === journal.uid;

              return (
                <div key={journal.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>{journal.author.charAt(0).toUpperCase()}</div>
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#e2e8f0' }}>{journal.author} {journal.updatedAt && <span style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 'normal' }}>(Modifié)</span>}</div>
                        <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>{new Date(journal.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                    
                    {(isOwner || isAdmin) && (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {isAdmin && !isOwner && (
                          <button className="icon-btn" onClick={() => handleBanUser(journal.uid, journal.author)} title="Bloquer" style={{ color: '#f59e0b' }}><FiUserX size={14} /></button>
                        )}
                        {isOwner && (<button className="icon-btn" onClick={() => startEditingJournal(journal)} title="Modifier"><FiEdit2 size={14} /></button>)}
                        <button className="icon-btn" onClick={() => handleDeleteJournal(journal.id)} title="Supprimer"><FiTrash2 size={14} color="#ef4444" /></button>
                      </div>
                    )}
                  </div>
                  
                  {editingJournalId === journal.id ? (
                    <div style={{ marginBottom: '16px' }}>
                      <textarea value={editJournalText} onChange={(e) => setEditJournalText(e.target.value)} style={{ width: '100%', minHeight: '100px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--primary)', borderRadius: '10px', padding: '12px', color: '#fff', resize: 'vertical' }} />
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}><button onClick={() => handleEditJournalSubmit(journal.id)} className="primary" style={{ padding: '6px 16px', borderRadius: '8px', fontSize: '0.85rem' }}>Enregistrer</button><button onClick={() => setEditingJournalId(null)} style={{ padding: '6px 16px', borderRadius: '8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: '0.85rem', cursor: 'pointer' }}>Annuler</button></div>
                    </div>
                  ) : (<div style={{ fontSize: '0.95rem', color: '#cbd5e1', lineHeight: '1.6', marginBottom: '16px', whiteSpace: 'pre-wrap' }}>{journal.text}</div>)}

                  <div style={{ display: 'flex', gap: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                    <button onClick={() => handleLike(journal)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', color: hasLiked ? '#3b82f6' : '#9ca3af', cursor: 'pointer', transition: 'color 0.2s', fontSize: '0.85rem' }}><FiThumbsUp /> {likesCount} J'aime</button>
                    <button onClick={() => setActiveReplyId(activeReplyId === journal.id ? null : journal.id)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', transition: 'color 0.2s', fontSize: '0.85rem' }}><FiMessageSquare /> {repliesArr.length} Réponses</button>
                  </div>

                  {activeReplyId === journal.id && (
                    <div style={{ marginTop: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '12px', maxHeight: '200px', overflowY: 'auto' }}>
                        {repliesArr.length === 0 ? <div style={{ fontSize: '0.8rem', color: '#6b7280', textAlign: 'center' }}>Aucune réponse pour le moment.</div> : 
                          repliesArr.map((rep, idx) => (<div key={idx} style={{ borderLeft: '2px solid rgba(255,255,255,0.1)', paddingLeft: '10px' }}><div style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 'bold' }}>{rep.author}</div><div style={{ fontSize: '0.85rem', color: '#e2e8f0' }}>{rep.text}</div></div>))
                        }
                      </div>
                      
                      {/* NOUVEAU : Blocage réponse si banni */}
                      {!isBanned && (
                        <form onSubmit={(e) => handleReplySubmit(e, journal.id)} style={{ display: 'flex', gap: '8px' }}>
                          <input type="text" value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Ajouter une réponse..." style={{ flex: 1, margin: 0, padding: '8px 12px', borderRadius: '10px', fontSize: '0.85rem' }} />
                          <button type="submit" className="primary" style={{ padding: '8px 12px', borderRadius: '10px' }}><FiSend size={16} /></button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default WidgetNotes;