import { useSearchParams } from "react-router-dom";

import ClientsPage from "./ClientsPage";
import UserSettingsPage from "../components/settings/UserSettingsPage";

export default function SettingsPage({ currentUser }) {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "clients";

  return (
    <div style={{ padding: "28px 32px", overflowY: "auto", height: "100%" }}>
      {activeTab === "clients" && <ClientsPage />}
      {activeTab === "user"    && <UserSettingsPage currentUser={currentUser} />}
    </div>
  );
}
