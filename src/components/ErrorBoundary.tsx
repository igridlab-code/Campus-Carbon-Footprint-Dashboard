import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error inside IndraVerse view:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleRefresh = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div 
          className="w-full max-w-2xl mx-auto my-12 bg-white/80 backdrop-blur-3xl border border-rose-100 rounded-3xl p-8 md:p-12 shadow-[0_10px_40px_rgba(244,63,94,0.04)] text-center space-y-6 animate-fade-in"
          id="error-boundary-container"
        >
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-3xl bg-rose-50 border border-rose-100 text-rose-600 font-bold text-3xl shadow-xs animate-pulse">
            <ShieldAlert size={28} />
          </div>

          <div className="space-y-2">
            <h2 className="font-display font-black text-2xl text-slate-800 tracking-tight">View Load Failure</h2>
            <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed">
              We encountered an operational exception while rendering this page module. This has been logged for system diagnosis.
            </p>
          </div>

          {this.state.error && (
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left max-w-lg mx-auto overflow-x-auto">
              <span className="text-[9px] uppercase font-mono tracking-wider text-slate-400 font-bold block mb-1">Error Diagnostics</span>
              <p className="text-xs font-mono text-rose-600 font-bold whitespace-pre-wrap">{this.state.error.message}</p>
              {this.state.error.stack && (
                <p className="text-[10px] font-mono text-slate-400 mt-2 whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {this.state.error.stack.split('\n').slice(0, 3).join('\n')}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={this.handleReset}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs cursor-pointer transition-all border-none"
            >
              <RefreshCw size={14} className="animate-spin-slow" />
              Reset View State
            </button>
            <button
              onClick={this.handleRefresh}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-500 to-green-500 hover:opacity-95 text-white rounded-2xl font-bold text-xs cursor-pointer transition-all shadow-sm shadow-emerald-500/15 border-none"
            >
              <Home size={14} />
              Reload Platform
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
