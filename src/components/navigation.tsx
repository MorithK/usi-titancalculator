import React from 'react';
import type { TabId, TabItem } from '../types/navigation';

interface NavigationProps {
  activeTab: TabId;
  onTabChange: (tabId: TabId) => void;
}

const TABS: TabItem[] = [
  { id: 'core', label: 'Core / Upgrades', description: 'Main titan upgrades & milestone timers' },
  { id: 'warp', label: 'Warp Calculator', description: 'Overdrive & warp progression' },
  { id: 'synth', label: 'Synth', description: 'Synthesis modules & speed tuning' },
  { id: 'crew', label: 'Crew & Shards', description: 'Infusions, technician, and shard bonuses' },
  { id: 'notes', label: 'Notes & Guide', description: 'Reference sheets and instructions' },
];

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* App Title / Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md">
              TC
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-100 tracking-wide">USI - Titan Calculator</h1>
              <p className="text-xs text-slate-400">Optimization Suite</p>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="flex space-x-1 sm:space-x-2" aria-label="Tabs">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  title={tab.description}
                  aria-current={isActive ? 'page' : undefined}
                  className={`
                    px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 relative flex items-center gap-2
                    ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }
                  `}
                >
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full ${
                        isActive ? 'bg-indigo-700 text-white' : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};