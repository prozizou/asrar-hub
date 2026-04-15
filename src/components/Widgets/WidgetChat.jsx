import { useState, useEffect, useRef } from "react";
import { ref, onValue, push, remove, serverTimestamp, set } from "firebase/database";
import { db, auth } from "../../firebase";
import { 
  FiSend, FiMessageCircle, FiTrash2, FiThumbsUp, FiThumbsDown, 
  FiMic, FiPaperclip, FiFile, FiX 
} from "react-icons/fi";
import { useAdmin } from "../../hooks/useAdmin";
import CloudinaryUploader from "../CloudinaryUploader";

const WidgetChat = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);
  
  // Nouveau : État pour prévisualiser le média avant l'envoi
  const [pendingMedia, setPendingMedia] = useState(null);
  
  // États pour l'enregistrement audio
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const streamRef = useRef(null);
  const timerIntervalRef = useRef(null);

  const user = auth.currentUser;
  const isAdmin = useAdmin();

  useEffect(() => {
    const messagesRef = ref(db, "discussions");
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const msgs = Object.entries(data).map(([id, val]) => ({ id, ...val }));
        msgs.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        setMessages(msgs);
      } else {
        setMessages([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  // --- ENVOI DES MESSAGES ---
  const sendMessage = async (e, directMediaUrl = null, directMediaType = null) => {
    if (e) e.preventDefault();
    
    // On utilise soit le média envoyé en direct (ex: Audio), soit le média en attente (Image/PDF)
    const finalMediaUrl = directMediaUrl || pendingMedia?.url || null;
    const finalMediaType = directMediaType || pendingMedia?.type || null;

    if (!newMessage.trim() && !finalMediaUrl) return;
    if (!user) return;
    
    const messagesRef = ref(db, "discussions");
    await push(messagesRef, {
      text: newMessage.trim(),
      mediaUrl: finalMediaUrl,
      mediaType: finalMediaType,
      createdAt: serverTimestamp(),
      uid: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL
    });
    
    // Réinitialisation après l'envoi
    setNewMessage("");
    setPendingMedia(null);
  };

  // Quand un fichier est uploadé via Cloudinary, on le met en attente !
  const handleFileUpload = (url) => {
    const ext = url.split('.').pop().toLowerCase();
    let type = 'file';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) type = 'image';
    else if (['pdf'].includes(ext)) type = 'pdf';
    else if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) type = 'audio';

    // Au lieu d'envoyer, on met dans le state pour prévisualisation
    setPendingMedia({ url, type });
  };

  // --- ENREGISTREMENT AUDIO ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      streamRef.current = stream;
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
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
        analyser.getByteFrequencyData(dataArray);
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
          const barHeight = dataArray[i] / 2;
          ctx.fillStyle = `rgb(239, 68, 68)`;
          ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
          x += barWidth + 1;
        }
      };
      draw();

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.start(100);
      setIsRecording(true);
      
      setRecordingTime(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Erreur d'accès au micro:", err);
      alert("Impossible d'accéder au microphone.");
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current) return;

    return new Promise((resolve) => {
      mediaRecorderRef.current.onstop = async () => {
        clearInterval(timerIntervalRef.current);
        cancelAnimationFrame(animationFrameRef.current);
        if (audioContextRef.current) audioContextRef.current.close();
        streamRef.current.getTracks().forEach(t => t.stop());
        setIsRecording(false);

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append("file", audioBlob, "voicenote.webm");
        formData.append("upload_preset", "AsrarPro");
        formData.append("resource_type", "video"); 

        try {
          const res = await fetch("https://api.cloudinary.com/v1_1/dqixuyqqh/video/upload", {
            method: "POST",
            body: formData
          });
          const data = await res.json();
          if (data.secure_url) {
            // L'audio part directement (pas besoin de prévisualisation)
            const mp3Url = data.secure_url.replace(/\.[^/.]+$/, ".mp3");
            sendMessage(null, mp3Url, "audio");
          }
        } catch (error) {
          alert("Échec de l'envoi de la note vocale.");
        }
        resolve();
      };
      mediaRecorderRef.current.stop();
    });
  };

  const cancelRecording = () => {
    clearInterval(timerIntervalRef.current);
    cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current) audioContextRef.current.close();
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
    const messageRef = ref(db, `discussions/${messageId}`);
    await remove(messageRef);
  };

  const handleMessageVote = async (msgId, votesObj, voteType) => {
    if (!user) return;
    const voteRef = ref(db, `discussions/${msgId}/votes/${user.uid}`);
    const currentVote = votesObj?.[user.uid];
    if (currentVote === voteType) await remove(voteRef);
    else await set(voteRef, voteType);
  };

  return (
    <div className="widget chat-widget widget-glass">
      <h3><FiMessageCircle /> Discussions</h3>
      
      <div className="messages-container">
        {messages.map(msg => {
          const isOwn = msg.uid === user?.uid;
          const canDelete = isAdmin || isOwn;
          
          const votesObj = msg.votes || {};
          const likesCount = Object.values(votesObj).filter(v => v === 'like').length;
          const dislikesCount = Object.values(votesObj).filter(v => v === 'dislike').length;
          const userVote = user ? votesObj[user.uid] : null;

          return (
            <div key={msg.id} className={`message ${isOwn ? 'own' : ''}`}>
              <img 
                src={msg.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(msg.displayName || 'User')} 
                alt={msg.displayName} 
                className="avatar" 
              />
              
              <div className="message-container-wrapper">
                {/* La bulle de message WhatsApp */}
                <div className="message-content">
                  <span className="name">{msg.displayName}</span>
                  
                  {msg.mediaUrl && (
                    <div className="msg-media">
                      {msg.mediaType === 'image' && (
                        <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer">
                          <img src={msg.mediaUrl} alt="Média" />
                        </a>
                      )}
                      {msg.mediaType === 'audio' && (
                        <audio controls src={msg.mediaUrl} preload="metadata" style={{ width: '100%', height: '36px' }} />
                      )}
                      {(msg.mediaType === 'file' || msg.mediaType === 'pdf') && (
                        <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className="msg-file" style={{ color: isOwn ? '#047857' : '#2563eb' }}>
                          <FiFile size={18} /> Document joint
                        </a>
                      )}
                    </div>
                  )}

                  {msg.text && <p>{msg.text}</p>}
                </div>
                
                <div className="msg-actions" style={{ justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
                  <button className={`msg-action-btn ${userVote === 'like' ? 'user-liked' : ''}`} onClick={() => handleMessageVote(msg.id, votesObj, 'like')}>
                    <FiThumbsUp size={12} /> {likesCount > 0 ? likesCount : ''}
                  </button>
                  <button className={`msg-action-btn ${userVote === 'dislike' ? 'user-disliked' : ''}`} onClick={() => handleMessageVote(msg.id, votesObj, 'dislike')}>
                    <FiThumbsDown size={12} /> {dislikesCount > 0 ? dislikesCount : ''}
                  </button>
                  {canDelete && (
                    <button className="msg-action-btn msg-delete-btn" onClick={() => handleDeleteMessage(msg.id)} title="Supprimer">
                      <FiTrash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-wrapper">
        
        {/* Aperçu du média avant envoi */}
        {pendingMedia && (
          <div className="pending-media-preview">
            {pendingMedia.type === 'image' ? (
              <img src={pendingMedia.url} alt="Aperçu" />
            ) : (
              <div className="pending-file"><FiFile size={24} /> Fichier prêt à envoyer</div>
            )}
            <div style={{ flex: 1, fontSize: '0.85rem', color: '#cbd5e1' }}>Ajoutez un commentaire (optionnel)</div>
            <button className="close-pending-btn" onClick={() => setPendingMedia(null)}><FiX size={20} /></button>
          </div>
        )}

        <form onSubmit={sendMessage} className="chat-input-form" style={{ marginTop: '0' }}>
          
          {isRecording ? (
            <div className="recording-container">
              <span className="recording-time">{formatTime(recordingTime)}</span>
              <canvas ref={canvasRef} className="visualizer" width="200" height="30"></canvas>
              <button type="button" onClick={cancelRecording} className="icon-btn" style={{ color: '#9ca3af' }}>
                <FiTrash2 size={18} />
              </button>
              <button type="button" onClick={stopRecording} className="mic-btn recording">
                <FiSend size={18} />
              </button>
            </div>
          ) : (
            <>
              {/* Le trombone n'envoie plus direct, il stocke dans pendingMedia */}
              <CloudinaryUploader 
                onUploadSuccess={handleFileUpload} 
                buttonText={<FiPaperclip size={18} />} 
                className="icon-btn" 
              />
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={pendingMedia ? "Ajouter une légende..." : "Votre message..."}
              />
              
              {/* Le bouton envoi gère le texte OU le media en attente */}
              {newMessage.trim() || pendingMedia ? (
                <button type="submit" className="primary">
                  <FiSend />
                </button>
              ) : (
                <button type="button" onClick={startRecording} className="mic-btn">
                  <FiMic size={18} />
                </button>
              )}
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default WidgetChat;