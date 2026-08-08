import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  AlertTriangle, 
  Plus, 
  MapPin, 
  Clock, 
  User as UserIcon,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Filter,
  Image as ImageIcon,
  Check,
  X
} from 'lucide-react';
import { CampusAsset, IssueReport, User, ReportStatus } from '../types';

interface IssueReporterProps {
  assets: CampusAsset[];
  reports: IssueReport[];
  user: User | null;
  onSubmitReport: (report: { title: string; description: string; location: string; photoUrl?: string; reporterName?: string; reporterRole?: string }) => Promise<void>;
  onUpdateStatus: (id: string, status: ReportStatus) => Promise<void>;
  onDeleteReport?: (id: string) => Promise<void>; // Add optional delete report prop
  quickReportLocation: string;
  setQuickReportLocation: (location: string) => void;
}

export default function IssueReporter({
  assets,
  reports,
  user,
  onSubmitReport,
  onUpdateStatus,
  onDeleteReport,
  quickReportLocation,
  setQuickReportLocation
}: IssueReporterProps) {
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('All');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // New report form states
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const activeAssetsList = React.useMemo(() => assets.filter(a => (a.status || 'Active') === 'Active'), [assets]);
  const [newLocation, setNewLocation] = useState(quickReportLocation || (activeAssetsList.length > 0 ? activeAssetsList[0].name : ''));
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pubReporterName, setPubReporterName] = useState('');
  const [pubReporterEmail, setPubReporterEmail] = useState('');

  // Auto-sync location if quickReportLocation is populated from Map
  React.useEffect(() => {
    if (quickReportLocation) {
      setNewLocation(quickReportLocation);
      setShowNewForm(true);
    }
  }, [quickReportLocation]);

  // Photo Presets for ease of testing in AI Studio
  const photoPresets = [
    { label: 'Water Leak', url: 'https://images.unsplash.com/photo-1585842378054-ee2e52f94ba2?w=600&auto=format&fit=crop&q=60' },
    { label: 'Electrical Fault', url: 'https://images.unsplash.com/photo-1527689368864-3a821dbccc34?w=600&auto=format&fit=crop&q=60' },
    { label: 'Waste Overflow', url: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=600&auto=format&fit=crop&q=60' },
    { label: 'Broken Lamp', url: 'https://images.unsplash.com/photo-1618220179428-22790b461013?w=600&auto=format&fit=crop&q=60' },
  ];

  // Set first preset by default
  React.useEffect(() => {
    if (!selectedPhotoUrl && photoPresets.length > 0) {
      setSelectedPhotoUrl(photoPresets[0].url);
    }
  }, []);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim() || !newLocation) {
      alert('Please fill out all required fields.');
      return;
    }
    if (!user && !pubReporterName.trim()) {
      alert('Please provide your name.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitReport({
        title: newTitle,
        description: newDescription,
        location: newLocation,
        photoUrl: selectedPhotoUrl || undefined,
        reporterName: !user ? pubReporterName.trim() : undefined,
        reporterRole: !user ? 'Visitor' : undefined
      });
      // Clear
      setNewTitle('');
      setNewDescription('');
      setPubReporterName('');
      setPubReporterEmail('');
      setQuickReportLocation('');
      setShowNewForm(false);
    } catch (err) {
      console.error(err);
      alert('Failed to report issue.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedReport = useMemo(() => {
    return reports.find(r => r.id === selectedReportId) || null;
  }, [reports, selectedReportId]);

  const filteredReports = useMemo(() => {
    if (selectedStatusFilter === 'All') return reports;
    return reports.filter(r => r.status === selectedStatusFilter);
  }, [reports, selectedStatusFilter]);

  const getStatusBadge = (status: ReportStatus) => {
    switch (status) {
      case 'Open': return 'bg-[#FF6B6B]/10 text-[#FF6B6B] border border-[#FF6B6B]/20';
      case 'In Progress': return 'bg-[#FBBF24]/10 text-[#FBBF24] border border-[#FBBF24]/20';
      case 'Resolved': return 'bg-[#00E676]/10 text-[#00E676] border border-[#00E676]/20';
      default: return 'bg-white/5 text-[#94A3B8] border border-white/10';
    }
  };

  const containerVariants: any = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className="space-y-6" 
      id="reports-root"
    >
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4" id="reports-header">
        <div>
          <h1 className="font-display font-bold text-2xl md:text-3xl text-slate-950 tracking-tight">Issue Reporting Desk</h1>
          <p className="text-slate-500 text-sm mt-1">
            Log maintenance faults, water leakages, and energy leaks directly onto the campus twin.
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02, boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)' }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setShowNewForm(!showNewForm);
            if (quickReportLocation) setQuickReportLocation('');
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-emerald-500/20 cursor-pointer self-start md:self-auto border-none"
        >
          <Plus size={16} />
          Report Campus Issue
        </motion.button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="reports-grid">
        {/* Left 2 Columns: Issues List & Filter */}
        <div className="lg:col-span-2 space-y-4" id="reports-main-panel">
          {/* Filters Bar */}
          <div className="glass-card rounded-3xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <span className="text-slate-800 text-xs font-bold flex items-center gap-2 shrink-0">
              <Filter size={14} className="text-emerald-500" />
              Status Filter
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {['All', 'Open', 'In Progress', 'Resolved'].map((stat) => (
                <button
                   key={stat}
                   onClick={() => setSelectedStatusFilter(stat)}
                   className={`px-3 py-1.5 rounded-lg text-[10px] font-mono tracking-wider uppercase font-bold transition-all cursor-pointer ${
                    selectedStatusFilter === stat 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs' 
                      : 'bg-slate-50 text-slate-500 border border-slate-200 hover:text-slate-800'
                  }`}
                >
                  {stat}
                </button>
              ))}
            </div>
          </div>

          {/* New Issue Form */}
          {showNewForm && (
            <div className="bg-white/80 backdrop-blur-xl border border-emerald-500/20 rounded-3xl p-6 space-y-4 shadow-md animate-fade-in" id="new-issue-form-container">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-display font-bold text-slate-950 text-sm flex items-center gap-1.5">
                  <AlertTriangle size={16} className="text-emerald-500" />
                  New Telemetry Fault Record
                </h3>
                <button 
                  onClick={() => {
                    setShowNewForm(false);
                    setQuickReportLocation('');
                  }} 
                  className="text-slate-450 hover:text-slate-700 text-xs font-mono cursor-pointer bg-transparent border-none"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                {/* Reporter Info for non-logged in public users */}
                {!user && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">Your Name*</label>
                      <input
                        type="text"
                        required
                        value={pubReporterName}
                        onChange={(e) => setPubReporterName(e.target.value)}
                        placeholder="e.g. Nagarjuna E"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-sans outline-none focus:border-blue-500 hover:border-slate-350 transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">Your Email (Optional)</label>
                      <input
                        type="email"
                        value={pubReporterEmail}
                        onChange={(e) => setPubReporterEmail(e.target.value)}
                        placeholder="e.g. email@domain.com"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-sans outline-none focus:border-blue-500 hover:border-slate-350 transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* Title */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">Issue Title*</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Broken overhead lamp, Water valve dripping"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-sans outline-none focus:border-blue-500 hover:border-slate-350 transition-all"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">Detailed Description*</label>
                  <textarea
                    required
                    rows={3}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Provide context, urgency, and exact coordinates/location particulars if relevant..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-sans outline-none focus:border-blue-500 hover:border-slate-350 transition-all resize-none"
                  />
                </div>

                {/* Location Picker */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">Select Asset Location*</label>
                  <select
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs font-sans outline-none hover:border-slate-350 focus:border-blue-500 transition-all cursor-pointer"
                  >
                    {assets.filter(a => (a.status || 'Active') === 'Active').map(a => (
                      <option key={a.id} value={a.name}>{a.name} ({a.institution})</option>
                    ))}
                  </select>
                </div>

                {/* Photo Preset Selector */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">
                    Telemetry Attachment (Visual Proof Preset)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {photoPresets.map((preset) => {
                      const isSelected = selectedPhotoUrl === preset.url;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setSelectedPhotoUrl(preset.url)}
                          className={`p-2 rounded-xl bg-slate-50 border text-left flex flex-col justify-between h-20 transition-all cursor-pointer ${
                            isSelected 
                              ? 'border-emerald-500 ring-1 ring-emerald-500/25 bg-emerald-50/10 text-emerald-700' 
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <span className="text-[9px] font-mono text-slate-500">{preset.label}</span>
                          <div className="flex items-center justify-between w-full mt-auto">
                            <ImageIcon size={12} className={isSelected ? 'text-emerald-600' : 'text-slate-400'} />
                            {isSelected && <Check size={10} className="text-emerald-600" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Submit button */}
                <motion.button
                  whileHover={{ scale: 1.01, boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)' }}
                  whileTap={{ scale: 0.99 }}
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-sans font-bold text-xs shadow-md shadow-emerald-500/10 cursor-pointer disabled:opacity-50 transition-all border-none"
                >
                  {isSubmitting ? 'Submitting issue to twin...' : 'Submit Issue'}
                </motion.button>
              </form>
            </div>
          )}

          {/* List of Reported Issues */}
          <div className="space-y-3" id="reports-list">
            {filteredReports.length === 0 ? (
              <div className="glass-card rounded-3xl p-8 text-center text-slate-500 text-xs shadow-sm">
                No reported issues found under this filter. All quiet on the campus front!
              </div>
            ) : (
              filteredReports.map((rep) => {
                const isSelected = selectedReportId === rep.id;
                return (
                  <motion.button
                    whileHover={{ x: 4, backgroundColor: 'rgba(255, 255, 255, 0.9)' }}
                    key={rep.id}
                    onClick={() => {
                      setSelectedReportId(isSelected ? null : rep.id);
                      setShowDeleteConfirm(false);
                    }}
                    className={`w-full text-left p-4 bg-white/75 backdrop-blur-lg border rounded-3xl flex items-start gap-4 transition-all cursor-pointer shadow-xs ${
                      isSelected ? 'border-emerald-500 ring-1 ring-emerald-500/20 bg-white/90' : 'border-white/45'
                    }`}
                  >
                    {/* Status Icon */}
                    <div className="mt-0.5 shrink-0">
                      {rep.status === 'Open' ? (
                        <div className="h-8 w-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
                          <AlertCircle size={16} />
                        </div>
                      ) : rep.status === 'In Progress' ? (
                        <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 animate-pulse">
                          <Clock size={16} />
                        </div>
                      ) : (
                        <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                          <CheckCircle size={16} />
                        </div>
                      )}
                    </div>

                    {/* Meta info */}
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-semibold text-slate-850 text-sm truncate">{rep.title}</span>
                        <ChevronRight size={14} className={`text-slate-400 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2 text-[10px] text-slate-500 font-mono">
                        <span className="flex items-center gap-1 text-slate-600">
                          <MapPin size={12} className="text-slate-400" />
                          {rep.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <UserIcon size={12} className="text-slate-400" />
                          {rep.reporterName} ({rep.reporterRole})
                        </span>
                        <span>• {new Date(rep.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </motion.button>
                );
              })
            )}
          </div>
        </div>

        {/* Right 1 Column: Issue Inspect Detail / Status Updates */}
        <div 
          className={`${
            selectedReport 
              ? 'fixed inset-0 z-50 p-4 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center lg:static lg:bg-transparent lg:p-0 lg:backdrop-blur-none lg:block lg:col-span-1 animate-fade-in' 
              : 'hidden lg:block lg:col-span-1'
          }`}
          id="reports-detail-panel"
        >
          {selectedReport ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-5 w-full max-w-lg lg:max-w-none max-h-[90vh] lg:max-h-none overflow-y-auto lg:overflow-visible flex flex-col justify-between shadow-2xl lg:shadow-sm" id="report-inspector">
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3.5 flex items-center justify-between gap-2">
                  <div>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider ${getStatusBadge(selectedReport.status)}`}>
                      {selectedReport.status}
                    </span>
                    <h3 className="font-display font-semibold text-slate-900 text-base mt-2.5">{selectedReport.title}</h3>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedReportId(null);
                      setShowDeleteConfirm(false);
                    }}
                    className="p-1.5 text-slate-450 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all border-none cursor-pointer shrink-0"
                    title="Close Details"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Photo Attachment if available */}
                {selectedReport.photoUrl && (
                  <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                    <img 
                      src={selectedReport.photoUrl} 
                      alt={selectedReport.title} 
                      className="w-full h-36 object-cover hover:scale-105 transition-transform duration-300" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-mono tracking-wider text-slate-500 block">Description</span>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-150">
                    {selectedReport.description}
                  </p>
                </div>

                <div className="space-y-2 text-[10px] font-mono text-slate-500 border-t border-slate-100 pt-3">
                  <div className="flex justify-between">
                    <span>Location:</span>
                    <span className="text-slate-700">{selectedReport.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Logged By:</span>
                    <span className="text-slate-700">{selectedReport.reporterName} ({selectedReport.reporterRole})</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Logged At:</span>
                    <span className="text-slate-700">{new Date(selectedReport.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Status Update & Deletion Actions - Super Admin Only */}
              {user && user.role === 'Admin' && (
                <div className="border-t border-slate-100 pt-4 mt-6 space-y-4">
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 block mb-2.5">
                      Authorize Status Change
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => onUpdateStatus(selectedReport.id, 'In Progress')}
                        className={`py-1.5 rounded-xl font-sans text-[11px] font-semibold tracking-wide transition-all border cursor-pointer ${
                          selectedReport.status === 'In Progress'
                            ? 'bg-amber-50 text-amber-700 border-amber-300'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-800'
                        }`}
                      >
                        In Progress
                      </button>
                      <button
                        onClick={() => onUpdateStatus(selectedReport.id, 'Resolved')}
                        className={`py-1.5 rounded-xl font-sans text-[11px] font-semibold tracking-wide transition-all border cursor-pointer ${
                          selectedReport.status === 'Resolved'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-800'
                        }`}
                      >
                        Resolved
                      </button>
                    </div>
                  </div>

                  {onDeleteReport && (
                    <div className="space-y-2 mt-1">
                      {!showDeleteConfirm ? (
                        <button
                          onClick={() => setShowDeleteConfirm(true)}
                          className="w-full py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-xl font-semibold text-xs transition-all cursor-pointer"
                        >
                          Delete Fault Record
                        </button>
                      ) : (
                        <div className="flex gap-2 animate-fade-in">
                          <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(false)}
                            className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition-all cursor-pointer border-none"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await onDeleteReport(selectedReport.id);
                              setSelectedReportId(null);
                              setShowDeleteConfirm(false);
                            }}
                            className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold text-xs transition-all cursor-pointer border-none shadow-md shadow-rose-600/10"
                          >
                            Confirm Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card border-dashed rounded-3xl p-5 h-full flex flex-col items-center justify-center text-center text-slate-400 py-16 shadow-sm" id="inspect-fallback">
              <AlertTriangle size={32} className="text-slate-300 mb-2.5" />
              <h4 className="text-xs font-semibold text-slate-500 font-display">Inspect Issue Telemetry</h4>
              <p className="text-[11px] text-slate-450 max-w-xs mt-1 leading-normal">
                Select any logged issue card from the central register to view photo attachments and trigger operational status modifications.
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
