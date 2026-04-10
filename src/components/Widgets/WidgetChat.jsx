import { useState, useEffect, useRef } from "react";
import { ref, onValue, push, remove, serverTimestamp } from "firebase/database";
import { db, auth } from "../../firebase";
import { FiSend, FiMessageCircle, FiTrash2 } from "react-icons/fi";
import { useAdmin } from "../../hooks/useAdmin";

const WidgetChat = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);
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

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    const messagesRef = ref(db, "discussions");
    await push(messagesRef, {
      text: newMessage.trim(),
      createdAt: serverTimestamp(),
      uid: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL
    });
    setNewMessage("");
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm("Supprimer ce message ?")) return;
    const messageRef = ref(db, `discussions/${messageId}`);
    await remove(messageRef);
  };

  return (
    <div className="widget chat-widget">
      <h3><FiMessageCircle /> Discussions</h3>
      <div className="messages-container">
        {messages.map(msg => {
          const isOwn = msg.uid === user.uid;
          return (
            <div key={msg.id} className={`message ${isOwn ? 'own' : ''}`}>
              <img 
                src={msg.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(msg.displayName || 'User')} 
                alt={msg.displayName} 
                className="avatar" 
              />
              <div className="message-content">
                <span className="name">{msg.displayName}</span>
                <p>{msg.text}</p>
              </div>
              {isAdmin && (
                <button 
                  className="icon-btn delete-msg-btn" 
                  onClick={() => handleDeleteMessage(msg.id)} 
                  title="Supprimer le message"
                  style={{ marginLeft: '8px', opacity: 0.6 }}
                >
                  <FiTrash2 size={14} />
                </button>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={sendMessage} className="chat-input-form">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Votre message..."
        />
        <button type="submit" disabled={!newMessage.trim()}>
          <FiSend />
        </button>
      </form>
    </div>
  );
};

export default WidgetChat;