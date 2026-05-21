import { Outlet } from 'react-router-dom';
import TopNav from './TopNav';
import type { AuthUser } from '../lib/types';

interface LayoutProps {
  user: AuthUser;
  onLogout: () => void;
}

export default function Layout({ user, onLogout }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background font-sans antialiased text-foreground">
      <TopNav user={user} onLogout={onLogout} />
      <main className="flex-1 animate-in fade-in duration-500">
        <div className="container max-w-7xl mx-auto py-8 px-4 md:px-8">
          <Outlet context={{ user }} />
        </div>
      </main>
    </div>
  );
}
