import logoIgridDefault from './assets/logo_igrid.png';
import logoInstitutionDefault from './assets/logo_institution.png';
import logoCollegeDefault from './assets/logo_college.png';
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import CampusMap from './components/CampusMap';
import Sustainability from './components/Sustainability';
import IssueReporter from './components/IssueReporter';
import AiInsights from './components/AiInsights';
import AuthModal from './components/AuthModal';
import UserManagement from './components/UserManagement';
import DailySustainabilityLogger from './components/DailySustainabilityLogger';
import AssetManagement from './components/AssetManagement';
import VirtualCampusTour from './components/VirtualCampusTour';
import StreetViewModal from './components/StreetViewModal';
import AdminSettings from './components/AdminSettings';
import ErrorBoundary from './components/ErrorBoundary';
import { User, CampusAsset, IssueReport, AiRecommendation, UserRole, ReportStatus } from './types';
import { getCmsConfig, CmsConfig, DEFAULT_CMS_CONFIG } from './utils/cmsStore';
import { Menu, X, Shield, Lock, ShieldAlert, Facebook, Twitter, Linkedin, Youtube, Instagram } from 'lucide-react';

const TAB_PATH_MAPPING: Record<string, string> = {
  'dashboard': '/',
  'map': '/map',
  'sustainability': '/sustainability',
  'insights': '/insights',
  'reports': '/reports',
  'about': '/about',
  'contact': '/contact',
  'admin-login': '/secure-admin',
  'admin-dashboard': '/admin/dashboard',
  'admin-assets': '/admin/assets',
  'admin-users': '/admin/users',
  'admin-settings': '/admin/settings',
  'sustainability-logger': '/admin/logger',
  'virtual-tour': '/virtual-tour',
};

const PATH_TAB_MAPPING: Record<string, string> = {
  '/': 'dashboard',
  '/map': 'map',
  '/sustainability': 'sustainability',
  '/insights': 'insights',
  '/reports': 'reports',
  '/about': 'about',
  '/contact': 'contact',
  '/secure-admin': 'admin-login',
  '/admin-login': 'admin-login',
  '/admin/login': 'admin-login',
  '/admin/dashboard': 'admin-dashboard',
  '/admin/assets': 'admin-assets',
  '/admin/users': 'admin-users',
  '/admin/settings': 'admin-settings',
  '/admin/logger': 'sustainability-logger',
  '/virtual-tour': 'virtual-tour',
  '/dashboard': 'dashboard',
  '/admin': 'admin-login',
};

const TAB_TITLE_MAPPING: Record<string, string> = {
  'dashboard': 'Indra Ganesan Institutions | Official Campus Portal',
  'map': 'Campus Map | Indra Ganesan Institutions',
  'sustainability': 'Sustainability | Indra Ganesan Institutions',
  'insights': 'AI Eco-Insights | Indra Ganesan Institutions',
  'reports': 'Reports | Indra Ganesan Institutions',
  'about': 'About Us | Indra Ganesan Institutions',
  'contact': 'Contact | Indra Ganesan Institutions',
  'admin-login': 'Portal Management',
  'admin-dashboard': 'Admin Workspace | Indra Ganesan Institutions',
  'admin-assets': 'Asset Management | Indra Ganesan Institutions',
  'admin-users': 'Member Management | Indra Ganesan Institutions',
  'admin-settings': 'System Settings | Indra Ganesan Institutions',
  'sustainability-logger': 'Daily Logger | Indra Ganesan Institutions',
  'virtual-tour': 'Virtual Tour | Indra Ganesan Institutions',
};

function PublicHeader({ 
  activeTab, 
  setActiveTab,
  cmsConfig
}: { 
  activeTab: string; 
  setActiveTab: (t: string) => void;
  cmsConfig: CmsConfig;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Complete Navigation Menu items (EXACT EXISTING MENU ONLY - NO NEW ITEMS ADDED)
  const navItems = [
    { id: 'dashboard', label: 'Home' },
    { id: 'map', label: 'Campus Map' },
    { id: 'sustainability', label: 'Sustainability' },
    { id: 'reports', label: 'Reports' },
    { id: 'insights', label: 'AI Insights' },
    { id: 'virtual-tour', label: 'Virtual Tour' },
    { id: 'about', label: 'About' },
    { id: 'contact', label: 'Contact' },
  ];

  const logoIgrid = cmsConfig.logoIgridUrl || logoIgridDefault;
  const logoInstitution = cmsConfig.logoInstitutionUrl || logoInstitutionDefault;
  const logoCollege = cmsConfig.logoCollegeUrl || logoCollegeDefault;

  return (
    <header className="sticky top-0 z-40 w-full shadow-lg font-sans">
      {/* Top Branding Section - Official Dark Navy Blue Institutional Theme (#0A192F) */}
      <div className="bg-[#0A192F] text-white border-b border-blue-900/50 py-3 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[98rem] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Official Logos Container: [IGRID LAB Logo + Subtext] -> [Indra Ganesan Institutions Logo] -> [IGCE Logo] */}
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap justify-center md:justify-start">
            
            {/* Logo 1: IGRID LAB Logo + "Powered by IndraVerse" directly below */}
            <div 
              className="flex flex-col items-start cursor-pointer group shrink-0"
              onClick={() => setActiveTab('dashboard')}
            >
              <img 
                src={logoIgrid} 
                alt="IGRID LAB" 
                className="h-10 sm:h-12 w-auto object-contain transition-transform group-hover:scale-[1.02] filter drop-shadow-[0_2px_8px_rgba(255,255,255,0.15)]" 
              />
              <span className="text-[10px] font-mono tracking-wider text-sky-300 font-semibold mt-0.5 pl-0.5 flex items-center gap-1">
                <span className="text-slate-300">Powered by</span>
                <strong className="text-amber-400 font-extrabold">{cmsConfig.poweredByText || 'IndraVerse'}</strong>
              </span>
            </div>

            {/* Vertical Divider */}
            <div className="h-10 w-px bg-white/20 hidden sm:block"></div>

            {/* Logo 2: Indra Ganesan Institutions Logo */}
            <div 
              className="flex items-center cursor-pointer group shrink-0"
              onClick={() => setActiveTab('dashboard')}
            >
              <img 
                src={logoInstitution} 
                alt={cmsConfig.institutionName || "Indra Ganesan Institutions"} 
                className="h-12 sm:h-14 w-auto object-contain transition-transform group-hover:scale-[1.02] filter drop-shadow-md" 
              />
            </div>

            {/* Vertical Divider */}
            <div className="h-10 w-px bg-white/20 hidden sm:block"></div>

            {/* Logo 3: Indra Ganesan College of Engineering (IGCE) Logo (Matched to equal height as Institutions logo) */}
            <div 
              className="flex items-center cursor-pointer group shrink-0"
              onClick={() => setActiveTab('dashboard')}
            >
              <img 
                src={logoCollege} 
                alt="Indra Ganesan College of Engineering" 
                className="h-12 sm:h-14 w-auto object-contain transition-transform group-hover:scale-[1.02] filter drop-shadow-md" 
              />
            </div>
          </div>

          {/* Right Action Button / Accreditation Badge */}
          <div className="hidden lg:flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-950/80 border border-blue-400/30 text-xs text-sky-200">
              <Shield className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-semibold">NAAC B++ Accredited</span>
            </div>
            <button
              onClick={() => setActiveTab('contact')}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-md transition-all flex items-center gap-1.5 border border-white/20 cursor-pointer"
            >
              <span>Apply Now</span>
              <span>↗</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Bar Section - Clean Institutional Styling */}
      <div className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-[98rem] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          
          {/* Existing Navigation Menu Links ONLY - Preserved Exactly */}
          <nav className="hidden xl:flex items-center gap-1">
            {navItems.map((item, idx) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={idx}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-4 py-2 font-display text-sm font-semibold transition-all duration-300 cursor-pointer border-none ${
                    isActive 
                      ? 'bg-[#EAF2FF] text-[#0B1F4D] shadow-xs font-bold rounded-full' 
                      : 'bg-transparent text-slate-700 hover:text-[#0B1F4D] hover:bg-[#EAF2FF] rounded-full'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Mobile Navigation Controls */}
          <div className="xl:hidden flex items-center justify-between w-full py-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider font-display">Campus Navigation</span>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-800 hover:text-blue-700 rounded-lg bg-slate-100 border border-slate-200 cursor-pointer"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-slate-200 bg-white/98 backdrop-blur-xl px-4 py-3 space-y-1.5 shadow-xl animate-fade-in">
          {navItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                setActiveTab(item.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-sm font-semibold transition-all duration-300 border-none font-display ${
                activeTab === item.id 
                  ? 'bg-[#EAF2FF] text-[#0B1F4D] font-bold rounded-full' 
                  : 'bg-transparent text-slate-700 hover:bg-[#EAF2FF] hover:text-[#0B1F4D] rounded-full'
              }`}
            >
              {item.label}
            </button>
          ))}
          <div className="pt-2 border-t border-slate-200">
            <button
              onClick={() => {
                setActiveTab('contact');
                setMobileMenuOpen(false);
              }}
              className="w-full bg-blue-700 text-white font-bold text-sm py-2.5 rounded-lg shadow-sm"
            >
              Apply Now ↗
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

function PublicFooter({ 
  setActiveTab,
  cmsConfig
}: { 
  setActiveTab: (t: string) => void;
  cmsConfig: CmsConfig;
}) {
  const logoIgrid = cmsConfig.logoIgridUrl || logoIgridDefault;
  const logoInstitution = cmsConfig.logoInstitutionUrl || logoInstitutionDefault;
  const logoCollege = cmsConfig.logoCollegeUrl || logoCollegeDefault;

  return (
    <footer className="text-slate-200 mt-16 relative z-10 border-t border-blue-900/60 bg-[#0A192F] font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          
          {/* Col 1: Institutional Branding with all 3 official logos */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
              <img src={logoIgrid} alt="IGRID LAB" className="h-10 w-auto object-contain filter drop-shadow-md" />
              <div className="h-6 w-px bg-white/20"></div>
              <img src={logoInstitution} alt={cmsConfig.institutionName} className="h-12 w-auto object-contain filter drop-shadow-md" />
              <div className="h-6 w-px bg-white/20"></div>
              <img src={logoCollege} alt="IGCE Logo" className="h-12 w-auto object-contain filter drop-shadow-md" />
            </div>

            <span className="text-xs font-mono text-sky-300 block">
              Powered by <strong className="text-amber-400 font-bold">{cmsConfig.poweredByText || 'IndraVerse'}</strong>
            </span>

            <p className="text-slate-300 text-sm leading-relaxed font-sans">
              {cmsConfig.footerDescription || `${cmsConfig.institutionName || 'Indra Ganesan Institutions'} is a premier educational group dedicated to academic excellence, innovation, and institutional sustainability.`}
            </p>

            <div className="pt-1 flex flex-wrap items-center gap-2.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 border border-white/20 rounded-full text-xs font-bold text-white">
                <Shield size={13} className="text-sky-300" />
                <span>NAAC B++ Accredited</span>
              </div>
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div className="space-y-3">
            <h4 className="font-display font-semibold text-white text-base border-b border-blue-800/60 pb-2 inline-block">
              Quick Links
            </h4>
            <ul className="space-y-2.5 text-sm font-medium">
              {[
                { label: 'Home', tab: 'dashboard' },
                { label: 'Campus Map', tab: 'map' },
                { label: 'Sustainability', tab: 'sustainability' },
                { label: 'Reports', tab: 'reports' },
                { label: 'AI Insights', tab: 'insights' },
                { label: 'Virtual Tour', tab: 'virtual-tour' },
                { label: 'About Us', tab: 'about' },
                { label: 'Contact Us', tab: 'contact' }
              ].map((item, idx) => (
                <li key={idx}>
                  <button 
                    onClick={() => setActiveTab(item.tab)}
                    className="hover:text-sky-300 transition-colors flex items-center gap-2 cursor-pointer bg-transparent border-none text-slate-300 text-xs p-0 font-medium font-sans"
                  >
                    <span className="text-sky-400">›</span> {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Contact Details (Placeholders managed via Admin Panel / cmsConfig) */}
          <div className="space-y-3">
            <h4 className="font-display font-semibold text-white text-base border-b border-blue-800/60 pb-2 inline-block">
              Contact Details
            </h4>
            <div className="space-y-3 text-xs text-slate-300 leading-relaxed font-sans">
              <div className="flex items-start gap-2.5">
                <span className="text-sky-400 shrink-0 mt-0.5">📍</span>
                <span>{cmsConfig.address || "Indra Ganesan Institutions, Madurai Main Road, Manikandam, Tiruchirappalli - 620012"}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-sky-400 shrink-0">✉️</span>
                <a href={`mailto:${cmsConfig.email || 'info@igce.org.in'}`} className="hover:text-sky-300 transition-colors">
                  {cmsConfig.email || 'info@igce.org.in'}
                </a>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-sky-400 shrink-0">📞</span>
                <span>{cmsConfig.phone || '+91 85080 52555'} / {cmsConfig.phoneSecondary || '+91 85080 52666'}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-sky-400 shrink-0">🌐</span>
                <a href={cmsConfig.websiteUrl || 'https://igce.org.in'} target="_blank" rel="noreferrer" className="hover:text-sky-300 transition-colors">
                  {cmsConfig.websiteUrl || 'https://igce.org.in'}
                </a>
              </div>
            </div>
          </div>

          {/* Col 4: Social Links & Newsletter */}
          <div className="space-y-3">
            <h4 className="font-display font-semibold text-white text-base border-b border-blue-800/60 pb-2 inline-block">
              Connect With Us
            </h4>
            <p className="text-slate-300 text-xs leading-relaxed font-sans">
              Subscribe to receive official institutional news and announcements.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); alert('Thank you for subscribing!'); }} className="space-y-2.5">
              <input
                type="email"
                required
                placeholder="Your email address"
                className="w-full px-3.5 py-2.5 bg-blue-950/80 border border-blue-800/80 focus:border-sky-400 rounded-xl text-white text-xs outline-none transition-all placeholder:text-slate-500 font-sans"
              />
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-bold text-xs py-2 rounded-xl transition-all shadow-md cursor-pointer border border-white/10"
              >
                Subscribe
              </button>
            </form>

            <div className="pt-2 flex items-center gap-3">
              <a 
                href={cmsConfig.facebookUrl || "https://facebook.com"} 
                target="_blank" 
                rel="noreferrer" 
                className="w-8 h-8 rounded-lg bg-blue-900/60 hover:bg-[#0056D2] text-white flex items-center justify-center transition-all duration-300 border border-blue-700/50 shadow-[0_0_8px_rgba(37,99,235,0.2)] hover:shadow-[0_0_12px_rgba(37,99,235,0.5)] group"
                title="Facebook"
              >
                <Facebook size={16} className="text-white transition-transform duration-300 group-hover:scale-110" />
              </a>
              <a 
                href={cmsConfig.twitterUrl || "https://twitter.com"} 
                target="_blank" 
                rel="noreferrer" 
                className="w-8 h-8 rounded-lg bg-blue-900/60 hover:bg-[#0056D2] text-white flex items-center justify-center transition-all duration-300 border border-blue-700/50 shadow-[0_0_8px_rgba(37,99,235,0.2)] hover:shadow-[0_0_12px_rgba(37,99,235,0.5)] group"
                title="X (Twitter)"
              >
                <Twitter size={16} className="text-white transition-transform duration-300 group-hover:scale-110" />
              </a>
              <a 
                href={cmsConfig.linkedinUrl || "https://linkedin.com"} 
                target="_blank" 
                rel="noreferrer" 
                className="w-8 h-8 rounded-lg bg-blue-900/60 hover:bg-[#0056D2] text-white flex items-center justify-center transition-all duration-300 border border-blue-700/50 shadow-[0_0_8px_rgba(37,99,235,0.2)] hover:shadow-[0_0_12px_rgba(37,99,235,0.5)] group"
                title="LinkedIn"
              >
                <Linkedin size={16} className="text-white transition-transform duration-300 group-hover:scale-110" />
              </a>
              <a 
                href={cmsConfig.instagramUrl || "https://instagram.com"} 
                target="_blank" 
                rel="noreferrer" 
                className="w-8 h-8 rounded-lg bg-blue-900/60 hover:bg-[#0056D2] text-white flex items-center justify-center transition-all duration-300 border border-blue-700/50 shadow-[0_0_8px_rgba(37,99,235,0.2)] hover:shadow-[0_0_12px_rgba(37,99,235,0.5)] group"
                title="Instagram"
              >
                <Instagram size={16} className="text-white transition-transform duration-300 group-hover:scale-110" />
              </a>
              <a 
                href={cmsConfig.youtubeUrl || "https://youtube.com"} 
                target="_blank" 
                rel="noreferrer" 
                className="w-8 h-8 rounded-lg bg-blue-900/60 hover:bg-[#0056D2] text-white flex items-center justify-center transition-all duration-300 border border-blue-700/50 shadow-[0_0_8px_rgba(37,99,235,0.2)] hover:shadow-[0_0_12px_rgba(37,99,235,0.5)] group"
                title="YouTube"
              >
                <Youtube size={16} className="text-white transition-transform duration-300 group-hover:scale-110" />
              </a>
            </div>
          </div>

        </div>

        <div className="mt-12 pt-6 border-t border-blue-900/50 flex flex-col md:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <p>© {new Date().getFullYear()} {cmsConfig.institutionName || 'Indra Ganesan Institutions'}. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <button onClick={() => setActiveTab('about')} className="hover:text-slate-200 transition-colors bg-transparent border-none p-0 cursor-pointer text-slate-400 text-xs">Privacy Policy</button>
            <button onClick={() => setActiveTab('contact')} className="hover:text-slate-200 transition-colors bg-transparent border-none p-0 cursor-pointer text-slate-400 text-xs">Terms of Service</button>
            <button onClick={() => setActiveTab('admin-login')} className="hover:text-sky-300 transition-colors bg-transparent border-none p-0 cursor-pointer text-slate-400 text-xs">Portal Access</button>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const [token, setToken] = useState<string | null>(localStorage.getItem('indraverse_token'));
  const [user, setUser] = useState<User | null>(null);
  
  const [assets, setAssets] = useState<CampusAsset[]>([]);
  const [reports, setReports] = useState<IssueReport[]>([]);
  const [recommendations, setRecommendations] = useState<AiRecommendation[]>([]);
  
  // Central CMS Configuration Store State
  const [cmsConfig, setCmsConfig] = useState<CmsConfig>(DEFAULT_CMS_CONFIG);

  const handleCmsUpdate = (newConfig: CmsConfig) => {
    setCmsConfig(newConfig);
  };

  const [activeTab, setActiveTabState] = useState<string>(() => {
    const pathname = window.location.pathname;
    return PATH_TAB_MAPPING[pathname] || 'dashboard';
  });

  const setActiveTab = (tab: string) => {
    const targetPath = TAB_PATH_MAPPING[tab] || '/';
    if (location.pathname !== targetPath) {
      navigate(targetPath);
    } else {
      setActiveTabState(tab);
    }
  };

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [quickReportLocation, setQuickReportLocation] = useState('');
  const [activeStreetViewAsset, setActiveStreetViewAsset] = useState<CampusAsset | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const [showForcePasswordChange, setShowForcePasswordChange] = useState(false);
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passwordChangeError, setPasswordChangeError] = useState('');
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    let timeoutId: NodeJS.Timeout;
    const INACTIVITY_MS = 15 * 60 * 1000;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        handleLogout();
        alert('Your security session has expired due to 15 minutes of inactivity. Please sign in again.');
      }, INACTIVITY_MS);
    };

    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    activityEvents.forEach(evt => window.addEventListener(evt, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      activityEvents.forEach(evt => window.removeEventListener(evt, resetTimer));
    };
  }, [token]);

  useEffect(() => {
    const initApp = async () => {
      try {
        const config = await getCmsConfig();
        setCmsConfig(config);
        
        if (token) {
          const res = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const userData = await res.json();
            setUser(userData);
            if (userData.isFirstLogin === true) {
              setShowForcePasswordChange(true);
            }
          } else {
            handleLogout();
          }
        }
        await fetchAppData();
      } catch (err) {
        console.error('Error initializing application data', err);
      } finally {
        setIsDataLoaded(true);
      }
    };

    initApp();
  }, [token]);

  useEffect(() => {
    if (!isDataLoaded) return;

    const currentPath = location.pathname;
    const targetTab = PATH_TAB_MAPPING[currentPath] || 'dashboard';
    const adminTabs = ['admin-dashboard', 'admin-settings', 'admin-users', 'admin-assets', 'sustainability-logger'];

    let hasPermission = true;
    let shouldRedirectToLogin = false;

    if (adminTabs.includes(targetTab)) {
      if (!user) {
        hasPermission = false;
        shouldRedirectToLogin = true;
      } else if (user.role !== 'Admin') {
        hasPermission = false;
      }
    }

    if (!hasPermission) {
      if (shouldRedirectToLogin) {
        setActiveTabState('admin-login');
        if (currentPath !== '/secure-admin' && currentPath !== '/admin/login') {
          navigate('/secure-admin', { replace: true });
        }
      } else {
        setActiveTabState('dashboard');
        if (currentPath !== '/') {
          navigate('/', { replace: true });
        }
        alert('Access Denied - Authorized privileges required.');
      }
      return;
    }

    setActiveTabState(targetTab);
    document.title = TAB_TITLE_MAPPING[targetTab] || cmsConfig.institutionName;
  }, [location.pathname, user, isDataLoaded, navigate, cmsConfig]);

  const fetchAppData = async () => {
    try {
      const currentToken = localStorage.getItem('indraverse_token');
      const headers = currentToken ? { 'Authorization': `Bearer ${currentToken}` } : undefined;
      
      const [assetsRes, reportsRes, recsRes] = await Promise.all([
        fetch('/api/assets', { headers }),
        fetch('/api/reports', { headers }),
        fetch('/api/ai/recommendations', { headers })
      ]);

      if (assetsRes.ok) setAssets(await assetsRes.json());
      if (reportsRes.ok) setReports(await reportsRes.json());
      if (recsRes.ok) setRecommendations(await recsRes.json());
    } catch (err) {
      console.error('Failed to load application databases', err);
    }
  };

  const handleLogin = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Login failed');
    }

    const data = await res.json();
    localStorage.setItem('indraverse_token', data.token);
    setToken(data.token);
    setUser(data.user);
    if (data.user.isFirstLogin === true) {
      setShowForcePasswordChange(true);
    }
    await fetchAppData();
  };

  const handleRegister = async (email: string, password: string, name: string, role: UserRole) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, role })
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Registration failed');
    }

    const data = await res.json();
    localStorage.setItem('indraverse_token', data.token);
    setToken(data.token);
    setUser(data.user);
    await fetchAppData();
  };

  const handleLogout = () => {
    localStorage.removeItem('indraverse_token');
    setToken(null);
    setUser(null);
    setShowForcePasswordChange(false);
    setActiveTab('dashboard');
  };

  const handleForcePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeError('');

    if (!newPass.trim()) {
      setPasswordChangeError('Password cannot be empty.');
      return;
    }
    if (newPass !== confirmPass) {
      setPasswordChangeError('Passwords do not match.');
      return;
    }
    if (newPass.length < 6) {
      setPasswordChangeError('Password must be at least 6 characters.');
      return;
    }

    setPasswordChangeLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword: newPass.trim() })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to update password.');
      }

      setUser(prev => prev ? { ...prev, isFirstLogin: false } : null);
      setShowForcePasswordChange(false);
      alert('Password updated successfully. Welcome to Admin Workspace.');
    } catch (err: any) {
      console.error(err);
      setPasswordChangeError(err.message || 'Error updating security credentials.');
    } finally {
      setPasswordChangeLoading(false);
    }
  };

  const handleUpdateAsset = async (id: string, updatedFields: Partial<CampusAsset>) => {
    if (!token) return;
    const res = await fetch(`/api/assets/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updatedFields)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Asset metrics modification rejected');
    }

    const updatedAsset = await res.json();
    setAssets(prev => prev.map(a => a.id === id ? updatedAsset : a));
  };

  const handleCreateReport = async (reportFields: any) => {
    const headers: any = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch('/api/reports', {
      method: 'POST',
      headers,
      body: JSON.stringify(reportFields)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Report creation rejected');
    }

    const newReport = await res.json();
    setReports(prev => [newReport, ...prev]);
  };

  const handleUpdateReportStatus = async (id: string, status: ReportStatus) => {
    if (!token) return;
    const res = await fetch(`/api/reports/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Operational status modification rejected');
    }

    const updatedReport = await res.json();
    setReports(prev => prev.map(r => r.id === id ? updatedReport : r));
  };

  const handleDeleteReport = async (id: string) => {
    if (!token) return;
    const res = await fetch(`/api/reports/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Report deletion rejected');
    }

    setReports(prev => prev.filter(r => r.id !== id));
  };

  const handleTriggerAudit = async () => {
    if (!token) return;
    const res = await fetch('/api/ai/insights', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'AI model inference failed');
    }

    const data = await res.json();
    setRecommendations(data.recommendations);
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            assets={assets} 
            user={user} 
            onUpdateAsset={handleUpdateAsset}
            cmsConfig={cmsConfig}
          />
        );
      case 'map':
        return (
          <CampusMap 
            assets={assets} 
            setActiveTab={setActiveTab} 
            setQuickReportLocation={setQuickReportLocation} 
            onOpenStreetView={(asset) => setActiveStreetViewAsset(asset)}
          />
        );
      case 'sustainability':
        return (
          <Sustainability 
            assets={assets} 
          />
        );
      case 'sustainability-logger':
        if (!user || user.role !== 'Admin') {
          return <div className="p-8 text-[#475569] font-mono text-xs">Access Denied. Admin privilege required.</div>;
        }
        return (
          <DailySustainabilityLogger 
            token={token}
            assets={assets}
            onLogAdded={fetchAppData}
          />
        );
      case 'reports':
        return (
          <IssueReporter 
            assets={assets} 
            reports={reports} 
            user={user} 
            onSubmitReport={handleCreateReport} 
            onUpdateStatus={handleUpdateReportStatus}
            onDeleteReport={handleDeleteReport}
            quickReportLocation={quickReportLocation}
            setQuickReportLocation={setQuickReportLocation}
          />
        );
      case 'insights':
        return (
          <AiInsights 
            recommendations={recommendations} 
            onTriggerAudit={handleTriggerAudit} 
            userRole={user?.role}
          />
        );
      case 'about':
        return <AboutView cmsConfig={cmsConfig} />;
      case 'contact':
        return <ContactView cmsConfig={cmsConfig} />;
      case 'admin-dashboard':
        if (!user || user.role !== 'Admin') {
          return <div className="p-8 text-[#475569] font-mono text-xs">Access Denied. Admin privilege required.</div>;
        }
        return <AdminDashboardView setActiveTab={setActiveTab} />;
      case 'admin-users':
        if (!user || user.role !== 'Admin') {
          return <div className="p-8 text-[#475569] font-mono text-xs">Access Denied. Admin privilege required.</div>;
        }
        return <UserManagement token={token} />;
      case 'admin-settings':
        if (!user || user.role !== 'Admin') {
          return <div className="p-8 text-[#475569] font-mono text-xs">Access Denied. Admin privilege required.</div>;
        }
        return (
          <AdminSettings
            token={token}
            user={user}
            onUserUpdate={(updatedUser) => setUser(updatedUser)}
            onLogout={handleLogout}
            cmsConfig={cmsConfig}
            onCmsUpdate={handleCmsUpdate}
          />
        );
      case 'admin-assets':
        if (!user || user.role !== 'Admin') {
          return <div className="p-8 text-[#475569] font-mono text-xs">Access Denied. Admin privilege required.</div>;
        }
        return (
          <AssetManagement 
            token={token} 
            assets={assets} 
            onAssetsChanged={fetchAppData} 
          />
        );
      case 'virtual-tour':
        return (
          <VirtualCampusTour 
            assets={assets} 
            onAssetsChanged={fetchAppData} 
            user={user} 
            token={token || undefined}
          />
        );
      case 'admin-login':
        return (
          <AuthModal 
            onLogin={async (email, password) => {
              await handleLogin(email, password);
              setActiveTab('admin-dashboard');
            }} 
            onRegister={handleRegister}
            onClose={() => setActiveTab('dashboard')}
          />
        );
      default:
        return <div className="text-[#475569] p-8">Section not found</div>;
    }
  };

  // Clean Portal Loading Screen
  if (!isDataLoaded) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] flex flex-col justify-center items-center relative overflow-hidden">
        <div className="text-center text-[#334155] flex flex-col items-center justify-center gap-4 z-10 p-6 max-w-md animate-fade-in">
          <div className="relative flex items-center justify-center">
            <div className="h-14 w-14 rounded-full border-3 border-sky-200 border-t-[#0056D2] animate-spin shadow-sm" />
            <img src={cmsConfig.logoIgridUrl || logoIgridDefault} alt="IGRID LAB" className="h-7 w-auto object-contain absolute animate-float-logo" />
          </div>

          <div className="space-y-1">
            <h2 className="page-title text-xl">{cmsConfig.institutionName}</h2>
            <p className="text-xs text-[#0056D2] font-mono font-medium">Loading Official Campus Portal...</p>
          </div>

          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
            <div className="h-full bg-[#0056D2] animate-pulse w-3/4 rounded-full" />
          </div>

          <div className="powered-by-badge">
            <span>Powered by</span>
            <span className="font-extrabold text-[#0056D2]">{cmsConfig.poweredByText}</span>
          </div>
        </div>
      </div>
    );
  }

  const isAdminTab = activeTab.startsWith('admin-') || activeTab === 'sustainability-logger';

  if (isAdminTab && user?.role === 'Admin') {
    return (
      <div className="min-h-screen bg-[#F7F9FC] font-sans text-[#0F172A] flex flex-col md:flex-row relative">
        {showForcePasswordChange && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">
              <div className="text-center space-y-2 mb-6">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 font-bold text-2xl font-display">
                  <Lock size={22} />
                </div>
                <h2 className="card-title text-[#0F172A]">Security Requirement</h2>
                <p className="secondary-text text-xs">
                  Please update your credentials to secure your administrator profile.
                </p>
              </div>

              {passwordChangeError && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs flex items-center gap-2 font-mono">
                  <ShieldAlert size={16} className="shrink-0 text-rose-600" />
                  <span>{passwordChangeError}</span>
                </div>
              )}

              <form onSubmit={handleForcePasswordChangeSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="label-text block">New Password*</label>
                  <input
                    type="password"
                    required
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0056D2] rounded-xl text-slate-900 text-xs outline-none transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="label-text block">Confirm New Password*</label>
                  <input
                    type="password"
                    required
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0056D2] rounded-xl text-slate-900 text-xs outline-none transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={passwordChangeLoading}
                  className="btn-primary-ig w-full justify-center"
                >
                  {passwordChangeLoading ? 'Updating credentials...' : 'Secure & Save Password'}
                </button>
              </form>
            </div>
          </div>
        )}

        <div className="hidden md:flex shrink-0">
          <Sidebar 
            user={user}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onLogout={handleLogout}
            collapsed={sidebarCollapsed}
            setCollapsed={setSidebarCollapsed}
            theme="light"
            setTheme={() => {}}
          />
        </div>

        <main className="flex-1 overflow-y-auto px-4 py-6 md:p-8 space-y-6 bg-[#F7F9FC]" id="main-content">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 gap-4">
            <div className="flex items-center gap-3">
              <span className="px-3.5 py-1.5 bg-sky-50 border border-sky-200 text-[#0056D2] rounded-xl text-xs font-mono font-bold flex items-center gap-1.5">
                <Shield size={14} className="text-[#0056D2]" /> Admin Workspace
              </span>
            </div>
            <button
              onClick={() => setActiveTab('dashboard')}
              className="btn-secondary-ig"
            >
              View Main Portal ↗
            </button>
          </div>

          <ErrorBoundary key={activeTab}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                {renderActiveView()}
              </motion.div>
            </AnimatePresence>
          </ErrorBoundary>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC] font-sans text-[#334155] flex flex-col relative selection:bg-[#0056D2] selection:text-white">
      <PublicHeader 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        cmsConfig={cmsConfig}
      />

      <main className="flex-1 max-w-[98rem] w-full mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-7" id="main-content">
        <ErrorBoundary key={activeTab}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              {renderActiveView()}
            </motion.div>
          </AnimatePresence>
        </ErrorBoundary>
      </main>

      <PublicFooter 
        setActiveTab={setActiveTab} 
        cmsConfig={cmsConfig}
      />

      {activeStreetViewAsset && (
        <StreetViewModal 
          asset={activeStreetViewAsset} 
          onClose={() => setActiveStreetViewAsset(null)} 
          initialTab="panorama"
        />
      )}
    </div>
  );
}

function AboutView({ cmsConfig }: { cmsConfig: CmsConfig }) {
  return (
    <div className="space-y-6 animate-fade-in" id="about-view-root">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="page-title">
          About {cmsConfig.institutionName}
        </h1>
        <p className="body-text text-sm mt-1">
          Empowering future leaders with technical excellence, research, and sustainability.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card space-y-3">
          <h3 className="card-title">Institutional Legacy</h3>
          <p className="body-text text-sm leading-relaxed">
            {cmsConfig.institutionName} is a renowned group of educational institutions situated in Tiruchirappalli, Tamil Nadu. 
            We provide comprehensive learning environments across Engineering, Nursing, Arts & Science, Agricultural Technology, and Management studies.
          </p>
          <p className="body-text text-sm leading-relaxed">
            Our campus features state-of-the-art academic blocks, advanced research laboratories, and institutional carbon accounting telemetry.
          </p>
        </div>

        <div className="glass-card space-y-3">
          <h3 className="card-title">IGRID LAB & Technology</h3>
          <p className="body-text text-sm leading-relaxed">
            Engineered in partnership with <strong>IGRID LAB</strong> and powered by <strong>{cmsConfig.poweredByText}</strong>, our digital portal provides real-time telemetry, spatial twin mapping, and Google Gemini AI insights.
          </p>
          <p className="body-text text-sm leading-relaxed">
            The platform audits historical energy, water, and solid waste data to guide our institutions towards carbon neutrality.
          </p>
        </div>
      </div>

      <div className="glass-card space-y-4">
        <h3 className="card-title text-[#0F172A]">Key Campus Capabilities</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-4 bg-[#F2F6FB] rounded-2xl border border-slate-200">
            <span className="text-xl block mb-1">🌍</span>
            <strong className="label-text block text-[#0F172A]">Spatial Twin</strong>
            <span className="secondary-text text-xs">Interactive GIS campus mapping layer.</span>
          </div>
          <div className="p-4 bg-[#F2F6FB] rounded-2xl border border-slate-200">
            <span className="text-xl block mb-1">🧮</span>
            <strong className="label-text block text-[#0F172A]">Carbon Telemetry</strong>
            <span className="secondary-text text-xs">Automated GHG Protocol calculations.</span>
          </div>
          <div className="p-4 bg-[#F2F6FB] rounded-2xl border border-slate-200">
            <span className="text-xl block mb-1">🧠</span>
            <strong className="label-text block text-[#0F172A]">Gemini AI Audit</strong>
            <span className="secondary-text text-xs">Contextualized eco-insights & auditing.</span>
          </div>
          <div className="p-4 bg-[#F2F6FB] rounded-2xl border border-slate-200">
            <span className="text-xl block mb-1">📸</span>
            <strong className="label-text block text-[#0F172A]">Virtual Tour</strong>
            <span className="secondary-text text-xs">WebGL 360° tour with landmark lookups.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactView({ cmsConfig }: { cmsConfig: CmsConfig }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !msg) return;
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setName('');
      setEmail('');
      setMsg('');
      alert(`Thank you for contacting ${cmsConfig.institutionName}! Your inquiry has been sent to campus administration.`);
    }, 1200);
  };

  return (
    <div className="space-y-6 animate-fade-in" id="contact-view-root">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="page-title">
          Contact Desk
        </h1>
        <p className="body-text text-sm mt-1">
          Get in touch with {cmsConfig.institutionName} administration & admissions office.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card space-y-4">
          <h3 className="card-title">Send us a Message</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="label-text block">Your Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-3.5 py-2.5 bg-[#F7F9FC] border border-slate-200 focus:border-[#0056D2] rounded-xl text-slate-900 text-xs outline-none transition-all font-sans"
              />
            </div>
            <div className="space-y-1">
              <label className="label-text block">Your Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                className="w-full px-3.5 py-2.5 bg-[#F7F9FC] border border-slate-200 focus:border-[#0056D2] rounded-xl text-slate-900 text-xs outline-none transition-all font-sans"
              />
            </div>
            <div className="space-y-1">
              <label className="label-text block">Inquiry Details</label>
              <textarea
                required
                rows={4}
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder="Describe your inquiry..."
                className="w-full px-3.5 py-2.5 bg-[#F7F9FC] border border-slate-200 focus:border-[#0056D2] rounded-xl text-slate-900 text-xs outline-none transition-all resize-none font-sans"
              />
            </div>
            <button
              type="submit"
              disabled={submitted}
              className="btn-primary-ig w-full justify-center py-3"
            >
              {submitted ? 'Sending Message...' : 'Submit Message'}
            </button>
          </form>
        </div>

        <div className="glass-card flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <h3 className="card-title">Institutional Campus Address</h3>
            <p className="body-text text-sm leading-relaxed">
              For administrative inquiries, campus visits, or institutional coordination:
            </p>
            
            <div className="space-y-3 pt-1">
              <div className="flex items-start gap-3">
                <span className="text-lg">📍</span>
                <div>
                  <strong className="card-title text-sm block">{cmsConfig.institutionName}</strong>
                  <span className="body-text text-xs leading-normal block">
                    {cmsConfig.address}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-lg">✉️</span>
                <div>
                  <strong className="label-text block text-[#0F172A]">Email Address</strong>
                  <span className="secondary-text text-xs block">{cmsConfig.email}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-lg">📞</span>
                <div>
                  <strong className="label-text block text-[#0F172A]">Phone Line</strong>
                  <span className="secondary-text text-xs block">{cmsConfig.phone} / {cmsConfig.phoneSecondary}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-[#F2F6FB] border border-slate-200 rounded-2xl text-xs text-[#334155] leading-relaxed font-sans font-medium flex items-center justify-between">
            <div>
              💡 Contact details editable dynamically through Admin Settings CMS.
            </div>
            <div className="powered-by-badge shrink-0 ml-2">
              <span>Powered by</span>
              <span className="font-extrabold text-[#0056D2]">{cmsConfig.poweredByText}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminDashboardView({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  return (
    <div className="space-y-6 animate-fade-in" id="admin-dashboard-view">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="page-title">
          Admin Workspace
        </h1>
        <p className="body-text text-sm mt-1">
          Central management hub for Indra Ganesan Institutions campus digital platform.
        </p>
      </div>

      <div className="bg-gradient-to-r from-[#0056D2] to-[#0284C7] rounded-2xl p-6 shadow-md text-white flex flex-col md:flex-row md:items-center justify-between gap-6 font-sans">
        <div className="space-y-1.5">
          <h2 className="font-display font-extrabold text-xl md:text-2xl tracking-tight">Welcome, Super Admin!</h2>
          <p className="text-sky-100 text-xs max-w-xl leading-relaxed">
            Manage campus twin assets, member accounts, issue reports, daily resource telemetry, and system configurations.
          </p>
        </div>
        <div className="shrink-0 px-4 py-2 bg-white/15 backdrop-blur-md rounded-xl border border-white/20 text-xs font-mono font-bold text-center">
          🔒 SESSION ACTIVE
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="glass-card flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="secondary-text text-[10px] font-bold uppercase tracking-wider font-mono">Digital Twin</span>
              <span className="text-xl">🏢</span>
            </div>
            <h3 className="card-title text-base">Asset Management</h3>
            <p className="body-text text-xs leading-relaxed">
              Add, edit, calibrate, or remove campus building assets, generators, and solar panels.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('admin-assets')}
            className="btn-secondary-ig mt-4 w-full justify-center"
          >
            Open Registry
          </button>
        </div>

        <div className="glass-card flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="secondary-text text-[10px] font-bold uppercase tracking-wider font-mono">Authentication</span>
              <span className="text-xl">👥</span>
            </div>
            <h3 className="card-title text-base">Member Management</h3>
            <p className="body-text text-xs leading-relaxed">
              Manage student & faculty registers, approve new access profiles, and process Excel imports.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('admin-users')}
            className="btn-secondary-ig mt-4 w-full justify-center"
          >
            Manage Users
          </button>
        </div>

        <div className="glass-card flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="secondary-text text-[10px] font-bold uppercase tracking-wider font-mono">Audits & logs</span>
              <span className="text-xl">📝</span>
            </div>
            <h3 className="card-title text-base">Daily Logger</h3>
            <p className="body-text text-xs leading-relaxed">
              Manually record periodic energy (kWh), water (L), and waste (kg) data entries.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('sustainability-logger')}
            className="btn-secondary-ig mt-4 w-full justify-center"
          >
            Open Daily Logger
          </button>
        </div>

        <div className="glass-card flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="secondary-text text-[10px] font-bold uppercase tracking-wider font-mono">Telemetry</span>
              <span className="text-xl">⚠️</span>
            </div>
            <h3 className="card-title text-base">Issue Reports</h3>
            <p className="body-text text-xs leading-relaxed">
              Review environmental faults and device breakdowns submitted by campus users.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('reports')}
            className="btn-secondary-ig mt-4 w-full justify-center"
          >
            Open Reports Desk
          </button>
        </div>

        <div className="glass-card flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="secondary-text text-[10px] font-bold uppercase tracking-wider font-mono">Security & CMS</span>
              <span className="text-xl">⚙️</span>
            </div>
            <h3 className="card-title text-base">System Settings (CMS)</h3>
            <p className="body-text text-xs leading-relaxed">
              Configure SMTP servers, edit contact details, branding logos, footer, and portal colors.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('admin-settings')}
            className="btn-secondary-ig mt-4 w-full justify-center"
          >
            Open CMS Settings
          </button>
        </div>
      </div>
    </div>
  );
}
