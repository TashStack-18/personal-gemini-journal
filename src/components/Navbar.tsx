import React from 'react';
import { useAuth } from '../contexts/AuthContext.js';
import { Compass, LogOut, MapPin, Sun, PenLine, BookOpen, TrendingUp, Settings } from 'lucide-react';
import { AtmosphericContext } from '../types.js';

export type NavTab = 'journal' | 'history' | 'rewind' | 'settings';

interface NavbarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  atmosphere?: AtmosphericContext | null;
  onSearchClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  atmosphere,
}) => {
  const { user, logOut } = useAuth();

  const navItems: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'journal', label: 'Journal', icon: PenLine },
    { id: 'history', label: 'History', icon: BookOpen },
    { id: 'rewind', label: 'Mood Rewind', icon: TrendingUp },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Desktop & Tablet Top App Bar */}
      <header className="w-full bg-[#faf8f5]/90 backdrop-blur-md sticky top-0 z-40 border-b border-stone-200/90 select-none transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-15 flex items-center justify-between">
          {/* App Brand Mark */}
          <div
            onClick={() => onTabChange('journal')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-stone-900 text-stone-100 flex items-center justify-center transition-all group-hover:scale-105 group-hover:shadow-xs shadow-stone-900/10 border border-stone-800">
              <Compass className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform duration-500" />
            </div>
            <div className="flex flex-col">
              <span className="font-editorial text-base sm:text-lg font-semibold tracking-tight text-stone-900 leading-none">
                Personal Gemini Journal
              </span>
              <span className="text-[10px] font-meta text-stone-600 tracking-wider uppercase mt-0.5">
                Intimate sanctuary
              </span>
            </div>
          </div>

          {/* Desktop App Segmented Tab Control */}
          <nav className="hidden sm:flex items-center gap-1 bg-stone-200/60 p-1 rounded-xl border border-stone-300/50 shadow-inner">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  id={`nav-${item.id}`}
                  onClick={() => onTabChange(item.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-white text-stone-900 shadow-2xs font-semibold ring-1 ring-stone-900/5'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-600' : 'text-stone-600'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Status Capsule & User Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {atmosphere && (
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-stone-200/80 text-stone-700 text-[11px] font-meta shadow-2xs">
                <Sun className="w-3 h-3 text-amber-600 shrink-0" />
                <span className="font-medium text-stone-800">{atmosphere.temperature}°C</span>
                <span className="text-stone-400">·</span>
                <MapPin className="w-2.5 h-2.5 text-stone-600 shrink-0" />
                <span className="max-w-[110px] truncate text-stone-700">{atmosphere.locationName.split(',')[0]}</span>
              </div>
            )}

            {user && (
              <div className="flex items-center gap-2">
                {/* User Avatar / Profile Quick Link */}
                <button
                  type="button"
                  onClick={() => onTabChange('settings')}
                  className="flex items-center gap-2 py-1 px-1.5 rounded-full hover:bg-stone-200/60 transition-colors cursor-pointer border border-transparent hover:border-stone-200"
                  title={`Signed in as ${user.displayName || user.email}`}
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Profile'}
                      className="w-7 h-7 rounded-full border border-stone-300 object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-stone-900 text-stone-100 flex items-center justify-center text-xs font-semibold shadow-2xs">
                      {(user.displayName || user.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <span className="hidden lg:inline text-xs font-medium text-stone-800 max-w-[90px] truncate">
                    {user.displayName?.split(' ')[0] || user.email?.split('@')[0]}
                  </span>
                </button>

                {/* Logout Icon */}
                <button
                  type="button"
                  id="btn-logout"
                  onClick={() => logOut()}
                  className="p-1.5 text-stone-600 hover:text-stone-950 hover:bg-stone-200/60 rounded-lg transition-colors cursor-pointer"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile App Bottom Navigation Dock (iOS / Android App Style) */}
      {user && (
        <nav
          aria-label="Mobile app navigation"
          className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#f8f7f4]/95 backdrop-blur-lg border-t border-stone-200/90 px-3 py-1.5 flex items-center justify-around shadow-lg"
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                id={`mobile-nav-${item.id}`}
                onClick={() => onTabChange(item.id)}
                className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
                  isActive
                    ? 'text-stone-950 font-semibold'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <div
                  className={`p-1 rounded-lg transition-colors ${
                    isActive ? 'bg-stone-900 text-amber-400 shadow-2xs' : 'text-stone-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight font-sans">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      )}
    </>
  );
};
