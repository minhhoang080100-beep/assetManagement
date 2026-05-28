import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Search, Shield, UserPlus, Users, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { DEPARTMENTS } from '../lib/constants';
import { getRoleName } from '../lib/access';
import { getErrorMessage } from '../lib/errors';
import type { AuthUser, UserAccount, UserRole } from '../lib/types';

interface OutletCtx {
  user: AuthUser;
}

interface UserFormState {
  username: string;
  fullName: string;
  role: UserRole;
  department: string;
  password: string;
  isActive: boolean;
}

const roleOptions: UserRole[] = ['USER', 'ADMIN', 'DIRECTOR', 'DEPUTY_DIRECTOR', 'MANAGER'];
const emptyForm: UserFormState = {
  username: '',
  fullName: '',
  role: 'USER',
  department: '',
  password: '123456',
  isActive: true,
};

export default function UserManagementPage() {
  const { user } = useOutletContext<OutletCtx>();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [resetUser, setResetUser] = useState<UserAccount | null>(null);
  const [resetPassword, setResetPassword] = useState('123456');
  const [form, setForm] = useState<UserFormState>(emptyForm);

  const departments = useMemo(
    () => DEPARTMENTS.flatMap((group) => group.items.map((item) => `${group.group} - ${item}`)),
    [],
  );

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<UserAccount[]>('/api/users'),
    enabled: user.role === 'ADMIN',
  });

  const createMutation = useMutation({
    mutationFn: (payload: UserFormState) => api.post<UserAccount, UserFormState>('/api/users', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsModalOpen(false);
      toast.success('Đã tạo tài khoản');
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err, 'Lỗi tạo tài khoản')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Omit<UserFormState, 'username' | 'password'> }) =>
      api.put<UserAccount, Omit<UserFormState, 'username' | 'password'>>(`/api/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsModalOpen(false);
      setEditingUser(null);
      toast.success('Đã cập nhật tài khoản');
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err, 'Lỗi cập nhật tài khoản')),
  });

  const resetMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      api.put<{ message: string }, { password: string }>(`/api/users/${id}/password`, { password }),
    onSuccess: () => {
      setResetUser(null);
      setResetPassword('123456');
      toast.success('Đã đặt lại mật khẩu');
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err, 'Lỗi đặt lại mật khẩu')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete<{ message: string }>(`/api/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Đã xóa tài khoản');
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err, 'Lỗi xóa tài khoản')),
  });

  const filteredUsers = users.filter((account) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      account.username.toLowerCase().includes(q) ||
      account.fullName.toLowerCase().includes(q) ||
      account.department.toLowerCase().includes(q);
    const matchesRole = roleFilter === 'all' || account.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const stats = {
    total: users.length,
    active: users.filter((account) => account.isActive !== false).length,
    admins: users.filter((account) => account.role === 'ADMIN').length,
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setForm({ ...emptyForm, department: departments[0] || '' });
    setIsModalOpen(true);
  };

  const openEditModal = (account: UserAccount) => {
    setEditingUser(account);
    setForm({
      username: account.username,
      fullName: account.fullName,
      role: account.role,
      department: account.department,
      password: '',
      isActive: account.isActive !== false,
    });
    setIsModalOpen(true);
  };

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    if (!form.fullName.trim() || !form.department.trim()) {
      toast.error('Vui lòng nhập đủ họ tên và phòng ban');
      return;
    }

    if (editingUser) {
      updateMutation.mutate({
        id: editingUser._id,
        data: {
          fullName: form.fullName,
          role: form.role,
          department: form.department,
          isActive: form.isActive,
        },
      });
      return;
    }

    if (!form.username.trim() || form.password.length < 6) {
      toast.error('Tên đăng nhập là bắt buộc và mật khẩu tối thiểu 6 ký tự');
      return;
    }
    createMutation.mutate({ ...form, username: form.username.trim().toLowerCase() });
  };

  const toggleActive = (account: UserAccount) => {
    updateMutation.mutate({
      id: account._id,
      data: {
        fullName: account.fullName,
        role: account.role,
        department: account.department,
        isActive: account.isActive === false,
      },
    });
  };

  if (user.role !== 'ADMIN') {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        Bạn không có quyền truy cập màn hình quản lý tài khoản.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-8 h-8 text-blue-600" />
            Quản lý tài khoản
          </h1>
          <p className="text-muted-foreground mt-1">Tạo tài khoản phòng ban, reset mật khẩu và khóa/mở quyền truy cập.</p>
        </div>
        <button onClick={openCreateModal} className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2 shadow-sm transition-colors">
          <UserPlus className="mr-2 h-4 w-4" /> Tạo tài khoản
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-muted-foreground">Tổng tài khoản</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-muted-foreground">Đang hoạt động</p>
          <p className="text-2xl font-bold text-emerald-700">{stats.active}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-muted-foreground">ADMIN</p>
          <p className="text-2xl font-bold text-blue-700">{stats.admins}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative w-full sm:w-[360px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Tìm theo tài khoản, họ tên, phòng ban"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as 'all' | UserRole)}
          className="flex h-10 w-full sm:w-[220px] rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">Tất cả vai trò</option>
          {roleOptions.map((role) => <option key={role} value={role}>{getRoleName(role)}</option>)}
        </select>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-4 font-semibold text-slate-600">Tài khoản</th>
                <th className="p-4 font-semibold text-slate-600">Phòng ban</th>
                <th className="p-4 font-semibold text-slate-600">Vai trò</th>
                <th className="p-4 font-semibold text-slate-600">Trạng thái</th>
                <th className="p-4 font-semibold text-slate-600 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Đang tải dữ liệu...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Không tìm thấy tài khoản.</td></tr>
              ) : filteredUsers.map((account) => (
                <tr key={account._id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <p className="font-semibold">{account.username}</p>
                    <p className="text-xs text-muted-foreground">{account.fullName}</p>
                  </td>
                  <td className="p-4 max-w-sm">{account.department}</td>
                  <td className="p-4">
                    <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-xs font-semibold">
                      {getRoleName(account.role)}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${account.isActive === false ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {account.isActive === false ? 'Đã khóa' : 'Hoạt động'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-1.5 flex-wrap">
                      <button onClick={() => openEditModal(account)} className="text-xs rounded-md border px-2 py-1 hover:bg-slate-50">Sửa</button>
                      <button onClick={() => { setResetUser(account); setResetPassword('123456'); }} className="text-xs rounded-md border px-2 py-1 hover:bg-slate-50">Reset mật khẩu</button>
                      <button onClick={() => toggleActive(account)} className="text-xs rounded-md border px-2 py-1 hover:bg-slate-50">{account.isActive === false ? 'Mở khóa' : 'Khóa'}</button>
                      <button
                        onClick={() => {
                          if (confirm(`Xóa tài khoản ${account.username}?`)) deleteMutation.mutate(account._id);
                        }}
                        className="text-xs rounded-md border border-red-200 text-red-700 px-2 py-1 hover:bg-red-50"
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl border shadow-lg overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" /> {editingUser ? 'Cập nhật tài khoản' : 'Tạo tài khoản'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-slate-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={submitForm}>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Tên đăng nhập</label>
                    <input value={form.username} disabled={Boolean(editingUser)} onChange={(e) => setForm({ ...form, username: e.target.value })} className="w-full h-10 rounded-md border px-3 py-2 text-sm disabled:bg-slate-100" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Họ tên / Tên phòng ban</label>
                    <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="w-full h-10 rounded-md border px-3 py-2 text-sm" />
                  </div>
                </div>
                {!editingUser && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Mật khẩu khởi tạo</label>
                    <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full h-10 rounded-md border px-3 py-2 text-sm" />
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Vai trò</label>
                    <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })} className="w-full h-10 rounded-md border px-3 py-2 text-sm">
                      {roleOptions.map((role) => <option key={role} value={role}>{getRoleName(role)}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Trạng thái</label>
                    <select value={form.isActive ? 'active' : 'locked'} onChange={(e) => setForm({ ...form, isActive: e.target.value === 'active' })} className="w-full h-10 rounded-md border px-3 py-2 text-sm">
                      <option value="active">Hoạt động</option>
                      <option value="locked">Đã khóa</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Phòng ban</label>
                  <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="w-full h-10 rounded-md border px-3 py-2 text-sm">
                    {departments.map((department) => <option key={department} value={department}>{department}</option>)}
                  </select>
                </div>
              </div>
              <div className="p-6 border-t bg-slate-50 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm border rounded-md">Hủy</button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md disabled:opacity-50">
                  {editingUser ? 'Lưu thay đổi' : 'Tạo tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {resetUser && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-xl border shadow-lg overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-lg font-bold">Reset mật khẩu</h2>
              <button onClick={() => setResetUser(null)} className="p-1 hover:bg-slate-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-sm text-muted-foreground">Tài khoản: <span className="font-medium text-foreground">{resetUser.username}</span></p>
              <input value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} className="w-full h-10 rounded-md border px-3 py-2 text-sm" />
            </div>
            <div className="p-6 border-t bg-slate-50 flex justify-end gap-2">
              <button onClick={() => setResetUser(null)} className="px-4 py-2 text-sm border rounded-md">Hủy</button>
              <button onClick={() => resetMutation.mutate({ id: resetUser._id, password: resetPassword })} disabled={resetMutation.isPending} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md disabled:opacity-50">Đặt lại</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
