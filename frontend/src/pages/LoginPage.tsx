import React, { useState } from 'react';
import { Ship, LogIn, Eye, EyeOff } from 'lucide-react';
import api from '../lib/api';
import type { AuthUser } from '../lib/types';
import { getErrorMessage } from '../lib/errors';

interface LoginPageProps {
  onLogin: (user: AuthUser, token: string) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.login(username, password);
      onLogin(data.user, data.token);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Không thể kết nối tới máy chủ. Vui lòng thử lại.'));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)' }}>
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-400/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-blue-500/25 mb-6">
            <Ship className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Quản lý Tài sản</h1>
          <p className="text-blue-200/70 mt-2 text-sm">Công ty Cổ phần Cảng Nghệ Tĩnh</p>
        </div>

        {/* Login Card */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-blue-100">Tên đăng nhập</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập..."
                required
                className="w-full h-11 rounded-lg border border-white/20 bg-white/10 text-white placeholder:text-blue-200/40 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-blue-100">Mật khẩu</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                  required
                  className="w-full h-11 rounded-lg border border-white/20 bg-white/10 text-white placeholder:text-blue-200/40 px-4 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-200/50 hover:text-blue-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-400/30 text-red-200 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium text-sm hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Đăng nhập
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-blue-200/30 text-xs mt-6">© 2026 Cảng Nghệ Tĩnh. Phần mềm Quản lý Tài sản v2.0</p>
      </div>
    </div>
  );
}
