import { useEffect, useRef, useState, type FormEvent } from "react";
import { CircleAlert, RotateCw, Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth.context";
import { AdminLayout } from "@/features/admin/AdminLayout";
import { AdminApiError } from "../admin-api.service";
import { BookingRulesForm } from "./BookingRulesForm";
import { GeneralSettingsForm } from "./GeneralSettingsForm";
import { getRestaurantSettings, getSettingsError, updateRestaurantSettings } from "./settings.service";
import { OperatingHoursForm } from "./OperatingHoursForm";
import { SettingsTabs, settingsTabs, type SettingsTabId } from "./SettingsTabs";
import type { RestaurantSettings, SettingsUpdate } from "./settings.types";
import "./settings.css";

export default function AdminSettingsPage() {
  const { accessToken, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SettingsTabId>("general");
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const authActions = useRef({ signOut, navigate });
  const saveController = useRef<AbortController | null>(null);

  useEffect(() => {
    authActions.current = { signOut, navigate };
  }, [signOut, navigate]);

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      setLoadError("Your session has expired. Please sign in again.");
      authActions.current.signOut();
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setLoadError("");
    void getRestaurantSettings(accessToken, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setSettings(result);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof AdminApiError && error.status === 401) {
          authActions.current.signOut();
          return;
        }
        if (error instanceof AdminApiError && error.status === 403) {
          authActions.current.navigate("/", { replace: true });
          return;
        }
        setLoadError(getSettingsError(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [accessToken, loadAttempt]);

  useEffect(() => () => {
    saveController.current?.abort();
    saveController.current = null;
  }, []);

  async function handleSave(changes: SettingsUpdate) {
    if (!accessToken) throw new AdminApiError("Your session has expired. Please sign in again.", 401);
    setSaving(true);
    const controller = new AbortController();
    saveController.current = controller;
    try {
      const updated = await updateRestaurantSettings(accessToken, changes, controller.signal);
      if (!controller.signal.aborted) setSettings(updated);
      return updated;
    } catch (error) {
      if (error instanceof AdminApiError && error.status === 401) authActions.current.signOut();
      if (error instanceof AdminApiError && error.status === 403) authActions.current.navigate("/", { replace: true });
      throw error;
    } finally {
      if (saveController.current === controller) {
        saveController.current = null;
        setSaving(false);
      }
    }
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  const searchBar = <form className="admin-search" role="search" onSubmit={handleSearch}>
    <Search aria-hidden="true" />
    <input
      type="search"
      aria-label="Search reservations and guests"
      placeholder="Search reservations, guests..."
      value={searchQuery}
      onChange={(event) => setSearchQuery(event.target.value)}
    />
    {searchQuery && <Button className="admin-search-clear" type="button" variant="ghost" aria-label="Clear search" onClick={() => setSearchQuery("")}><X aria-hidden="true" /></Button>}
  </form>;

  return <AdminLayout
    search={searchBar}
    shellClassName="admin-settings-layout"
    profileName="Admin"
    profileSubtitle="Restaurant Manager"
    profileInitials="AD"
  >
    <div className="admin-settings-page">
      <header className="admin-page-header settings-page-header">
        <div>
          <h1>Restaurant Settings</h1>
          <p>Manage your restaurant information and preferences.</p>
        </div>
      </header>

      <div className="admin-settings-content">
        <div className="admin-mobile-search">{searchBar}</div>
        {loading
          ? <div className="settings-loading" role="status"><span className="settings-loading-spinner" aria-hidden="true" />Loading restaurant settings…</div>
          : loadError
            ? <div className="settings-load-error" role="alert"><CircleAlert aria-hidden="true" /><p>{loadError}</p><Button className="admin-secondary-button" variant="outline" onClick={() => setLoadAttempt((attempt) => attempt + 1)}><RotateCw aria-hidden="true" />Try again</Button></div>
            : settings && <>
                <SettingsTabs value={activeTab} onChange={setActiveTab} />
                {settingsTabs.map((tab) => <section
                  key={tab.id}
                  className="settings-tab-panel"
                  id={`settings-panel-${tab.id}`}
                  role="tabpanel"
                  aria-labelledby={`settings-tab-${tab.id}`}
                  tabIndex={0}
                  hidden={activeTab !== tab.id}
                >
                  {tab.id === "general" && <GeneralSettingsForm settings={settings} onSave={handleSave} saving={saving} />}
                  {tab.id === "hours" && <OperatingHoursForm settings={settings} onSave={handleSave} saving={saving} />}
                  {tab.id === "booking" && <BookingRulesForm settings={settings} onSave={handleSave} saving={saving} />}
                </section>)}
              </>}
      </div>
    </div>
  </AdminLayout>;
}
