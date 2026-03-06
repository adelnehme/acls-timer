import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { useSettingsStore } from './stores/settingsStore';
import { HomeScreen } from './components/setup/HomeScreen';
import { QuickSetup } from './components/setup/QuickSetup';
import { Dashboard } from './components/dashboard/Dashboard';
import { SummaryScreen } from './components/summary/SummaryScreen';
import i18n from './i18n';

export default function App() {
  const language = useSettingsStore((s) => s.language);

  // Sync i18n language with settings store
  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/setup" element={<QuickSetup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/summary" element={<SummaryScreen />} />
      </Routes>
    </BrowserRouter>
  );
}
