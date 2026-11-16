import { useState } from 'react';
import ClientLanding from './components/ClientLanding';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  const [view, setView] = useState('client');

  return view === 'admin' ? (
    <AdminDashboard onBackToPublic={() => setView('client')} />
  ) : (
    <ClientLanding onOpenAdmin={() => setView('admin')} />
  );
}