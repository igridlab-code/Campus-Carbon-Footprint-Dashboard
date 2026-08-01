import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, 
  Lock, 
  Mail, 
  Phone, 
  Shield, 
  CheckCircle, 
  XCircle, 
  Key,
  LogOut,
  Settings,
  History,
  ShieldAlert,
  RefreshCw,
  Camera,
  Layers,
  Sparkles,
  Fingerprint,
  Globe,
  Monitor,
  Activity,
  AlertTriangle,
  UploadCloud,
  Trash2,
  Image as ImageIcon,
  Palette,
  FileText
} from 'lucide-react';
import { motion } from 'motion/react';
import { User } from '../types';
import { CmsConfig, saveCmsConfig, resetCmsConfig, DEFAULT_CMS_CONFIG } from '../utils/cmsStore';

interface AdminSettingsProps {
  token: string | null;
  user: User | null;
  onUserUpdate: (updatedUser: User) => void;
  onLogout: () => void;
  cmsConfig?: CmsConfig;
  onCmsUpdate?: (newConfig: CmsConfig) => void;
}

type TabType = 'profile' | 'cms-settings' | 'security' | 'change-password' | 'login-activity';

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
];

export default function AdminSettings({ 
  token, 
  user, 
  onUserUpdate, 
  onLogout,
  cmsConfig,
  onCmsUpdate
}: AdminSettingsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('profile');

  // Profile fields
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [photoUrl, setPhotoUrl] = useState(user?.photoUrl || '');

  // Photo Upload States
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState('');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Security and history state loaded from server
  const [securityData, setSecurityData] = useState<any>(null);
  const [loadingSecurity, setLoadingSecurity] = useState(false);

  // Notifications
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [securityActionMsg, setSecurityActionMsg] = useState('');

  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Live CMS Form States
  const [cmsForm, setCmsForm] = useState<CmsConfig>(() => cmsConfig || DEFAULT_CMS_CONFIG);

  const [cmsSuccessMsg, setCmsSuccessMsg] = useState('');

  useEffect(() => {
    if (cmsConfig) setCmsForm(cmsConfig);
  }, [cmsConfig]);

  const handleCmsFormSave = (e: React.FormEvent) => {
    e.preventDefault();
    setCmsSuccessMsg('');
    const updated = saveCmsConfig(cmsForm);
    if (onCmsUpdate) onCmsUpdate(updated);
    setCmsSuccessMsg('Branding & Portal CMS Configuration saved successfully! Live changes applied immediately.');
    setTimeout(() => setCmsSuccessMsg(''), 4000);
  };

  const handleCmsReset = () => {
    if (window.confirm('Reset CMS configuration to default Indra Ganesan Institutions values?')) {
      const reset = resetCmsConfig();
      setCmsForm(reset);
      if (onCmsUpdate) onCmsUpdate(reset);
      setCmsSuccessMsg('CMS Configuration reset to defaults.');
      setTimeout(() => setCmsSuccessMsg(''), 3000);
    }
  };

  // Fetch security info from backend
  const fetchSecurityData = async () => {
    setLoadingSecurity(true);
    try {
      const res = await fetch('/api/auth/security-info', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSecurityData(data);
      }
    } catch (err) {
      console.error('Error loading security data:', err);
    } finally {
      setLoadingSecurity(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, [token]);

  // Handle profile submit
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    
    if (!profileName.trim() || !profileEmail.trim()) {
      setProfileError('Name and Email are required.');
      return;
    }

    setProfileLoading(true);
    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: profileName,
          email: profileEmail,
          phone: profilePhone,
          photoUrl: photoUrl
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update profile.');
      }

      setProfileSuccess('Profile updated successfully!');
      onUserUpdate(data.user);
    } catch (err: any) {
      setProfileError(err.message || 'An error occurred.');
    } finally {
      setProfileLoading(false);
    }
  };

  // Handle password change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirm password do not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to change password.');
      }

      setPasswordSuccess('Password successfully updated!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        onLogout();
      }, 2500);
    } catch (err: any) {
      setPasswordError(err.message || 'An error occurred.');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in font-sans">
      
      {/* Header Panel */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-[#0056D2] to-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm text-white">
        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-white text-[10px] font-bold uppercase tracking-wider">
              <Shield size={12} />
              SYSTEM CONTROL PANEL & CMS
            </div>
            <h1 className="page-title text-white">
              Super Admin Settings & CMS
            </h1>
            <p className="text-sky-100 text-xs max-w-2xl">
              Manage live branding logos, contact details, hero banners, theme colors, and administrator account profile.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap bg-white border border-slate-200 rounded-2xl p-1 gap-1 shadow-xs">
        {[
          { id: 'profile', label: 'Admin Profile', icon: UserIcon },
          { id: 'cms-settings', label: 'Website CMS & Branding', icon: Globe },
          { id: 'security', label: 'Account Security', icon: Shield },
          { id: 'change-password', label: 'Change Password', icon: Lock },
          { id: 'login-activity', label: 'Login History', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as TabType);
                setProfileError('');
                setProfileSuccess('');
                setPasswordError('');
                setPasswordSuccess('');
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer border-none ${
                isActive 
                  ? 'bg-[#0056D2] text-white shadow-sm' 
                  : 'text-[#334155] hover:text-[#0F172A] hover:bg-slate-100'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-xs">
        
        {/* TAB 1: Profile */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="card-title text-[#0F172A]">Super Admin Contact Profile</h2>
              <p className="secondary-text text-xs mt-0.5">Edit credentials, official contact email, and profile avatar.</p>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-6 max-w-2xl">
              {profileError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl text-xs flex items-center gap-2 font-medium">
                  <XCircle size={14} className="shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}
              {profileSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs flex items-center gap-2 font-medium">
                  <CheckCircle size={14} className="shrink-0" />
                  <span>{profileSuccess}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="label-text block">Full Name</label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0056D2] rounded-xl text-slate-900 text-xs outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="label-text block">Official Email Address</label>
                <input
                  type="email"
                  required
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0056D2] rounded-xl text-slate-900 text-xs outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="label-text block">Phone Line</label>
                <input
                  type="text"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0056D2] rounded-xl text-slate-900 text-xs outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={profileLoading}
                className="btn-primary-ig cursor-pointer"
              >
                {profileLoading ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: Live CMS & Branding Configurator */}
        {activeTab === 'cms-settings' && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="card-title text-[#0F172A]">Website Branding & Content CMS</h2>
                <p className="secondary-text text-xs mt-0.5">Manage logos, institution name, contact details, hero banners, and footer without code changes.</p>
              </div>
              <button
                onClick={handleCmsReset}
                type="button"
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl cursor-pointer transition-all"
              >
                Reset to Defaults
              </button>
            </div>

            {cmsSuccessMsg && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs flex items-center gap-2 font-semibold">
                <CheckCircle size={16} className="shrink-0 text-emerald-600" />
                <span>{cmsSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleCmsFormSave} className="space-y-6">
              
              {/* Section: Institution Identity */}
              <div className="p-5 bg-[#F2F6FB] rounded-2xl border border-slate-200 space-y-4">
                <h3 className="card-title text-sm text-[#0F172A] flex items-center gap-2">
                  <Globe size={16} className="text-[#0056D2]" /> Institution Identity & Branding Logos
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="label-text block">Institution Name</label>
                    <input
                      type="text"
                      value={cmsForm.institutionName}
                      onChange={(e) => setCmsForm({ ...cmsForm, institutionName: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-[#0056D2] rounded-xl text-slate-900 text-xs outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="label-text block">Powered By Tagline</label>
                    <input
                      type="text"
                      value={cmsForm.poweredByText}
                      onChange={(e) => setCmsForm({ ...cmsForm, poweredByText: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-[#0056D2] rounded-xl text-slate-900 text-xs outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="label-text block">IGRID LAB Logo URL (Transparent PNG)</label>
                    <input
                      type="text"
                      placeholder="https://... or leave blank for uploaded asset"
                      value={cmsForm.logoIgridUrl}
                      onChange={(e) => setCmsForm({ ...cmsForm, logoIgridUrl: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-[#0056D2] rounded-xl text-slate-900 text-xs outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="label-text block">Indra Ganesan Logo URL (Transparent PNG)</label>
                    <input
                      type="text"
                      placeholder="https://... or leave blank for uploaded asset"
                      value={cmsForm.logoInstitutionUrl}
                      onChange={(e) => setCmsForm({ ...cmsForm, logoInstitutionUrl: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-[#0056D2] rounded-xl text-slate-900 text-xs outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Section: Contact Details */}
              <div className="p-5 bg-[#F2F6FB] rounded-2xl border border-slate-200 space-y-4">
                <h3 className="card-title text-sm text-[#0F172A] flex items-center gap-2">
                  <Mail size={16} className="text-[#0056D2]" /> Contact Details & Social Links
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1 md:col-span-2">
                    <label className="label-text block">Campus Address</label>
                    <input
                      type="text"
                      value={cmsForm.address}
                      onChange={(e) => setCmsForm({ ...cmsForm, address: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-[#0056D2] rounded-xl text-slate-900 text-xs outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="label-text block">Official Contact Email</label>
                    <input
                      type="email"
                      value={cmsForm.email}
                      onChange={(e) => setCmsForm({ ...cmsForm, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-[#0056D2] rounded-xl text-slate-900 text-xs outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="label-text block">Primary Phone Line</label>
                    <input
                      type="text"
                      value={cmsForm.phone}
                      onChange={(e) => setCmsForm({ ...cmsForm, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-[#0056D2] rounded-xl text-slate-900 text-xs outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="label-text block">Alternate Phone / Hotline</label>
                    <input
                      type="text"
                      value={cmsForm.phoneSecondary}
                      onChange={(e) => setCmsForm({ ...cmsForm, phoneSecondary: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-[#0056D2] rounded-xl text-slate-900 text-xs outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="label-text block">Official Website URL</label>
                    <input
                      type="text"
                      value={cmsForm.websiteUrl}
                      onChange={(e) => setCmsForm({ ...cmsForm, websiteUrl: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-[#0056D2] rounded-xl text-slate-900 text-xs outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="label-text block">Google Maps Location URL</label>
                    <input
                      type="text"
                      value={cmsForm.googleMapUrl}
                      onChange={(e) => setCmsForm({ ...cmsForm, googleMapUrl: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-[#0056D2] rounded-xl text-slate-900 text-xs outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="label-text block">Facebook Page Link</label>
                    <input
                      type="text"
                      value={cmsForm.facebookUrl}
                      onChange={(e) => setCmsForm({ ...cmsForm, facebookUrl: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-[#0056D2] rounded-xl text-slate-900 text-xs outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="label-text block">Instagram Profile Link</label>
                    <input
                      type="text"
                      value={cmsForm.instagramUrl}
                      onChange={(e) => setCmsForm({ ...cmsForm, instagramUrl: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-[#0056D2] rounded-xl text-slate-900 text-xs outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="label-text block">LinkedIn Page Link</label>
                    <input
                      type="text"
                      value={cmsForm.linkedinUrl}
                      onChange={(e) => setCmsForm({ ...cmsForm, linkedinUrl: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-[#0056D2] rounded-xl text-slate-900 text-xs outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="label-text block">YouTube Channel Link</label>
                    <input
                      type="text"
                      value={cmsForm.youtubeUrl}
                      onChange={(e) => setCmsForm({ ...cmsForm, youtubeUrl: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-[#0056D2] rounded-xl text-slate-900 text-xs outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="label-text block">Footer Description Paragraph</label>
                    <textarea
                      rows={2}
                      value={cmsForm.footerDescription}
                      onChange={(e) => setCmsForm({ ...cmsForm, footerDescription: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-[#0056D2] rounded-xl text-slate-900 text-xs outline-none transition-all resize-none"
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="label-text block">Footer Copyright Line</label>
                    <input
                      type="text"
                      value={cmsForm.copyrightText}
                      onChange={(e) => setCmsForm({ ...cmsForm, copyrightText: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-[#0056D2] rounded-xl text-slate-900 text-xs outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Section: Homepage Hero Text */}
              <div className="p-5 bg-[#F2F6FB] rounded-2xl border border-slate-200 space-y-4">
                <h3 className="card-title text-sm text-[#0F172A] flex items-center gap-2">
                  <FileText size={16} className="text-[#0056D2]" /> Homepage Hero Text & Banners
                </h3>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="label-text block">Hero Command Center Title</label>
                    <input
                      type="text"
                      value={cmsForm.heroTitle}
                      onChange={(e) => setCmsForm({ ...cmsForm, heroTitle: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-[#0056D2] rounded-xl text-slate-900 text-xs outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="label-text block">Hero Subtitle</label>
                    <textarea
                      rows={2}
                      value={cmsForm.heroSubtitle}
                      onChange={(e) => setCmsForm({ ...cmsForm, heroSubtitle: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-[#0056D2] rounded-xl text-slate-900 text-xs outline-none transition-all resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="btn-primary-ig cursor-pointer py-3 px-8 text-sm"
                >
                  Save & Apply Live CMS Configuration
                </button>
              </div>

            </form>
          </div>
        )}

        {/* TAB 3: Security */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="card-title text-[#0F172A]">System Security & Active Sessions</h2>
              <p className="secondary-text text-xs mt-0.5">Manage token sessions and device telemetry.</p>
            </div>

            <div className="p-4 bg-sky-50 border border-sky-200 text-sky-800 rounded-2xl text-xs font-medium space-y-1">
              <strong>🔒 Protected Session:</strong> Your active session is protected with JWT signature validation and 15-minute inactivity auto-lock.
            </div>
          </div>
        )}

        {/* TAB 4: Change Password */}
        {activeTab === 'change-password' && (
          <div className="space-y-6 max-w-xl">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="card-title text-[#0F172A]">Change Administrator Password</h2>
              <p className="secondary-text text-xs mt-0.5">Update credentials securely.</p>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              {passwordError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl text-xs">
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs">
                  {passwordSuccess}
                </div>
              )}

              <div className="space-y-1">
                <label className="label-text block">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0056D2] rounded-xl text-slate-900 text-xs outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="label-text block">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0056D2] rounded-xl text-slate-900 text-xs outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="label-text block">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0056D2] rounded-xl text-slate-900 text-xs outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={passwordLoading}
                className="btn-primary-ig cursor-pointer"
              >
                {passwordLoading ? 'Updating Password...' : 'Update Security Credentials'}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
