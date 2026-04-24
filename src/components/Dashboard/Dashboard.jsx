import { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase";
import WidgetLiens from "../Widgets/WidgetLiens";
import WidgetChat from "../Widgets/WidgetChat";
import WidgetSecrets from "../Widgets/WidgetSecrets";
import WidgetNotes from "../Widgets/WidgetNotes";
import WidgetDocuments from "../Widgets/WidgetDocuments";
import { BiLogOut } from "react-icons/bi";
import { Toaster } from "react-hot-toast";

const Dashboard = () => {
  const user = auth.currentUser;
  const [expandedWidget, setExpandedWidget] = useState(null);

  // --- NOUVEAU : INTERCEPTION DU RETOUR TOUCHPAY ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      const duration = params.get("duration");
      const order = params.get("order");
      const email = params.get("email") || user?.email || "Email inconnu";
      
      // Formatage du message pour l'administration
      const whatsappMsg = `*NOUVEL ABONNEMENT VIP ASRAR HUB*%0A%0ABonjour, je viens d'effectuer un paiement via TouchPay.%0A%0A📦 *Commande :* ${order}%0A⏱️ *Durée :* ${duration}%0A📧 *Mon Email :* ${email}%0A%0AMerci d'activer mon accès VIP !`;
      
      // Ouvre WhatsApp dans un nouvel onglet avec le numéro de l'admin
      window.open(`https://wa.me/221786144737?text=${whatsappMsg}`, "_blank");
      
      // Nettoie l'URL pour ne pas relancer WhatsApp si l'utilisateur actualise la page
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user]);
  // ------------------------------------------------

  const toggleExpand = (widgetName) => {
    setExpandedWidget(expandedWidget === widgetName ? null : widgetName);
  };

  return (
    <div className="dashboard">
      <Toaster position="top-right" reverseOrder={false} />
      <header className="dashboard-header">
        <h2>👋 Bonjour, {user?.displayName?.split(' ')[0] || 'Utilisateur'}</h2>
        <button onClick={() => signOut(auth)} className="logout-btn">
          <BiLogOut size={18} /> Déconnexion
        </button>
      </header>
      <div className="dashboard-layout" style={{ display: 'grid', gridTemplateColumns: expandedWidget ? '1fr' : 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
        {(!expandedWidget || expandedWidget === 'notes') && (<WidgetNotes isExpanded={expandedWidget === 'notes'} onToggleExpand={() => toggleExpand('notes')} />)}
        {(!expandedWidget || expandedWidget === 'secrets') && (<WidgetSecrets isExpanded={expandedWidget === 'secrets'} onToggleExpand={() => toggleExpand('secrets')} />)}
        {(!expandedWidget || expandedWidget === 'documents') && (<WidgetDocuments isExpanded={expandedWidget === 'documents'} onToggleExpand={() => toggleExpand('documents')} />)}
        {(!expandedWidget || expandedWidget === 'liens') && (<WidgetLiens isExpanded={expandedWidget === 'liens'} onToggleExpand={() => toggleExpand('liens')} />)}
        {(!expandedWidget || expandedWidget === 'chat') && (<WidgetChat isExpanded={expandedWidget === 'chat'} onToggleExpand={() => toggleExpand('chat')} />)}
      </div>
    </div>
  );
};

export default Dashboard;