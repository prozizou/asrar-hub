import { useState, useEffect, useRef } from "react";
import { 
  ref, onValue, push, remove, serverTimestamp, set, 
  query, limitToLast, orderByChild 
} from "firebase/database";
import { db, auth } from "../../firebase";
import { 
  FiSend, FiMessageCircle, FiTrash2, FiThumbsUp, FiThumbsDown, 
  FiMic, FiPaperclip, FiFile, FiX, FiCornerUpLeft, FiSearch,
  FiMaximize2, FiMinimize2 // <-- Nouveaux icônes d'agrandissement
} from "react-icons/fi";
import { useAdmin } from "../../hooks/useAdmin";
import CloudinaryUploader from "../CloudinaryUploader";
import { useDebounce } from "use-debounce";
import toast from "react-hot-toast"; // <-- Import pour la notification

// --- Composant : Lecteur Audio avec Onde Sinusoïdale ---
const AudioPlayerWithVisualizer = ({ src, isOwn }) => {
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const timeRef = useRef(0);
  const requestRef = useRef();

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
        if (i === 0) ctx.moveTo(i, y);
        else ctx.lineTo(i, y);
      }
      ctx.stroke();
      requestRef.current = requestAnimationFrame(render);
    };
    
    requestRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying, isOwn]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '220px', margin: '8px 0' }}>
      <canvas ref={canvasRef} width="220" height="40" style={{ width: '100%', height: '40px', borderRadius: '8px', background: isOwn ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.05)' }} />
      <audio ref={audioRef} src={src} controls onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onEnded={() => setIsPlaying(false)} style={{ height: '35px', width: '100%' }} />
    </div>
  );
};

// --- WIDGET CHAT PRINCIPAL (Reçoit isExpanded et onToggleExpand) ---
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
  
  // Ref pour suivre la quantité de messages (pour les notifications)
  const previousMessagesLength = useRef(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const streamRef = useRef(null);
  const timerIntervalRef = useRef(null);

  const user = auth.currentUser;
  const isAdmin = useAdmin();

  // --- CHARGEMENT DES MESSAGES & NOTIFICATIONS ---
  useEffect(() => {
    const messagesRef = query(ref(db, "discussions"), orderByChild("createdAt"), limitToLast(50));
    
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const msgs = Object.entries(data).map(([id, val]) => ({ id, ...val }));
        msgs.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

        // LOGIQUE DE NOTIFICATION
        if (previousMessagesLength.current > 0 && msgs.length > previousMessagesLength.current) {
          const lastMsg = msgs[msgs.length - 1];
          // Si le dernier message n'est pas le nôtre, on notifie !
          if (lastMsg.uid !== user?.uid) {
            // Son discret fourni par Google
            const audio = new Audio('https://actions.google.com/sounds/v1/water/water_drop.ogg');
            audio.play().catch(e => console.log('Son bloqué par le navigateur', e));
            
            // Toast élégant
            toast(`Nouveau message de ${lastMsg.displayName || 'quelqu\'un'}`, {
              icon: '💬',
              style: { borderRadius: '12px', background: '#1e293b', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
            });
          }
        }
        previousMessagesLength.current = msgs.length;
        setMessages(msgs);
      } else {
        setMessages([]);
      }
    });
    return () => unsubscribe();
  }, [user]);

  // --- INDICATEURS DE FRAPPE ---
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

  useEffect(() => {
    if (!isSearching) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSearching]);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') audioContextRef.current.close();
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (user) set(ref(db, `chat_typing/${user.uid}`), null);
    };
  }, [user]);

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (!user) return;
    set(ref(db, `chat_typing/${user.uid}`), { isTyping: true, name: user.displayName });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      set(ref(db, `chat_typing/${user.uid}`), { isTyping: false });
    }, 2000);
  };

  const sendMessage = async (e, directMediaUrl = null, directMediaType = null) => {
    if (e) e.preventDefault();
    const finalMediaUrl = directMediaUrl || pendingMedia?.url || null;
    const finalMediaType = directMediaType || pendingMedia?.type || null;

    if (!newMessage.trim() && !finalMediaUrl) return;
    if (!user) return;
    
    const messagesRef = ref(db, "discussions");
    const messageData = {
      text: newMessage.trim(),
      mediaUrl: finalMediaUrl,
      mediaType: finalMediaType,
      createdAt: serverTimestamp(),
      uid: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL,
    };

    if (replyingTo) {
      messageData.replyTo = {
        id: replyingTo.id, text: replyingTo.text, displayName: replyingTo.displayName, mediaType: replyingTo.mediaType
      };
    }

    await push(messagesRef, messageData);
    setNewMessage("");
    setPendingMedia(null);
    setReplyingTo(null);
    if (user) set(ref(db, `chat_typing/${user.uid}`), null);
  };

  const handleFileUpload = (url) => {
    const ext = url.split('.').pop().toLowerCase();
    let type = 'file';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) type = 'image';
    else if (['pdf'].includes(ext)) type = 'pdf';
    else if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) type = 'audio';
    setPendingMedia({ url, type });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      streamRef.current = stream;
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();

      const analyser = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256; 
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        
        animationFrameRef.current = requestAnimationFrame(draw);
        analyser.getByteTimeDomainData(dataArray);
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgb(239, 68, 68)'; 
        ctx.beginPath();
        
        const sliceWidth = canvas.width * 1.0 / bufferLength;
        let x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = v * canvas.height / 2;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
      };
      draw();

      mediaRecorderRef.current.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorderRef.current.start(100);
      setIsRecording(true);
      
      setRecordingTime(0);
      timerIntervalRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);

    } catch (err) {
      alert("Impossible d'accéder au microphone.");
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current) return;
    return new Promise((resolve) => {
      mediaRecorderRef.current.onstop = async () => {
        clearInterval(timerIntervalRef.current);
        cancelAnimationFrame(animationFrameRef.current);
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') audioContextRef.current.close();
        streamRef.current.getTracks().forEach(t => t.stop());
        setIsRecording(false);

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append("file", audioBlob, "voicenote.webm");
        formData.append("upload_preset", "AsrarPro");
        formData.append("resource_type", "video"); 

        try {
          const res = await fetch("https://api.cloudinary.com/v1_1/dqixuyqqh/video/upload", { method: "POST", body: formData });
          const data = await res.json();
          if (data.secure_url) {
            const mp3Url = data.secure_url.replace(/\.[^/.]+$/, ".mp3");
            sendMessage(null, mp3Url, "audio");
          }
        } catch (error) { alert("Échec de l'envoi."); }
        resolve();
      };
      mediaRecorderRef.current.stop();
    });
  };

  const cancelRecording = () => {
    clearInterval(timerIntervalRef.current);
    cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') audioContextRef.current.close();
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm("Voulez-vous supprimer ce message ?")) return;
    await remove(ref(db, `discussions/${messageId}`));
  };

  const handleMessageVote = async (msgId, votesObj, voteType) => {
    if (!user) return;
    const voteRef = ref(db, `discussions/${msgId}/votes/${user.uid}`);
    if (votesObj?.[user.uid] === voteType) await remove(voteRef);
    else await set(voteRef, voteType);
  };

  const displayedMessages = debouncedSearch.trim() 
    ? messages.filter(m => m.text?.toLowerCase().includes(debouncedSearch.toLowerCase()) || m.displayName?.toLowerCase().includes(debouncedSearch.toLowerCase()))
    : messages;

  return (
    <div className="widget chat-widget widget-glass">
      
      {/* HEADER AVEC RECHERCHE ET BOUTON D'AGRANDISSEMENT */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        {isSearching ? (
          <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '4px 12px', borderRadius: '20px' }}>
            <FiSearch color="#9ca3af" />
            <input 
              type="text" autoFocus placeholder="Rechercher..." 
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              style={{ background: 'transparent', border: 'none', padding: 0, margin: 0, flex: 1, boxShadow: 'none' }}
            />
            <button className="icon-btn" onClick={() => { setIsSearching(false); setSearchQuery(""); }}><FiX size={16} /></button>
          </div>
        ) : (
          <>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiMessageCircle /> Discussions
            </h3>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button className="icon-btn" onClick={() => setIsSearching(true)} title="Rechercher">
                <FiSearch size={18} />
              </button>
              <button className="icon-btn" onClick={onToggleExpand} title={isExpanded ? "Réduire" : "Agrandir"}>
                {isExpanded ? <FiMinimize2 size={18} /> : <FiMaximize2 size={18} />}
              </button>
            </div>
          </>
        )}
      </div>
      
      {/* ZONE DES MESSAGES */}
      <div className="messages-container" style={{ height: isSearching ? '400px' : '350px' }}>
        {displayedMessages.length === 0 && isSearching ? (
          <p className="empty-state">Aucun message trouvé pour "{searchQuery}"</p>
        ) : (
          displayedMessages.map(msg => {
            const isOwn = msg.uid === user?.uid;
            const canDelete = isAdmin || isOwn;
            const votesObj = msg.votes || {};
            const likesCount = Object.values(votesObj).filter(v => v === 'like').length;
            const dislikesCount = Object.values(votesObj).filter(v => v === 'dislike').length;
            const userVote = user ? votesObj[user.uid] : null;

            return (
              <div key={msg.id} className={`message ${isOwn ? 'own' : ''}`}>
                <img src={msg.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.displayName || 'User')}`} alt="Avatar" className="avatar" />
                
                <div className="message-container-wrapper">
                  <div className="message-content">
                    <span className="name">{msg.displayName}</span>
                    
                    {msg.replyTo && (
                      <div style={{ 
                        background: 'rgba(0,0,0,0.05)', borderLeft: `4px solid ${isOwn ? '#047857' : '#3b82f6'}`,
                        padding: '6px 10px', borderRadius: '4px', marginBottom: '8px', fontSize: '0.8rem'
                      }}>
                        <strong style={{ color: isOwn ? '#047857' : '#2563eb' }}>{msg.replyTo.displayName}</strong>
                        <div style={{ color: '#4b5563', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {msg.replyTo.mediaType === 'image' ? '📸 Image' : msg.replyTo.mediaType === 'audio' ? '🎤 Note vocale' : msg.replyTo.text}
                        </div>
                      </div>
                    )}
                    
                    {msg.mediaUrl && (
                      <div className="msg-media">
                        {msg.mediaType === 'image' && <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer"><img src={msg.mediaUrl} alt="Média" /></a>}
                        {msg.mediaType === 'audio' && <AudioPlayerWithVisualizer src={msg.mediaUrl} isOwn={isOwn} />}
                        {(msg.mediaType === 'file' || msg.mediaType === 'pdf') && <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className="msg-file"><FiFile size={18} /> Document joint</a>}
                      </div>
                    )}
                    {msg.text && <p>{msg.text}</p>}
                  </div>
                  
                  <div className="msg-actions" style={{ justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
                    <button className="msg-action-btn" onClick={() => setReplyingTo(msg)} title="Répondre"><FiCornerUpLeft size={12} /></button>
                    <button className={`msg-action-btn ${userVote === 'like' ? 'user-liked' : ''}`} onClick={() => handleMessageVote(msg.id, votesObj, 'like')}><FiThumbsUp size={12} /> {likesCount || ''}</button>
                    <button className={`msg-action-btn ${userVote === 'dislike' ? 'user-disliked' : ''}`} onClick={() => handleMessageVote(msg.id, votesObj, 'dislike')}><FiThumbsDown size={12} /> {dislikesCount || ''}</button>
                    {canDelete && <button className="msg-action-btn msg-delete-btn" onClick={() => handleDeleteMessage(msg.id)} title="Supprimer"><FiTrash2 size={12} /></button>}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {Object.keys(typingUsers).length > 0 && (
        <div style={{ fontSize: '0.75rem', color: '#9ca3af', padding: '0 8px 4px', fontStyle: 'italic' }}>
          {Object.values(typingUsers).join(', ')} {Object.keys(typingUsers).length > 1 ? 'sont' : 'est'} en train d'écrire...
        </div>
      )}

      <div className="chat-input-wrapper">
        {replyingTo && (
          <div className="pending-media-preview" style={{ background: 'rgba(59, 130, 246, 0.1)', borderLeft: '4px solid #3b82f6', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 'bold' }}>Réponse à {replyingTo.displayName}</div>
              <div style={{ fontSize: '0.85rem', color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {replyingTo.mediaType === 'image' ? '📸 Image' : replyingTo.text}
              </div>
            </div>
            <button className="close-pending-btn" onClick={() => setReplyingTo(null)}><FiX size={16} /></button>
          </div>
        )}

        {pendingMedia && (
          <div className="pending-media-preview">
            {pendingMedia.type === 'image' ? <img src={pendingMedia.url} alt="Aperçu" /> : <div className="pending-file"><FiFile size={24} /> Fichier</div>}
            <div style={{ flex: 1, fontSize: '0.85rem', color: '#cbd5e1' }}>Ajouter une légende...</div>
            <button className="close-pending-btn" onClick={() => setPendingMedia(null)}><FiX size={20} /></button>
          </div>
        )}

        <form onSubmit={sendMessage} className="chat-input-form" style={{ marginTop: '0' }}>
          {isRecording ? (
            <div className="recording-container">
              <span className="recording-time">{formatTime(recordingTime)}</span>
              <canvas ref={canvasRef} className="visualizer" width="200" height="30"></canvas>
              <button type="button" onClick={cancelRecording} className="icon-btn" style={{ color: '#9ca3af' }}><FiTrash2 size={18} /></button>
              <button type="button" onClick={stopRecording} className="mic-btn recording"><FiSend size={18} /></button>
            </div>
          ) : (
            <>
              <CloudinaryUploader onUploadSuccess={handleFileUpload} buttonText={<FiPaperclip size={18} />} className="icon-btn" />
              <input type="text" value={newMessage} onChange={handleTyping} placeholder="Votre message..." />
              {newMessage.trim() || pendingMedia ? (
                <button type="submit" className="primary"><FiSend /></button>
              ) : (
                <button type="button" onClick={startRecording} className="mic-btn"><FiMic size={18} /></button>
              )}
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default WidgetChat;