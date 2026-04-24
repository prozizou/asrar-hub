import { useState, useEffect, useRef } from "react";
import { ref, onValue, push, remove, serverTimestamp, set, query, limitToLast, orderByChild } from "firebase/database";
import { db, auth } from "../../firebase";
import { FiSend, FiMessageCircle, FiTrash2, FiThumbsUp, FiThumbsDown, FiMic, FiFile, FiX, FiCornerUpLeft, FiSearch, FiMaximize2, FiMinimize2, FiUserX } from "react-icons/fi";
import { useAdmin } from "../../hooks/useAdmin";
import CloudinaryUploader from "../CloudinaryUploader";
import { useDebounce } from "use-debounce";
import toast from "react-hot-toast";

const AudioPlayerWithVisualizer = ({ src, isOwn }) => {
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const audioCtxRef = useRef(null);
  const trackRef = useRef(null);
  const filterRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [voiceBoostActive, setVoiceBoostActive] = useState(false);
  const timeRef = useRef(0);
  const requestRef = useRef();

  const initAudioRouting = () => {
    if (!audioCtxRef.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = new AudioContext();
      trackRef.current = audioCtxRef.current.createMediaElementSource(audioRef.current);
      filterRef.current = audioCtxRef.current.createBiquadFilter();
      filterRef.current.type = "peaking";
      filterRef.current.frequency.value = 1500;
      filterRef.current.Q.value = 1.5;
      filterRef.current.gain.value = 0;
      trackRef.current.connect(filterRef.current);
      filterRef.current.connect(audioCtxRef.current.destination);
    }
  };

  const toggleVoiceBoost = () => {
    initAudioRouting();
    const newState = !voiceBoostActive;
    setVoiceBoostActive(newState);
    if (filterRef.current) filterRef.current.gain.value = newState ? 12 : 0;
  };

  const cyclePlaybackRate = () => {
    const rates = [1, 0.75, 0.5];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) audioRef.current.playbackRate = nextRate;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = isOwn ? '#047857' : '#2563eb'; 
      if (isPlaying) timeRef.current += 0.2;
      for (let i = 0; i < canvas.width; i++) {
        const amplitude = isPlaying ? 10 : 2; 
        const y = canvas.height / 2 + Math.sin(i * 0.05 + timeRef.current) * amplitude;
        if (i === 0) ctx.moveTo(i, y); else ctx.lineTo(i, y);
      }
      ctx.stroke();
      requestRef.current = requestAnimationFrame(render);
    };
    requestRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying, isOwn]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '240px', margin: '8px 0', background: 'rgba(0,0,0,0.1)', padding: '10px', borderRadius: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '4px' }}>
        <button onClick={cyclePlaybackRate} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '3px 6px', borderRadius: '4px', fontSize: '0.65rem', cursor: 'pointer' }}>Vitesse: {playbackRate}x</button>
        <button onClick={toggleVoiceBoost} style={{ background: voiceBoostActive ? '#3b82f6' : 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '3px 6px', borderRadius: '4px', fontSize: '0.65rem', cursor: 'pointer' }}>{voiceBoostActive ? 'Voix Isolée' : 'Original'}</button>
      </div>
      <canvas ref={canvasRef} width="220" height="30" style={{ width: '100%', height: '30px', borderRadius: '6px', background: 'rgba(0,0,0,0.05)' }} />
      <audio ref={audioRef} src={src} controls onPlay={() => { initAudioRouting(); setIsPlaying(true); }} onPause={() => setIsPlaying(false)} onEnded={() => setIsPlaying(false)} crossOrigin="anonymous" style={{ height: '30px', width: '100%' }} />
    </div>
  );
};

const WidgetChat = ({ isExpanded, onToggleExpand }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);
  const [pendingMedia, setPendingMedia] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [debouncedSearch] = useDebounce(searchQuery, 300);
  const [typingUsers, setTypingUsers] = useState({});
  const typingTimeoutRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const previousMessagesLength = useRef(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerIntervalRef = useRef(null);

  // NOUVEAU : État de bannissement
  const [isBanned, setIsBanned] = useState(false);

  const user = auth.currentUser;
  const isAdmin = useAdmin();

  // NOUVEAU : Vérifier si l'utilisateur est banni
  useEffect(() => {
    if (!user) return;
    const banRef = ref(db, `banned_users/${user.uid}`);
    const unsubscribe = onValue(banRef, (snapshot) => {
      setIsBanned(!!snapshot.val()); // true si banni
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const messagesRef = query(ref(db, "discussions"), orderByChild("createdAt"), limitToLast(50));
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const msgs = Object.entries(data).map(([id, val]) => ({ id, ...val }));
        msgs.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        if (previousMessagesLength.current > 0 && msgs.length > previousMessagesLength.current) {
          const lastMsg = msgs[msgs.length - 1];
          if (lastMsg.uid !== user?.uid) {
            new Audio('https://actions.google.com/sounds/v1/water/water_drop.ogg').play().catch(e => {});
            toast(`Nouveau message de ${lastMsg.displayName}`, { icon: '💬' });
          }
        }
        previousMessagesLength.current = msgs.length;
        setMessages(msgs);
      }
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const typingRef = ref(db, "chat_typing");
    const unsubscribe = onValue(typingRef, (snapshot) => {
      if (snapshot.val()) {
        const typing = Object.entries(snapshot.val())
          .filter(([uid, data]) => data.isTyping && uid !== user?.uid)
          .reduce((acc, [uid, data]) => ({ ...acc, [uid]: data.name }), {});
        setTypingUsers(typing);
      } else setTypingUsers({});
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => { if (!isSearching) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isSearching]);

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    e.target.style.height = 'inherit';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
    if (!user) return;
    set(ref(db, `chat_typing/${user.uid}`), { isTyping: true, name: user.displayName });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => { set(ref(db, `chat_typing/${user.uid}`), { isTyping: false }); }, 2000);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e); }
  };

  const sendMessage = async (e, directMediaUrl = null, directMediaType = null) => {
    if (e) e.preventDefault();
    const finalMediaUrl = directMediaUrl || pendingMedia?.url || null;
    const finalMediaType = directMediaType || pendingMedia?.type || null;
    if (!newMessage.trim() && !finalMediaUrl) return;
    const messageData = { createdAt: serverTimestamp(), uid: user.uid, displayName: user.displayName || "Utilisateur" };
    if (newMessage.trim()) messageData.text = newMessage.trim();
    if (finalMediaUrl) messageData.mediaUrl = finalMediaUrl;
    if (finalMediaType) messageData.mediaType = finalMediaType;
    if (user.photoURL) messageData.photoURL = user.photoURL;
    if (replyingTo) { messageData.replyTo = { id: replyingTo.id, displayName: replyingTo.displayName, text: replyingTo.text || "", mediaType: replyingTo.mediaType || "" }; }
    try {
      await push(ref(db, "discussions"), messageData);
      setNewMessage(""); setPendingMedia(null); setReplyingTo(null);
      set(ref(db, `chat_typing/${user.uid}`), null);
      const textarea = document.getElementById("chat-textarea");
      if (textarea) textarea.style.height = 'inherit';
    } catch (error) {}
  };

  // NOUVEAU : Fonction pour bloquer un utilisateur
  const handleBanUser = async (uid, displayName) => {
    if (!window.confirm(`Voulez-vous vraiment bloquer l'utilisateur ${displayName} ? Il ne pourra plus poster dans le chat ni dans la communauté.`)) return;
    try {
      await set(ref(db, `banned_users/${uid}`), true);
      toast.success(`${displayName} a été bloqué.`);
    } catch (error) { toast.error("Erreur lors du blocage."); }
  };

  const startRecording = async () => { /* ... (Identique) ... */ };
  const stopRecording = async () => { /* ... (Identique) ... */ };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm("Voulez-vous supprimer ce message ?")) return;
    await remove(ref(db, `discussions/${messageId}`));
  };

  const handleMessageVote = async (msgId, votesObj, voteType) => {
    if (!user) return;
    const voteRef = ref(db, `discussions/${msgId}/votes/${user.uid}`);
    if (votesObj?.[user.uid] === voteType) await remove(voteRef); else await set(voteRef, voteType);
  };

  const scrollToMessage = (messageId) => {
    const element = document.getElementById(`msg-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      const originalBg = element.style.backgroundColor;
      element.style.transition = "background-color 0.5s ease";
      element.style.backgroundColor = "rgba(59, 130, 246, 0.3)";
      setTimeout(() => { element.style.backgroundColor = originalBg; }, 1500);
    } else { toast("Message introuvable", { icon: 'ℹ️' }); }
  };

  const displayedMessages = debouncedSearch.trim() ? messages.filter(m => m.text?.toLowerCase().includes(debouncedSearch.toLowerCase())) : messages;

  return (
    <div className={`widget chat-widget widget-glass ${isExpanded ? 'widget-maximized' : ''}`}>
      {/* Header (Identique) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        {isSearching ? (
          <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '4px 12px', borderRadius: '20px' }}>
            <FiSearch color="#9ca3af" />
            <input type="text" autoFocus placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#fff', flex: 1, margin: 0 }} />
            <button className="icon-btn" onClick={() => { setIsSearching(false); setSearchQuery(""); }}><FiX size={16} /></button>
          </div>
        ) : (
          <>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><FiMessageCircle /> Discussions</h3>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button className="icon-btn" onClick={() => setIsSearching(true)}><FiSearch size={18} /></button>
              {onToggleExpand && (<button className="icon-btn" onClick={onToggleExpand}>{isExpanded ? <FiMinimize2 size={18} /> : <FiMaximize2 size={18} />}</button>)}
            </div>
          </>
        )}
      </div>
      
      <div className="messages-container" style={{ flex: 1, overflowY: 'auto' }}>
        {displayedMessages.map(msg => {
          const isOwn = msg.uid === user?.uid;
          const votesObj = msg.votes || {};
          
          return (
            <div key={msg.id} id={`msg-${msg.id}`} className={`message ${isOwn ? 'own' : ''}`} style={{ borderRadius: '12px' }}>
              <img src={msg.photoURL || `https://ui-avatars.com/api/?name=${msg.displayName}`} className="avatar" />
              <div className="message-container-wrapper">
                <div className="message-content">
                  <span className="name">{msg.displayName}</span>
                  {msg.replyTo && (
                    <div onClick={() => scrollToMessage(msg.replyTo.id)} style={{ background: 'rgba(0,0,0,0.05)', borderLeft: `4px solid ${isOwn ? '#047857' : '#3b82f6'}`, padding: '6px 10px', borderRadius: '4px', marginBottom: '8px', fontSize: '0.8rem', cursor: 'pointer' }}>
                      <strong style={{ color: isOwn ? '#047857' : '#2563eb' }}>{msg.replyTo.displayName}</strong>
                      <div style={{ color: '#4b5563', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{msg.replyTo.text || "Média"}</div>
                    </div>
                  )}
                  {msg.mediaUrl && (<div className="msg-media">{msg.mediaType === 'image' && <img src={msg.mediaUrl} />}{msg.mediaType === 'audio' && <AudioPlayerWithVisualizer src={msg.mediaUrl} isOwn={isOwn} />}</div>)}
                  {msg.text && <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{msg.text}</p>}
                </div>

                <div className="msg-actions" style={{ justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
                  <button className="msg-action-btn" onClick={() => setReplyingTo(msg)} title="Répondre"><FiCornerUpLeft size={12} /></button>
                  <button className={`msg-action-btn ${votesObj[user?.uid] === 'like' ? 'user-liked' : ''}`} onClick={() => handleMessageVote(msg.id, votesObj, 'like')}><FiThumbsUp size={12} /> {Object.values(votesObj).filter(v => v === 'like').length || ''}</button>
                  
                  {/* NOUVEAU : Bouton Bloquer pour l'Admin */}
                  {isAdmin && !isOwn && (
                    <button className="msg-action-btn" onClick={() => handleBanUser(msg.uid, msg.displayName)} title="Bloquer l'utilisateur" style={{ color: '#f59e0b' }}>
                      <FiUserX size={12} />
                    </button>
                  )}
                  
                  {(isAdmin || isOwn) && <button className="msg-action-btn msg-delete-btn" onClick={() => handleDeleteMessage(msg.id)} title="Supprimer"><FiTrash2 size={12} /></button>}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-wrapper">
        {/* NOUVEAU : Vérification de Bannissement */}
        {isBanned ? (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '16px', borderRadius: '14px', textAlign: 'center', color: '#fca5a5', fontSize: '0.9rem' }}>
            <FiUserX size={24} style={{ marginBottom: '8px' }} /><br/>
            Vous avez été bloqué par l'administrateur. Vous ne pouvez plus envoyer de messages.
          </div>
        ) : (
          <form onSubmit={sendMessage} className="chat-input-form" style={{ alignItems: 'flex-end' }}>
            {isRecording ? (
              <div className="recording-container">
                <span className="recording-time">{Math.floor(recordingTime/60)}:{(recordingTime%60).toString().padStart(2,'0')}</span>
                <button type="button" onClick={stopRecording} className="mic-btn recording"><FiSend /></button>
              </div>
            ) : (
              <>
                <textarea id="chat-textarea" value={newMessage} onChange={handleTyping} onKeyDown={handleKeyDown} placeholder="Message (Maj+Entrée pour ligne)..." rows={1} style={{ flex: 1, resize: 'none', overflowY: 'auto', maxHeight: '120px', margin: 0, padding: '12px 16px', borderRadius: '14px', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'white', fontFamily: 'inherit', fontSize: '0.95rem' }} />
                {newMessage.trim() ? (<button type="submit" className="primary" style={{ marginBottom: '2px' }}><FiSend /></button>) : (<button type="button" onClick={startRecording} className="mic-btn" style={{ marginBottom: '2px' }}><FiMic /></button>)}
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
};

export default WidgetChat;