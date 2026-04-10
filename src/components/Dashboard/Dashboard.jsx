import { signOut } from "firebase/auth";
import { auth } from "../../firebase";
import WidgetLiens from "../Widgets/WidgetLiens";
import WidgetChat from "../Widgets/WidgetChat";
import WidgetSecrets from "../Widgets/WidgetSecrets";
import { BiLogOut } from "react-icons/bi";

const Dashboard = () => {
  const user = auth.currentUser;

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h2>
          👋 Bonjour, {user?.displayName?.split(' ')[0] || 'Utilisateur'}
        </h2>
        <button onClick={() => signOut(auth)} className="logout-btn">
          <BiLogOut size={18} /> Déconnexion
        </button>
      </header>
      
      <div className="widgets-grid">
        <WidgetSecrets />
        <WidgetLiens />
        <WidgetChat />
      </div>
    </div>
  );
};

export default Dashboard;