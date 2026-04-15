import { useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase";
import WidgetLiens from "../Widgets/WidgetLiens";
import WidgetChat from "../Widgets/WidgetChat";
import WidgetSecrets from "../Widgets/WidgetSecrets";
import { BiLogOut } from "react-icons/bi";
import { Toaster } from "react-hot-toast"; // <-- Import des notifications

const Dashboard = () => {
  const user = auth.currentUser;
  
  // État pour savoir quel widget est en plein écran (null, 'secrets', 'liens', 'chat')
  const [expandedWidget, setExpandedWidget] = useState(null);

  const toggleExpand = (widgetName) => {
    if (expandedWidget === widgetName) {
      setExpandedWidget(null); // On referme
    } else {
      setExpandedWidget(widgetName); // On agrandit
    }
  };

  return (
    <div className="dashboard">
      {/* Conteneur global pour les notifications élégantes */}
      <Toaster position="top-right" reverseOrder={false} />

      <header className="dashboard-header">
        <h2>👋 Bonjour, {user?.displayName?.split(' ')[0] || 'Utilisateur'}</h2>
        <button onClick={() => signOut(auth)} className="logout-btn">
          <BiLogOut size={18} /> Déconnexion
        </button>
      </header>
      
      <div className="dashboard-layout-vertical">
        {/* On masque les autres widgets si un seul est agrandi */}
        {(!expandedWidget || expandedWidget === 'secrets') && (
          <div className={expandedWidget === 'secrets' ? 'widget-maximized' : ''}>
            <WidgetSecrets isExpanded={expandedWidget === 'secrets'} onToggleExpand={() => toggleExpand('secrets')} />
          </div>
        )}

        {(!expandedWidget || expandedWidget === 'liens') && (
          <div className={expandedWidget === 'liens' ? 'widget-maximized' : ''}>
            <WidgetLiens isExpanded={expandedWidget === 'liens'} onToggleExpand={() => toggleExpand('liens')} />
          </div>
        )}

        {(!expandedWidget || expandedWidget === 'chat') && (
          <div className={expandedWidget === 'chat' ? 'widget-maximized' : ''}>
            <WidgetChat isExpanded={expandedWidget === 'chat'} onToggleExpand={() => toggleExpand('chat')} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;