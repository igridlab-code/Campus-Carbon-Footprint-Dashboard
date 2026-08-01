import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, 
  Plus, 
  Trash2, 
  Edit2, 
  Mail, 
  ShieldCheck, 
  UserCheck, 
  Search, 
  X,
  AlertCircle,
  Phone,
  Building,
  Briefcase,
  Users,
  CheckCircle,
  XCircle,
  Calendar,
  Lock,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Shield,
  FileSpreadsheet,
  Clock,
  Leaf
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, UserRole } from '../types';

interface UserManagementProps {
  token: string | null;
}

interface ManagedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone: string;
  institution: string;
  department: string;
  status: 'Active' | 'Inactive' | 'Pending' | 'Disabled';
  createdAt: string;
  isFirstLogin: boolean;
  deleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

interface AuditLog {
  id: string;
  actorEmail: string;
  actorName: string;
  action: string;
  timestamp: string;
}

export default function UserManagement({ token }: UserManagementProps) {
  // Navigation Tabs: 'directory' | 'verification' | 'audit'
  const [currentSubTab, setCurrentSubTab] = useState<'directory' | 'verification' | 'audit'>('directory');

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Campus Identity Verification states
  const [importedStudents, setImportedStudents] = useState<any[]>([]);
  const [importedFaculty, setImportedFaculty] = useState<any[]>([]);
  const [importedLoading, setImportedLoading] = useState(false);
  const [verificationSubTab, setVerificationSubTab] = useState<'students' | 'faculty'>('students');
  const [verificationSearchQuery, setVerificationSearchQuery] = useState('');
  const [verifPage, setVerifPage] = useState(1);
  
  // Custom Toasts State
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' }[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };
  
  // Directory Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [institutionFilter, setInstitutionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // Audit Search
  const [auditSearchQuery, setAuditSearchQuery] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  
  // Form input states
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formInstitution, setFormInstitution] = useState('Engineering');
  const [formDepartment, setFormDepartment] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('Student');
  const [formStatus, setFormStatus] = useState<'Active' | 'Inactive' | 'Pending' | 'Disabled'>('Active');
  const [formPassword, setFormPassword] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Safe Modal States to prevent iframe blocks
  const [userToDelete, setUserToDelete] = useState<ManagedUser | null>(null);
  const [customAlertMsg, setCustomAlertMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, [token]);

  useEffect(() => {
    if (currentSubTab === 'audit') {
      fetchAuditLogs();
    } else if (currentSubTab === 'verification') {
      fetchImportedMembers();
    }
  }, [currentSubTab, token]);

  const fetchImportedMembers = async () => {
    if (!token) return;
    setImportedLoading(true);
    try {
      const res = await fetch('/api/admin/imported-members', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setImportedStudents(data.students || []);
        setImportedFaculty(data.faculty || []);
      }
    } catch (err) {
      console.error('Error fetching verification database:', err);
    } finally {
      setImportedLoading(false);
    }
  };

  const handleImportSpreadsheet = async (e: React.ChangeEvent<HTMLInputElement>, type: 'students' | 'faculty') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    addToast(`Uploading & processing ${type} spreadsheet...`, 'info');

    try {
      const res = await fetch(`/api/admin/import-${type}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Import process failed.');
      }

      addToast(data.message, 'success');
      await fetchImportedMembers();
    } catch (err: any) {
      addToast(err.message || 'Spreadsheet import failed.', 'error');
    } finally {
      e.target.value = '';
    }
  };

  const handleDeleteImportedRecord = async (id: string, type: 'students' | 'faculty') => {
    try {
      const endpoint = type === 'students' ? `/api/admin/imported-students/${id}` : `/api/admin/imported-faculty/${id}`;
      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Record removal rejected.');
      }

      addToast('Identity record purged successfully.', 'success');
      await fetchImportedMembers();
    } catch (err: any) {
      addToast(err.message || 'Record deletion failed.', 'error');
    }
  };

  const handleClearImportedDatabase = async (type: 'students' | 'faculty') => {
    if (!window.confirm(`Are you sure you want to delete all imported ${type} records? This is irreversible.`)) {
      return;
    }
    try {
      const endpoint = type === 'students' ? '/api/admin/clear-imported-students' : '/api/admin/clear-imported-faculty';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Bulk clear operation failed.');
      }

      addToast(`Successfully cleared all imported ${type} verification profiles.`, 'success');
      await fetchImportedMembers();
    } catch (err: any) {
      addToast(err.message || 'Clear operation failed.', 'error');
    }
  };

  const downloadTemplate = async (type: 'students' | 'faculty') => {
    try {
      const typeParam = type === 'students' ? 'student' : 'faculty';
      const res = await fetch(`/api/admin/download-template/${typeParam}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to download template');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `indraverse_${type}_template.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      addToast(`${type === 'students' ? 'Student' : 'Faculty'} official template downloaded from server!`, 'success');
    } catch (err: any) {
      addToast(err.message || 'Error downloading template.', 'error');
    }
  };

  const exportMembers = async () => {
    try {
      const res = await fetch('/api/admin/export-members', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to export members');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `indraverse_registered_members_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      addToast('Official registered campus members database exported!', 'success');
    } catch (err: any) {
      addToast(err.message || 'Error exporting members database.', 'error');
    }
  };

  const fetchUsers = async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error('Failed to retrieve user accounts database.');
      }
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error loading user registers.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    if (!token) return;
    setAuditLoading(true);
    try {
      const res = await fetch('/api/audit-logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setAuditLogs(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAuditLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormInstitution('Engineering');
    setFormDepartment('');
    setFormRole('Student');
    setFormStatus('Active');
    setFormPassword('');
    setShowFormModal(true);
  };

  const handleOpenEdit = (user: ManagedUser) => {
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormPhone(user.phone || '');
    setFormInstitution(user.institution || 'Engineering');
    setFormDepartment(user.department || '');
    setFormRole(user.role);
    setFormStatus(user.status || 'Active');
    setFormPassword(''); // leave blank if no change
    setShowFormModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) {
      setCustomAlertMsg('Name and Email are required.');
      return;
    }
    if (!editingUser && !formPassword) {
      setCustomAlertMsg('Password is required for new accounts.');
      return;
    }

    setSubmitLoading(true);
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PATCH' : 'POST';
      const payload: any = {
        name: formName.trim(),
        email: formEmail.trim().toLowerCase(),
        role: formRole,
        phone: formPhone.trim(),
        institution: formInstitution,
        department: formDepartment.trim(),
        status: formStatus
      };
      if (formPassword) {
        payload.password = formPassword;
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Operation failed.');
      }

      await fetchUsers();
      setShowFormModal(false);
      addToast(editingUser ? 'Member record updated successfully.' : 'New member record spawned successfully.', 'success');
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Failed to save user account.', 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteUser = (user: ManagedUser) => {
    if (user.role === 'Admin') {
      addToast('The single Super Admin account cannot be deleted.', 'error');
      return;
    }
    setUserToDelete(user);
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    const targetId = userToDelete.id;
    const targetName = userToDelete.name;
    const targetEmail = userToDelete.email;
    
    console.log(`[CLIENT DELETE MEMBER] Initiating deletion for: ${targetName} (${targetEmail})`);
    setIsDeletingUser(true);

    try {
      const res = await fetch(`/api/users/${targetId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Delete operation rejected.');
      }

      console.log(`[CLIENT DELETE MEMBER] Deletion success. Fetching updated user list...`);
      addToast(`Member "${targetName}" has been successfully deleted.`, 'success');

      // Immediately fetch fresh list from DB to update UI without reload
      await fetchUsers();

      // Refresh audit logs if we are in audit tab
      if (currentSubTab === 'audit') {
        fetchAuditLogs();
      }
      
      setUserToDelete(null);
    } catch (err: any) {
      console.error(`[CLIENT DELETE MEMBER] Error occurred:`, err);
      addToast(err.message || 'Failed to delete member.', 'error');
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleRestoreUser = async (user: ManagedUser) => {
    if (!token) return;
    console.log(`[CLIENT RESTORE MEMBER] Initiating restore for: ${user.name}`);
    try {
      const res = await fetch(`/api/users/${user.id}/restore`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Restore operation rejected.');
      }

      console.log(`[CLIENT RESTORE MEMBER] Restore success. Fetching updated user list...`);
      addToast(`Member "${user.name}" has been successfully restored!`, 'success');
      await fetchUsers();
      if (currentSubTab === 'audit') {
        fetchAuditLogs();
      }
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Failed to restore member.', 'error');
    }
  };

  const handleUpdateMemberStatus = async (id: string, newStatus: 'Active' | 'Inactive' | 'Pending' | 'Disabled') => {
    const originalUsers = [...users];

    // Optimistic status update
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: newStatus } : u));

    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Status modification rejected.');
      }

      addToast(`Status updated to ${newStatus} successfully.`, 'success');
      await fetchUsers();
      if (currentSubTab === 'audit') {
        fetchAuditLogs();
      }
    } catch (err: any) {
      console.error(err);
      setUsers(originalUsers);
      addToast(err.message || 'Failed to update user status.', 'error');
    }
  };

  const handleToggleUserStatus = async (id: string, currentStatus: 'Active' | 'Inactive' | 'Pending' | 'Disabled') => {
    const nextStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    await handleUpdateMemberStatus(id, nextStatus);
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'Admin': return <Shield size={14} className="text-rose-600" />;
      case 'Management': return <Briefcase size={14} className="text-blue-600" />;
      case 'Faculty': return <UserCheck size={14} className="text-indigo-600" />;
      case 'Staff': return <UserIcon size={14} className="text-amber-600" />;
      case 'Sustainability Coordinator': return <Leaf size={14} className="text-teal-600" />;
      default: return <UserIcon size={14} className="text-emerald-600" />;
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'Admin': return 'bg-rose-50 text-rose-700 border border-rose-200';
      case 'Management': return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'Faculty': return 'bg-indigo-50 text-indigo-700 border border-indigo-200';
      case 'Staff': return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'Sustainability Coordinator': return 'bg-teal-50 text-teal-700 border border-teal-200';
      default: return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    }
  };

  // Member directory calculations for analytics (excluding soft-deleted users!)
  const activeUsersOnly = users.filter(u => !u.deleted);
  const totalMembers = activeUsersOnly.length;
  const studentCount = activeUsersOnly.filter(u => u.role === 'Student').length;
  const facultyCount = activeUsersOnly.filter(u => u.role === 'Faculty').length;
  const managementCount = activeUsersOnly.filter(u => u.role === 'Management').length;
  const activeCount = activeUsersOnly.filter(u => u.status === 'Active' || !u.status).length;
  const inactiveCount = activeUsersOnly.filter(u => u.status === 'Inactive').length;

  // Filter Directory
  const filteredUsers = users.filter(u => {
    const isArchived = u.deleted === true;
    if (showArchived !== isArchived) {
      return false;
    }

    const matchesSearch = 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.phone && u.phone.includes(searchQuery)) ||
      (u.department && u.department.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.institution && u.institution.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole = roleFilter === '' || u.role === roleFilter;
    const matchesInst = institutionFilter === '' || u.institution === institutionFilter;
    const matchesStatus = statusFilter === '' || u.status === statusFilter;

    return matchesSearch && matchesRole && matchesInst && matchesStatus;
  });

  // Filter Audits
  const filteredAudits = auditLogs.filter(log => 
    log.actorName.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
    log.actorEmail.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
    log.action.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
    log.timestamp.includes(auditSearchQuery)
  );

  // Pagination implementation
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentDirectoryItems = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const paginateNext = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };
  const paginatePrev = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  return (
    <div className="space-y-6 animate-fade-in relative" id="member-management-root">
      
      {/* Toast Notification HUD */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
              className={`p-4 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-semibold border pointer-events-auto ${
                toast.type === 'error'
                  ? 'bg-rose-50 border-rose-100 text-rose-800'
                  : toast.type === 'info'
                  ? 'bg-blue-50 border-blue-100 text-blue-800'
                  : 'bg-emerald-50 border-emerald-100 text-emerald-800'
              }`}
            >
              <div className="shrink-0">
                {toast.type === 'error' ? (
                  <XCircle size={18} className="text-rose-600 animate-pulse" />
                ) : toast.type === 'info' ? (
                  <AlertCircle size={18} className="text-blue-600" />
                ) : (
                  <CheckCircle size={18} className="text-emerald-600" />
                )}
              </div>
              <p className="flex-1 leading-normal">{toast.message}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      {/* Upper Title Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5" id="member-header">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 px-2.5 bg-blue-50 text-blue-800 text-xs font-semibold rounded-full border border-blue-100 uppercase tracking-widest font-mono">
              Institutional Admin OS
            </span>
          </div>
          <h1 className="page-title text-[#0F172A] font-bold text-2xl md:text-3xl tracking-tight">
            Member Management Console
          </h1>
          <p className="body-text text-base mt-1">
            Configure institutional user roles, audit active profiles, and enforce access restrictions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {currentSubTab === 'directory' && (
            <button
              onClick={handleOpenCreate}
              className="btn-primary-ig cursor-pointer flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white rounded-xl font-semibold text-xs transition-all shadow-md shadow-blue-600/10 border-none"
              id="btn-create-member"
            >
              <Plus size={18} />
              <span>Register New Member</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-Tab Navigation Switcher */}
      <div className="flex border-b border-slate-200 overflow-x-auto whitespace-nowrap" id="admin-subtabs">
        <button
          onClick={() => setCurrentSubTab('directory')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer bg-transparent border-none ${
            currentSubTab === 'directory' 
              ? 'border-[#0056D2] text-[#0056D2] font-bold' 
              : 'border-transparent text-[#475569] hover:text-[#0F172A]'
          }`}
          id="tab-directory-toggle"
        >
          Member Directory & Analytics
        </button>
        <button
          onClick={() => setCurrentSubTab('verification')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer bg-transparent border-none ${
            currentSubTab === 'verification' 
              ? 'border-[#0056D2] text-[#0056D2] font-bold' 
              : 'border-transparent text-[#475569] hover:text-[#0F172A]'
          }`}
          id="tab-verification-toggle"
        >
          Campus Verification Registry
        </button>
        <button
          onClick={() => setCurrentSubTab('audit')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer bg-transparent border-none ${
            currentSubTab === 'audit' 
              ? 'border-blue-600 text-blue-700 font-bold' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
          id="tab-audit-toggle"
        >
          Security Audit Trail
        </button>
      </div>

      {currentSubTab === 'directory' ? (
        <>
          {/* Member Analytics Indicators Panel */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4" id="member-analytics-cards">
            {/* Total */}
            <div className="glass-card rounded-3xl p-5 flex flex-col justify-between shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
              <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Total Members</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-bold text-slate-900 font-mono">{totalMembers}</span>
                <span className="text-[10px] text-slate-450">profiles</span>
              </div>
            </div>

            {/* Students */}
            <div className="glass-card rounded-3xl p-5 flex flex-col justify-between shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
              <span className="text-emerald-600 text-[10px] font-bold uppercase tracking-wider">Students</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-bold text-slate-900 font-mono">{studentCount}</span>
                <span className="text-[10px] text-slate-450">scouts</span>
              </div>
            </div>

            {/* Faculty */}
            <div className="glass-card rounded-3xl p-5 flex flex-col justify-between shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
              <span className="text-indigo-600 text-[10px] font-bold uppercase tracking-wider">Faculty</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-bold text-slate-900 font-mono">{facultyCount}</span>
                <span className="text-[10px] text-slate-450">auditors</span>
              </div>
            </div>

            {/* Management */}
            <div className="glass-card rounded-3xl p-5 flex flex-col justify-between shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
              <span className="text-blue-600 text-[10px] font-bold uppercase tracking-wider">Management</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-bold text-slate-900 font-mono">{managementCount}</span>
                <span className="text-[10px] text-slate-450">board</span>
              </div>
            </div>

            {/* Active */}
            <div className="glass-card rounded-3xl p-5 flex flex-col justify-between shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
              <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Active</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-2xl font-bold text-emerald-600 font-mono">{activeCount}</span>
                <span className="text-[10px] text-slate-450">users</span>
              </div>
            </div>

            {/* Inactive */}
            <div className="glass-card rounded-3xl p-5 flex flex-col justify-between shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
              <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Inactive</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-2xl font-bold text-slate-400 font-mono">{inactiveCount}</span>
                <span className="text-[10px] text-slate-450">dormant</span>
              </div>
            </div>
          </div>

          {/* Directory Core Panel */}
          <div className="glass-card rounded-3xl overflow-hidden shadow-sm" id="directory-panel">
            
            {/* Filters Row */}
            <div className="p-4 border-b border-slate-150 bg-slate-50/50 flex flex-col lg:flex-row items-center gap-4">
              {/* Search input */}
              <div className="flex items-center gap-2 px-3.5 h-[34px] bg-white border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500/10 focus-within:border-blue-600 rounded-xl transition-all w-full lg:max-w-xs shrink-0">
                <Search className="shrink-0 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search name, phone, dept..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-full bg-transparent border-none outline-none text-slate-800 text-xs"
                />
              </div>

              {/* Filters dropdowns */}
              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                <select
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10"
                >
                  <option value="">All Roles</option>
                  <option value="Student">Student</option>
                  <option value="Faculty">Faculty</option>
                  <option value="Management">Management</option>
                  <option value="Admin">Super Admin</option>
                </select>

                <select
                  value={institutionFilter}
                  onChange={(e) => {
                    setInstitutionFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10"
                >
                  <option value="">All Institutions</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Arts & Science">Arts & Science</option>
                  <option value="Management">Management studies</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10"
                >
                  <option value="">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>

                {/* Reset filters */}
                {(searchQuery || roleFilter || institutionFilter || statusFilter) && (
                  <button 
                    onClick={() => {
                      setSearchQuery('');
                      setRoleFilter('');
                      setInstitutionFilter('');
                      setStatusFilter('');
                      setCurrentPage(1);
                    }}
                    className="text-slate-500 hover:text-rose-600 text-xs font-semibold cursor-pointer bg-transparent border-none font-sans"
                  >
                    Reset Filters
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowArchived(!showArchived);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer font-sans ${
                    showArchived
                      ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {showArchived ? 'View Active Members' : 'View Archived Members'}
                </button>
              </div>
            </div>

            {/* List Table */}
            {loading ? (
              <div className="p-16 text-center text-slate-500 text-xs font-mono flex flex-col items-center justify-center gap-2">
                <div className="h-5 w-5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"></div>
                Calibrating member directories...
              </div>
            ) : errorMsg ? (
              <div className="p-12 text-center text-rose-500 text-xs font-mono flex items-center justify-center gap-2">
                <AlertCircle size={16} />
                {errorMsg}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-16 text-center text-slate-450 text-xs py-20">
                No active records match the provided directory filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-sans text-xs uppercase tracking-wider text-slate-500">
                      <th className="p-4 font-semibold">User Particulars</th>
                      <th className="p-4 font-semibold">Contact & Security</th>
                      <th className="p-4 font-semibold">Campus Nodes</th>
                      <th className="p-4 font-semibold">Status</th>
                      <th className="p-4 font-semibold text-right">Administrative Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {currentDirectoryItems.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm shrink-0 border border-slate-200">
                              {u.name.charAt(0)}
                            </div>
                            <div>
                              <span className="font-semibold text-slate-900 block text-sm">{u.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">UID: {u.id}</span>
                            </div>
                          </div>
                        </td>
                        
                        <td className="p-4 space-y-1">
                          <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                            <Mail size={12} className="text-slate-400" />
                            <span>{u.email}</span>
                          </div>
                          {u.phone && (
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <Phone size={12} className="text-slate-400" />
                              <span>{u.phone}</span>
                            </div>
                          )}
                        </td>

                        <td className="p-4 space-y-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider ${getRoleBadge(u.role)}`}>
                            {getRoleIcon(u.role)}
                            {u.role}
                          </span>
                          <div className="text-[10px] text-slate-500 font-semibold block mt-1">
                            {u.institution} Studying Node
                          </div>
                          {u.department && (
                            <div className="text-[10px] text-slate-400 italic block">
                              Dept: {u.department}
                            </div>
                          )}
                        </td>

                        <td className="p-4">
                          {u.status === 'Inactive' ? (
                            <span className="inline-flex items-center gap-1 text-slate-500 font-semibold bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5 text-[9px]">
                              <XCircle size={10} className="text-slate-400" />
                              Inactive
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 border border-emerald-150 rounded-full px-2 py-0.5 text-[9px]">
                              <CheckCircle size={10} className="text-emerald-500" />
                              Active
                            </span>
                          )}
                        </td>

                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {u.deleted ? (
                              <button
                                onClick={() => handleRestoreUser(u)}
                                className="px-2.5 py-1.5 text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl border border-emerald-200 transition-colors cursor-pointer flex items-center gap-1"
                                title="Restore member account"
                              >
                                <CheckCircle size={12} />
                                <span>Restore Node</span>
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleOpenEdit(u)}
                                  className="p-1.5 hover:text-blue-600 text-slate-400 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer bg-transparent border-none"
                                  title="Edit member parameters"
                                >
                                  <Edit2 size={13} />
                                </button>

                                {u.role !== 'Admin' && (
                                  <>
                                    {u.status === 'Pending' ? (
                                      <>
                                        <button
                                          onClick={() => handleUpdateMemberStatus(u.id, 'Active')}
                                          className="p-1.5 hover:text-emerald-600 text-slate-400 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer bg-transparent border-none"
                                          title="Approve Registration"
                                        >
                                          <CheckCircle size={13} className="text-emerald-500" />
                                        </button>
                                        <button
                                          onClick={() => handleUpdateMemberStatus(u.id, 'Disabled')}
                                          className="p-1.5 hover:text-rose-600 text-slate-400 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer bg-transparent border-none"
                                          title="Reject Registration"
                                        >
                                          <XCircle size={13} className="text-rose-500" />
                                        </button>
                                      </>
                                    ) : u.status === 'Active' ? (
                                      <button
                                        onClick={() => handleUpdateMemberStatus(u.id, 'Inactive')}
                                        className="p-1.5 hover:text-amber-600 text-slate-400 rounded-lg hover:bg-amber-50 transition-colors cursor-pointer bg-transparent border-none"
                                        title="Deactivate Member Account"
                                      >
                                        <XCircle size={13} className="text-amber-500" />
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleUpdateMemberStatus(u.id, 'Active')}
                                        className="p-1.5 hover:text-emerald-600 text-slate-400 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer bg-transparent border-none"
                                        title="Activate & Restore Account"
                                      >
                                        <CheckCircle size={13} className="text-emerald-500" />
                                      </button>
                                    )}
                                  </>
                                )}
                                
                                {u.role !== 'Admin' ? (
                                  <button
                                    onClick={() => handleDeleteUser(u)}
                                    className="p-1.5 hover:text-rose-600 text-slate-400 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer bg-transparent border-none"
                                    title="Purge user register"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                ) : (
                                  <span className="p-1.5 text-slate-300 pointer-events-none" title="Protected Admin account">
                                    <Lock size={13} />
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Directory Pagination Controls */}
                {totalPages > 1 && (
                  <div className="p-4 border-t border-slate-150 flex items-center justify-between bg-slate-50/50">
                    <span className="text-slate-500 text-xs">
                      Showing <span className="font-semibold text-slate-800">{indexOfFirstItem + 1}</span> to <span className="font-semibold text-slate-800">{Math.min(indexOfLastItem, filteredUsers.length)}</span> of <span className="font-semibold text-slate-800">{filteredUsers.length}</span> members
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={paginatePrev}
                        disabled={currentPage === 1}
                        className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-800 disabled:opacity-40 transition-all cursor-pointer"
                      >
                        <ChevronLeft size={15} />
                      </button>
                      <span className="text-xs text-slate-700 font-mono font-bold px-2.5">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={paginateNext}
                        disabled={currentPage === totalPages}
                        className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-800 disabled:opacity-40 transition-all cursor-pointer"
                      >
                        <ChevronRight size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      ) : currentSubTab === 'verification' ? (
        <div className="space-y-6 animate-fade-in" id="verification-panel">
          {/* Action Header Panel */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <h3 className="font-display font-bold text-slate-900 text-base">Identity Registry Console</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Import approved student and faculty lists, download template CSVs, and inspect enrollment verification states.
                </p>
              </div>

              {/* Action Buttons Hub */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Download Template */}
                <button
                  onClick={() => downloadTemplate(verificationSubTab)}
                  className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                  title="Download template CSV for formatting imports"
                >
                  <FileSpreadsheet size={14} className="text-slate-500" />
                  Download Template
                </button>

                {/* Export Members */}
                <button
                  onClick={exportMembers}
                  className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                  title="Export active registered database"
                >
                  <Users size={14} className="text-slate-500" />
                  Export Members
                </button>

                {/* Import Records */}
                <label className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs rounded-xl transition-all shadow-md shadow-blue-500/10 cursor-pointer">
                  <Plus size={14} />
                  <span>Import {verificationSubTab === 'students' ? 'Students' : 'Faculty'}</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => handleImportSpreadsheet(e, verificationSubTab)}
                    className="hidden"
                  />
                </label>

                {/* Bulk Purge Database */}
                <button
                  onClick={() => handleClearImportedDatabase(verificationSubTab)}
                  disabled={verificationSubTab === 'students' ? importedStudents.length === 0 : importedFaculty.length === 0}
                  className="flex items-center gap-2 px-3.5 py-2 bg-rose-50 border border-rose-100 text-rose-700 hover:bg-rose-100 disabled:opacity-40 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                >
                  <Trash2 size={14} />
                  Clear {verificationSubTab === 'students' ? 'Students' : 'Faculty'}
                </button>
              </div>
            </div>

            {/* Segment Controller & Search Input */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 border-t border-slate-150 pt-5">
              <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
                <button
                  onClick={() => { setVerificationSubTab('students'); setVerifPage(1); }}
                  className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-semibold rounded-lg transition-all border-none cursor-pointer ${
                    verificationSubTab === 'students'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800 bg-transparent'
                  }`}
                >
                  Student Records ({importedStudents.length})
                </button>
                <button
                  onClick={() => { setVerificationSubTab('faculty'); setVerifPage(1); }}
                  className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-semibold rounded-lg transition-all border-none cursor-pointer ${
                    verificationSubTab === 'faculty'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800 bg-transparent'
                  }`}
                >
                  Faculty Records ({importedFaculty.length})
                </button>
              </div>

              {/* Search Bar */}
              <div className="flex items-center gap-2 px-3 h-[32px] bg-slate-50 border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500/10 focus-within:border-blue-600 rounded-xl w-full sm:max-w-xs">
                <Search className="shrink-0 text-slate-400" size={14} />
                <input
                  type="text"
                  placeholder={`Search ID, name, email, dept...`}
                  value={verificationSearchQuery}
                  onChange={(e) => { setVerificationSearchQuery(e.target.value); setVerifPage(1); }}
                  className="w-full h-full bg-transparent border-none outline-none text-slate-800 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Records List Panel */}
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            {importedLoading ? (
              <div className="p-16 text-center text-slate-500 text-xs font-mono flex flex-col items-center justify-center gap-2">
                <div className="h-5 w-5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"></div>
                Querying verification records database...
              </div>
            ) : (verificationSubTab === 'students' ? importedStudents : importedFaculty).length === 0 ? (
              <div className="p-16 text-center py-20 text-slate-500 flex flex-col items-center justify-center gap-4">
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-full text-slate-400">
                  <FileSpreadsheet size={32} />
                </div>
                <div className="max-w-md">
                  <h4 className="font-bold text-slate-950 text-sm">No authorized identity templates loaded</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-normal">
                    This institution implements full identity verification lockdowns. New students and faculty will be barred from creating accounts until their identity is pre-authorized by Super Admin bulk upload.
                  </p>
                </div>
              </div>
            ) : (() => {
              const dataset = verificationSubTab === 'students' ? importedStudents : importedFaculty;
              const filtered = dataset.filter(item => {
                const query = verificationSearchQuery.toLowerCase();
                const idMatch = (item.registerNumber || item.facultyId || '').toLowerCase().includes(query);
                const nameMatch = (item.name || '').toLowerCase().includes(query);
                const emailMatch = (item.email || '').toLowerCase().includes(query);
                const deptMatch = (item.department || '').toLowerCase().includes(query);
                return idMatch || nameMatch || emailMatch || deptMatch;
              });

              // Pagination
              const pageLimit = 8;
              const lastIdx = verifPage * pageLimit;
              const firstIdx = lastIdx - pageLimit;
              const paginatedItems = filtered.slice(firstIdx, lastIdx);
              const pagesTotal = Math.ceil(filtered.length / pageLimit);

              return (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 font-sans text-xs uppercase tracking-wider text-slate-500 font-semibold">
                          <th className="p-4">{verificationSubTab === 'students' ? 'Register Number' : 'Faculty ID'}</th>
                          <th className="p-4">Name</th>
                          <th className="p-4">Department / Stream</th>
                          <th className="p-4">{verificationSubTab === 'students' ? 'Year & Section' : 'Designation'}</th>
                          <th className="p-4">Institution / Block</th>
                          <th className="p-4">Contact Credentials</th>
                          <th className="p-4">Enrollment State</th>
                          <th className="p-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
                        {paginatedItems.map((item, index) => {
                          const itemKey = item.registerNumber || item.facultyId || String(index);
                          const itemId = (item.registerNumber || item.facultyId || '').toLowerCase().trim();
                          
                          // Check if registered
                          const isRegistered = users.some(u => 
                            u.email.toLowerCase().trim() === item.email.toLowerCase().trim() ||
                            (verificationSubTab === 'students' && (u as any).registerNumber?.toLowerCase()?.trim() === itemId) ||
                            (verificationSubTab === 'faculty' && (u as any).facultyId?.toLowerCase()?.trim() === itemId)
                          );

                          return (
                            <tr key={itemKey} className="hover:bg-slate-50/40 transition-all duration-200">
                              <td className="p-4 font-mono font-bold text-slate-950 tracking-wide text-[11px]">
                                {item.registerNumber || item.facultyId}
                              </td>
                              <td className="p-4 font-semibold text-slate-950 text-xs">{item.name}</td>
                              <td className="p-4 text-slate-600 text-xs">{item.department}</td>
                              <td className="p-4 text-slate-600 text-xs">
                                {verificationSubTab === 'students' ? `Year ${item.year || '1'} (Sec ${item.section || 'A'})` : (item.designation || 'Faculty')}
                              </td>
                              <td className="p-4 text-slate-600 text-xs">
                                <span className="p-1 px-2.5 bg-slate-100 text-slate-700 border border-slate-150 rounded-lg text-[10px] font-mono">
                                  {item.institution}
                                </span>
                              </td>
                              <td className="p-4">
                                <div className="text-slate-900 text-xs font-semibold leading-tight">{item.email}</div>
                                {item.phoneNumber && (
                                  <div className="text-slate-400 text-[10px] font-mono mt-0.5">{item.phoneNumber}</div>
                                )}
                              </td>
                              <td className="p-4">
                                {isRegistered ? (
                                  <span className="inline-flex items-center gap-1.5 p-1 px-3 bg-emerald-50 border border-emerald-150 text-emerald-800 text-[10px] font-bold rounded-full">
                                    <CheckCircle size={11} className="text-emerald-600" />
                                    Active Account
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 p-1 px-3 bg-slate-50 border border-slate-200 text-slate-500 text-[10px] font-bold rounded-full">
                                    <Clock size={11} className="text-slate-400" />
                                    Unclaimed Listing
                                  </span>
                                )}
                              </td>
                              <td className="p-4 text-center">
                                <button
                                  onClick={() => handleDeleteImportedRecord(item.registerNumber || item.facultyId, verificationSubTab)}
                                  className="p-1.5 hover:text-rose-600 text-slate-400 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer bg-transparent border-none"
                                  title="Purge verification record"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Pagination control footer */}
                    {pagesTotal > 1 && (
                      <div className="p-4 border-t border-slate-150 flex items-center justify-between bg-slate-50/50">
                        <span className="text-slate-500 text-xs">
                          Showing <span className="font-semibold text-slate-800">{firstIdx + 1}</span> to <span className="font-semibold text-slate-800">{Math.min(lastIdx, filtered.length)}</span> of <span className="font-semibold text-slate-800">{filtered.length}</span> profiles
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setVerifPage(prev => Math.max(1, prev - 1))}
                            disabled={verifPage === 1}
                            className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-800 disabled:opacity-40 transition-all cursor-pointer"
                          >
                            <ChevronLeft size={14} />
                          </button>
                          <span className="text-xs text-slate-700 font-mono font-bold px-2.5">
                            {verifPage} / {pagesTotal}
                          </span>
                          <button
                            onClick={() => setVerifPage(prev => Math.min(pagesTotal, prev + 1))}
                            disabled={verifPage === pagesTotal}
                            className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-800 disabled:opacity-40 transition-all cursor-pointer"
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      ) : (
        /* Security Audit Log View */
        <div className="glass-card rounded-3xl overflow-hidden shadow-sm" id="audit-trail-panel">
          
          {/* Audit Search bar */}
          <div className="p-4 border-b border-slate-150 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">System Audit Timeline</h3>
              <p className="text-[11px] text-slate-400">Verifiably logging every administrative user edit or logger update.</p>
            </div>

            <div className="flex items-center gap-2 px-3 h-[32px] bg-white border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500/10 focus-within:border-blue-600 rounded-xl w-full sm:max-w-xs">
              <Search className="shrink-0 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Search actions, actors..."
                value={auditSearchQuery}
                onChange={(e) => setAuditSearchQuery(e.target.value)}
                className="w-full h-full bg-transparent border-none outline-none text-slate-800 text-xs"
              />
            </div>
          </div>

          {/* Timeline Contents */}
          {auditLoading && auditLogs.length === 0 ? (
            <div className="p-16 text-center text-slate-500 text-xs font-mono flex flex-col items-center justify-center gap-2">
              <div className="h-5 w-5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"></div>
              Querying database security audit ledgers...
            </div>
          ) : filteredAudits.length === 0 ? (
            <div className="p-16 text-center text-slate-400 text-xs py-20">
              No audit activities captured matching search index.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-sans text-xs uppercase tracking-wider text-slate-500">
                    <th className="p-4 font-semibold w-40">Timestamp</th>
                    <th className="p-4 font-semibold w-48">Actor Credentials</th>
                    <th className="p-4 font-semibold">Action Verified Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
                  {filteredAudits.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="p-4 font-mono text-[10px] text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} className="text-slate-300" />
                          <span>{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className="font-bold text-slate-800 block text-xs">{log.actorName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{log.actorEmail}</span>
                      </td>

                      <td className="p-4">
                        <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-800 text-xs font-medium leading-relaxed">
                          {log.action}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Form Dialog Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative animate-fade-in max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowFormModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer bg-transparent border-none"
            >
              <X size={16} />
            </button>

            <h3 className="font-display font-bold text-lg text-slate-950 mb-1">
              {editingUser ? 'Edit Member Register Parameters' : 'Register New Campus Member'}
            </h3>
            <p className="text-slate-500 text-xs mb-5">
              {editingUser ? `Modifying directory listing for member ${editingUser.name}` : 'Spawn validated credentials and profile mappings for a new student, faculty, or manager.'}
            </p>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                {/* Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block">Full Name*</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Dr. Nagarjuna"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 rounded-xl text-slate-800 text-xs"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block">Campus Email*</label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="e.g. prof@indraverse.edu"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 rounded-xl text-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Phone */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block">Phone Number</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 rounded-xl text-slate-800 text-xs"
                  />
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block">Account Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as 'Active' | 'Inactive')}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 rounded-xl text-slate-800 text-xs cursor-pointer"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive / Suspended</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Institution */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block">Institution Study Node</label>
                  <select
                    value={formInstitution}
                    onChange={(e) => setFormInstitution(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 rounded-xl text-slate-800 text-xs cursor-pointer"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Arts & Science">Arts & Science</option>
                    <option value="Management">Management studies</option>
                  </select>
                </div>

                {/* Department */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block">Department</label>
                  <input
                    type="text"
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    placeholder="e.g. Computer Science"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 rounded-xl text-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Role */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block">Institutional Access Role*</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as UserRole)}
                    disabled={editingUser?.role === 'Admin'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 rounded-xl text-slate-850 text-xs outline-none transition-all cursor-pointer"
                  >
                    {editingUser?.role === 'Admin' ? (
                      <option value="Admin">Super Admin (Protected)</option>
                    ) : (
                      <>
                        <option value="Student">Student (Environmental Scout)</option>
                        <option value="Faculty">Faculty (Campus Auditor)</option>
                        <option value="Management">Management (Campus Board View)</option>
                        <option value="Staff">Staff</option>
                        <option value="Sustainability Coordinator">Sustainability Coordinator</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block">
                    {editingUser ? 'New Password (Leave blank to keep current)' : 'Account Password*'}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 rounded-xl text-slate-800 text-xs"
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitLoading}
                className="w-full py-3 mt-4 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/10 cursor-pointer disabled:opacity-50 transition-all border-none"
              >
                {submitLoading ? 'Registering...' : editingUser ? 'Apply Changes' : 'Spawn Member Record'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SAFE DELETE CONFIRMATION MODAL */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-slate-900">Delete Member Account</h3>
                <p className="text-xs text-slate-500">This action is permanent and cannot be undone.</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Target Account</div>
              <div className="font-semibold text-slate-800 text-sm">{userToDelete.name}</div>
              <div className="text-xs text-slate-500 font-mono mt-0.5">{userToDelete.email}</div>
            </div>

             <div className="flex gap-3">
              <button
                type="button"
                disabled={isDeletingUser}
                onClick={() => setUserToDelete(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer border-none transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingUser}
                onClick={handleConfirmDeleteUser}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white font-bold text-xs rounded-xl cursor-pointer border-none shadow-md shadow-rose-600/10 transition-colors flex items-center justify-center gap-1.5"
              >
                {isDeletingUser ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SAFE CUSTOM ALERT MODAL */}
      {customAlertMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col items-center text-center p-2">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-full mb-3">
                <AlertCircle size={28} />
              </div>
              <h3 className="font-display font-bold text-base text-slate-900 mb-2">Notification</h3>
              <p className="text-xs text-slate-650 leading-relaxed mb-5">{customAlertMsg}</p>
              <button
                onClick={() => setCustomAlertMsg(null)}
                className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer border-none transition-colors"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
