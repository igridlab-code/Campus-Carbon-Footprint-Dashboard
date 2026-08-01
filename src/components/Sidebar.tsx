import React from 'react';
import { 
  LayoutDashboard, 
  Map, 
  Leaf, 
  AlertTriangle, 
  BrainCircuit, 
  LogOut, 
  Menu, 
  X, 
  User as UserIcon,
  ShieldAlert,
  Building2,
  Users,
  Sparkles,
  ClipboardList
} from 'lucide-react';
import { motion } from 'motion/react';
import { User, UserRole } from '../types';

interface SidebarProps {
  user: User | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  theme: string;
  setTheme: (theme: string) => void;
}

export default function Sidebar({
  user,
  activeTab,
  setActiveTab,
  onLogout,
  collapsed,
  setCollapsed,
}: SidebarProps) {
  let menuItems: { id: string; label: string; icon: any; category?: string }[] = [];

  if (user?.role === 'Admin') {
    menuItems = [
      { id: 'admin-dashboard', label: 'Dashboard', icon: LayoutDashboard, category: 'Core Platform' },
      { id: 'map', label: 'Digital Twin Map', icon: Map, category: 'Spatial Twin' },
      { id: 'sustainability', label: 'Sustainability Tracker', icon: Leaf, category: 'Analytics' },
      { id: 'insights', label: 'AI Eco-Insights', icon: BrainCircuit, category: 'Analytics' },
      { id: 'admin-assets', label: 'Asset Management', icon: Building2, category: 'Administration' },
      { id: 'admin-users', label: 'Member Management', icon: Users, category: 'Administration' },
      { id: 'reports', label: 'Issue Reports', icon: AlertTriangle, category: 'Administration' },
      { id: 'sustainability-logger', label: 'Daily Logger', icon: ClipboardList, category: 'Administration' },
    ];
  } else {
    menuItems = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, category: 'Core Platform' },
      { id: 'map', label: 'Digital Twin Map', icon: Map, category: 'Spatial Twin' },
      { id: 'sustainability', label: 'Sustainability Tracker', icon: Leaf, category: 'Analytics' },
      { id: 'insights', label: 'AI Eco-Insights', icon: BrainCircuit, category: 'Analytics' },
      { id: 'reports', label: 'Issue Reports', icon: AlertTriangle, category: 'Community' },
    ];
  }

  const getRoleColor = (role?: UserRole) => {
    switch (role) {
      case 'Admin': return 'bg-rose-50 text-rose-700 border border-rose-200';
      case 'Management': return 'bg-sky-50 text-[#0056D2] border border-sky-200';
      case 'Faculty': return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'Student': return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      default: return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  };

  return (
    <aside 
      className={`fixed inset-y-0 left-0 z-30 flex flex-col transition-all duration-300 md:static relative overflow-hidden ${
        collapsed ? 'w-20' : 'w-64'
      } shadow-xs bg-[#F7F9FC] border-r border-slate-200`}
      id="sidebar-container"
    >
      <style>{`
        .sidebar-nav-btn {
          position: relative;
          transition: all 0.2s ease !important;
          border: 1px solid transparent !important;
          font-family: var(--font-display) !important;
        }
        .sidebar-nav-btn:hover {
          background-color: #f0f7ff !important;
          border-color: rgba(0, 86, 210, 0.18) !important;
        }
        .sidebar-nav-btn-active {
          background: #e0f2fe !important;
          border: 1px solid rgba(0, 86, 210, 0.25) !important;
          box-shadow: 0 2px 6px rgba(0, 86, 210, 0.08) !important;
        }
        .sidebar-icon {
          transition: transform 0.2s ease, color 0.2s ease !important;
        }
        .sidebar-nav-btn:hover .sidebar-icon {
          transform: scale(1.08) !important;
          color: #0056d2 !important;
        }
      `}</style>

      {/* Brand Header */}
      <div className="flex h-20 items-center justify-between px-4 border-b border-slate-200 relative z-10" id="sidebar-header">
        <div className="flex items-center gap-3 overflow-hidden pl-1">
          <div className="flex items-center justify-center h-10 w-10 shrink-0 rounded-xl bg-[#0056D2] text-white font-extrabold text-xl font-display shadow-xs">
            I
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-display font-bold text-[#0F172A] tracking-tight text-base leading-tight">IndraVerse</span>
              <span className="text-[10px] text-[#0056D2] uppercase tracking-widest font-mono font-bold mt-0.5 flex items-center gap-1">
                <Sparkles size={10} /> Campus Portal OS
              </span>
            </div>
          )}
        </div>
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors border-none bg-transparent cursor-pointer"
          id="toggle-sidebar-btn"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <Menu size={18} /> : <X size={18} />}
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1.5 px-3 py-4 overflow-y-auto relative z-10" id="sidebar-nav">
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeTab === item.id || (item.id === 'admin-dashboard' && activeTab === 'admin-dashboard') || (item.id === 'dashboard' && activeTab === 'dashboard');
          return (
            <motion.button
              whileHover={{ x: 3 }}
              whileTap={{ scale: 0.98 }}
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all font-display text-sm relative overflow-hidden cursor-pointer border-none sidebar-nav-btn ${
                isActive 
                  ? 'sidebar-nav-btn-active text-[#0056D2] font-bold' 
                  : 'text-[#0F172A] font-semibold hover:text-[#0056D2]'
              }`}
              id={`nav-tab-${item.id}`}
              title={item.label}
            >
              {isActive && (
                <motion.span 
                  layoutId="activeIndicatorSidebar"
                  className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-[#0056D2] rounded-r-full"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <IconComponent 
                size={18} 
                className={`sidebar-icon ${isActive ? 'text-[#0056D2]' : 'text-[#64748B]'}`} 
              />
              {!collapsed && <span className="truncate text-sm">{item.label}</span>}
            </motion.button>
          );
        })}
      </nav>

      {/* User Information Footer */}
      <div className="p-3.5 border-t border-slate-200 bg-[#F2F6FB] mt-auto relative z-10" id="sidebar-user-footer">
        {user ? (
          <div>
            <div className="flex items-center gap-2.5 overflow-hidden p-1">
              <div className="flex items-center justify-center h-9 w-9 shrink-0 rounded-xl bg-white text-slate-700 border border-slate-200 shadow-xs">
                {user.role === 'Admin' ? (
                  <ShieldAlert size={16} className="text-rose-600" />
                ) : (
                  <UserIcon size={16} className="text-[#0056D2]" />
                )}
              </div>
              {!collapsed && (
                <div className="flex-1 overflow-hidden">
                  <h4 className="text-xs font-bold text-[#0F172A] truncate leading-tight font-display">{user.name}</h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-bold ${getRoleColor(user.role)}`}>
                      {user.role}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {!collapsed && (
              <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-200 pt-2 px-1">
                <span className="text-[10px] text-[#475569] font-mono truncate font-medium">{user.email}</span>
                <button 
                  onClick={onLogout}
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all bg-transparent border-none cursor-pointer"
                  id="logout-btn"
                  title="Log out of IndraVerse"
                >
                  <LogOut size={14} />
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
