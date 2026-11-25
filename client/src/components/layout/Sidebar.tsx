import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  CalendarDays,
  Users2,
  UserCheck,
  Building2,
  Sliders,
  Network,
  Palmtree,
  CalendarOff,
  History,
  Sparkles,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { to: '/roster', label: 'Roster Dashboard', icon: CalendarDays, badge: 'Core' },
    { to: '/leaves', label: 'Leaves & Demo', icon: CalendarOff, badge: 'Demo' },
    { to: '/assignments', label: 'Assignments Matrix', icon: Network },
    { to: '/processes', label: 'Processes & Rules', icon: Sliders },
    { to: '/brands', label: 'D2C Brands', icon: Building2 },
    { to: '/employees', label: 'Employees', icon: UserCheck },
    { to: '/pods', label: 'Pods', icon: Users2 },
    { to: '/holidays', label: 'Holidays', icon: Palmtree },
    { to: '/audit-logs', label: 'Audit Log & History', icon: History },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0">
      <div className="p-4 border-b border-slate-800 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-indigo-400" />
        <span className="font-semibold text-white text-sm tracking-wide">
          Operations Control
        </span>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-[11px] font-semibold uppercase text-slate-400 tracking-wider">
          Scheduling & Roster
        </div>

        {navItems.slice(0, 3).map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 text-slate-400 group-hover:text-white" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-300">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}

        <div className="pt-4 px-3 py-2 text-[11px] font-semibold uppercase text-slate-400 tracking-wider">
          Configuration & Setup
        </div>

        {navItems.slice(3).map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4 text-slate-400 group-hover:text-white" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-950/50">
        <div className="bg-slate-800/60 rounded-lg p-3 text-xs text-slate-400 border border-slate-700/50">
          <p className="font-semibold text-slate-200 mb-1">Roster Engine Status</p>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Pure Constraint Engine Active
          </div>
        </div>
      </div>
    </aside>
  );
};
