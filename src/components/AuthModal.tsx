import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Mail, 
  User as UserIcon, 
  ShieldAlert, 
  UserCheck, 
  ArrowRight,
  Sparkles,
  X,
  Compass,
  Cpu,
  Leaf,
  Key,
  Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserRole } from '../types';

interface AuthModalProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string, name: string, role: UserRole) => Promise<void>;
  onClose?: () => void;
}

export default function AuthModal({ onLogin, onRegister, onClose }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot Password states
  const [isForgotPasswordView, setIsForgotPasswordView] = useState(false);
  const [forgotStep, setForgotStep] = useState<'email' | 'otp' | 'reset'>('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotTimer, setForgotTimer] = useState(0);
  const [resendDisabled, setResendDisabled] = useState(false);

  useEffect(() => {
    let interval: any;
    if (forgotTimer > 0) {
      interval = setInterval(() => {
        setForgotTimer(prev => prev - 1);
      }, 1000);
    } else if (forgotTimer === 0) {
      setResendDisabled(false);
    }
    return () => clearInterval(interval);
  }, [forgotTimer]);

  const handleForgotPasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!forgotEmail.trim()) {
      setErrorMsg('Email address is required.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'OTP request failed.');
      }

      setForgotStep('otp');
      setForgotTimer(60);
      setResendDisabled(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred requesting OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!forgotOtp.trim()) {
      setErrorMsg('Email verification OTP is required.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim(), otp: forgotOtp.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Email OTP verification failed.');
      }

      setForgotStep('reset');
    } catch (err: any) {
      setErrorMsg(err.message || 'Incorrect or expired Email OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!forgotNewPassword || !forgotConfirmPassword) {
      setErrorMsg('All fields are required.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail.trim(),
          newPassword: forgotNewPassword
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Reset failed.');
      }

      setIsForgotPasswordView(false);
      setForgotStep('email');
      setForgotEmail('');
      setForgotOtp('');
      setForgotNewPassword('');
      setForgotConfirmPassword('');
      alert('Password reset successfully! Please sign in with your new credentials.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      await onLogin(email, password);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#F7F9FC]/95 backdrop-blur-md overflow-y-auto animate-fade-in" 
      id="auth-modal-overlay"
    >
      {/* High-Contrast Focal Login Card (#FFFFFF, rounded 20px, 40px padding, shadow-xl, border #E2E8F0) */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="w-full max-w-lg bg-white rounded-[20px] p-8 md:p-10 shadow-xl border border-[#E2E8F0] relative overflow-hidden font-sans z-10"
      >
        {/* Return to Main Portal dismiss button */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl bg-slate-100 border border-slate-200 text-[#475569] hover:text-[#0F172A] hover:bg-slate-200 transition-all cursor-pointer border-none"
            title="Return to Main Portal"
          >
            <X size={18} />
          </button>
        )}

        {isForgotPasswordView ? (
          /* FORGOT PASSWORD FLOW */
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-sky-50 text-[#0056D2] border border-sky-200 font-bold text-xl mb-1">
                <Key size={22} />
              </div>
              <h2 className="card-title text-2xl text-[#0F172A]">Recover Password</h2>
              <p className="body-text text-sm">
                {forgotStep === 'email' && 'Enter your registered email to request an OTP code.'}
                {forgotStep === 'otp' && `Verification OTP sent to ${forgotEmail}.`}
                {forgotStep === 'reset' && 'Create a strong, secure new password.'}
              </p>
            </div>

            {errorMsg && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs flex items-center gap-2.5 font-medium font-sans">
                <ShieldAlert size={16} className="shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {forgotStep === 'email' && (
              <form onSubmit={handleForgotPasswordRequest} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="label-text block font-bold text-[#334155]">Registered Email</label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="e.g. principal@igceeng.com"
                    className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#CBD5E1] focus:border-[#0056D2] rounded-xl text-[#0F172A] placeholder:text-[#64748B] text-sm outline-none transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary-ig w-full justify-center py-3.5 text-sm"
                >
                  {loading ? 'Sending OTP...' : 'Request Recovery OTP'}
                </button>
              </form>
            )}

            {forgotStep === 'otp' && (
              <form onSubmit={handleForgotPasswordVerify} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="label-text block font-bold text-[#334155]">6-Digit Recovery OTP</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value)}
                    placeholder="123456"
                    className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#CBD5E1] focus:border-[#0056D2] rounded-xl text-[#0F172A] placeholder:text-[#64748B] text-base text-center tracking-widest font-bold outline-none transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary-ig w-full justify-center py-3.5 text-sm"
                >
                  {loading ? 'Verifying OTP...' : 'Verify Recovery OTP'}
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    disabled={resendDisabled || loading}
                    onClick={handleForgotPasswordRequest}
                    className="text-xs text-[#0056D2] font-semibold hover:underline bg-transparent border-none cursor-pointer"
                  >
                    {forgotTimer > 0 ? `Resend OTP in ${forgotTimer}s` : 'Resend Recovery OTP'}
                  </button>
                </div>
              </form>
            )}

            {forgotStep === 'reset' && (
              <form onSubmit={handleForgotPasswordReset} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="label-text block font-bold text-[#334155]">New Security Password</label>
                  <input
                    type="password"
                    required
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#CBD5E1] focus:border-[#0056D2] rounded-xl text-[#0F172A] placeholder:text-[#64748B] text-sm outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="label-text block font-bold text-[#334155]">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#CBD5E1] focus:border-[#0056D2] rounded-xl text-[#0F172A] placeholder:text-[#64748B] text-sm outline-none transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary-ig w-full justify-center py-3.5 text-sm"
                >
                  {loading ? 'Updating...' : 'Save New Password'}
                </button>
              </form>
            )}

            <div className="text-center pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => { setIsForgotPasswordView(false); setErrorMsg(''); }}
                className="text-xs font-semibold text-[#475569] hover:text-[#0F172A] bg-transparent border-none cursor-pointer"
              >
                ← Back to Administrator Login
              </button>
            </div>
          </div>
        ) : (
          /* MAIN ADMIN LOGIN FORM */
          <div className="space-y-6">
            {/* Form Headers */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center h-13 w-13 rounded-2xl bg-sky-50 border border-sky-200 text-[#0056D2] font-bold text-2xl mb-1 shadow-xs">
                <Shield size={24} className="text-[#0056D2]" />
              </div>
              <h2 className="page-title text-2xl md:text-3xl text-[#0F172A]">
                Portal Management Login
              </h2>
              <p className="body-text text-sm">
                Sign in to access the Indra Ganesan Institutions Super Admin Workspace.
              </p>
            </div>

            {/* Error Message */}
            <AnimatePresence mode="wait">
              {errorMsg && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-3.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs flex items-center gap-2.5 font-sans font-semibold"
                >
                  <ShieldAlert size={16} className="shrink-0 text-rose-600" />
                  <span>{errorMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email / Username */}
              <div className="space-y-1.5">
                <label className="label-text block font-bold text-[#334155]">
                  Administrator Email or Username
                </label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 text-[#64748B]" size={18} />
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. admin or principal@igceeng.com"
                    className="w-full pl-11 pr-4 py-3 bg-[#F8FAFC] border border-[#CBD5E1] focus:border-[#0056D2] rounded-xl text-[#0F172A] placeholder:text-[#64748B] text-sm outline-none transition-all font-sans"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="label-text block font-bold text-[#334155]">Security Password</label>
                  <button
                    type="button"
                    onClick={() => { setIsForgotPasswordView(true); setForgotStep('email'); setErrorMsg(''); }}
                    className="text-xs text-[#0056D2] font-semibold hover:underline bg-transparent border-none cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 text-[#64748B]" size={18} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-4 py-3 bg-[#F8FAFC] border border-[#CBD5E1] focus:border-[#0056D2] rounded-xl text-[#0F172A] placeholder:text-[#64748B] text-sm outline-none transition-all font-sans tracking-widest"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 mt-2 bg-gradient-to-r from-[#0056D2] to-[#0284C7] hover:from-[#0047b3] hover:to-[#0275b3] active:scale-[0.99] text-white font-bold text-base rounded-xl shadow-md shadow-[#0056D2]/20 cursor-pointer disabled:opacity-50 transition-all border-none font-sans"
              >
                <span>{loading ? 'Authenticating Admin Session...' : 'Sign In to Admin Workspace'}</span>
                <ArrowRight size={18} />
              </button>
            </form>
          </div>
        )}
      </motion.div>
    </div>
  );
}
