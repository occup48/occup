import { useRef, type KeyboardEvent } from "react";

export const settingsTabs = [
  { id: "general", label: "General" },
  { id: "hours", label: "Operating Hours" },
  { id: "booking", label: "Booking Rules" },
] as const;

export type SettingsTabId = (typeof settingsTabs)[number]["id"];

type SettingsTabsProps = {
  value: SettingsTabId;
  onChange: (tab: SettingsTabId) => void;
};

export function SettingsTabs({ value, onChange }: SettingsTabsProps) {
  const tabsRef = useRef<Array<HTMLButtonElement | null>>([]);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const currentIndex = settingsTabs.findIndex((tab) => tab.id === value);
    let nextIndex = currentIndex;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % settingsTabs.length;
    else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + settingsTabs.length) % settingsTabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = settingsTabs.length - 1;
    else return;

    event.preventDefault();
    const nextTab = settingsTabs[nextIndex];
    onChange(nextTab.id);
    tabsRef.current[nextIndex]?.focus();
  }

  return <div className="settings-tabs" role="tablist" aria-label="Restaurant settings sections">
    {settingsTabs.map((tab, index) => <button
      key={tab.id}
      ref={(element) => { tabsRef.current[index] = element; }}
      className="settings-tab"
      id={`settings-tab-${tab.id}`}
      type="button"
      role="tab"
      aria-selected={value === tab.id}
      aria-controls={`settings-panel-${tab.id}`}
      tabIndex={value === tab.id ? 0 : -1}
      onClick={() => onChange(tab.id)}
      onKeyDown={handleKeyDown}
    >{tab.label}</button>)}
  </div>;
}
