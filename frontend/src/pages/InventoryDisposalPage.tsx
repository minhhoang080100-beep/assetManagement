import { useState } from 'react';
import { ClipboardCheck, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import type { AuthUser, DisposalRequest, Equipment, InventoryAudit, InventoryItem } from '../lib/types';
import { getErrorMessage } from '../lib/errors';

interface OutletCtx {
  user: AuthUser;
}

interface CreateInventoryPayload {
  title: string;
  period: string;
  department?: string;
  items: InventoryItem[];
}

interface CreateDisposalPayload {
  equipmentCode: string;
  equipmentName: string;
  department: string;
  reason: string;
  note?: string;
}

export default function InventoryDisposalPage() {
  const { user } = useOutletContext<OutletCtx>();
  const queryClient = useQueryClient();
  const [auditTitle, setAuditTitle] = useState(`Kiểm kê tài sản ${new Date().getFullYear()}`);
  const [auditPeriod, setAuditPeriod] = useState(`${new Date().getFullYear()}`);
  const [selectedCode, setSelectedCode] = useState('');
  const [disposalReason, setDisposalReason] = useState('');

  const { data: equipments = [] } = useQuery({
    queryKey: ['equipments'],
    queryFn: () => api.get<Equipment[]>('/api/equipments')
  });

  const { data: audits = [], isLoading: loadingAudits } = useQuery({
    queryKey: ['inventory-audits'],
    queryFn: () => api.get<InventoryAudit[]>('/api/inventory/audits')
  });

  const { data: disposals = [], isLoading: loadingDisposals } = useQuery({
    queryKey: ['disposals'],
    queryFn: () => api.get<DisposalRequest[]>('/api/inventory/disposals')
  });

  const createAuditMutation = useMutation({
    mutationFn: (payload: CreateInventoryPayload) => api.post<InventoryAudit, CreateInventoryPayload>('/api/inventory/audits', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-audits'] });
      toast.success('Đã lập biên bản kiểm kê');
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err, 'Lỗi lập kiểm kê'))
  });

  const completeAuditMutation = useMutation({
    mutationFn: (id: string) => api.put<InventoryAudit, { status: InventoryAudit['status'] }>(`/api/inventory/audits/${id}`, { status: 'Hoàn tất' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-audits'] });
      queryClient.invalidateQueries({ queryKey: ['equipments'] });
      toast.success('Đã hoàn tất kiểm kê và cập nhật tài sản');
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err, 'Lỗi hoàn tất kiểm kê'))
  });

  const createDisposalMutation = useMutation({
    mutationFn: (payload: CreateDisposalPayload) => api.post<DisposalRequest, CreateDisposalPayload>('/api/inventory/disposals', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disposals'] });
      setDisposalReason('');
      toast.success('Đã lập hồ sơ thanh lý');
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err, 'Lỗi lập hồ sơ thanh lý'))
  });

  const updateDisposalMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: DisposalRequest['status'] }) =>
      api.put<DisposalRequest, { status: DisposalRequest['status'] }>(`/api/inventory/disposals/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disposals'] });
      queryClient.invalidateQueries({ queryKey: ['equipments'] });
      toast.success('Đã cập nhật hồ sơ thanh lý');
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err, 'Lỗi cập nhật thanh lý'))
  });

  const selectedEquipment = equipments.find((eq) => eq.code === selectedCode);

  const createAudit = () => {
    if (equipments.length === 0) return toast.error('Chưa có thiết bị để kiểm kê.');
    createAuditMutation.mutate({
      title: auditTitle,
      period: auditPeriod,
      department: user.department,
      items: equipments.map((eq) => ({
        equipmentCode: eq.code,
        equipmentName: eq.name,
        department: eq.department,
        actualStatus: eq.status,
        condition: eq.condition ?? 100,
        note: '',
        recommendation: eq.status === 'Thanh lý' || eq.status === 'Kém phẩm chất' ? 'Thanh lý' : 'Không',
      })),
    });
  };

  const createDisposal = () => {
    if (!selectedEquipment) return toast.error('Chọn thiết bị cần thanh lý.');
    if (!disposalReason.trim()) return toast.error('Nhập lý do thanh lý.');
    createDisposalMutation.mutate({
      equipmentCode: selectedEquipment.code,
      equipmentName: selectedEquipment.name,
      department: selectedEquipment.department,
      reason: disposalReason,
    });
  };

  const formatDate = (date?: string) => date ? new Date(date).toLocaleDateString('vi-VN') : '';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ClipboardCheck className="w-8 h-8 text-emerald-600" /> Kiểm kê & Thanh lý
        </h1>
        <p className="text-muted-foreground mt-1">Quản lý biên bản kiểm kê tài sản và hồ sơ thanh lý theo SOP.</p>
      </div>

      {user.role === 'ADMIN' && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <h2 className="font-semibold">Lập biên bản kiểm kê</h2>
            <input value={auditTitle} onChange={e => setAuditTitle(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
            <input value={auditPeriod} onChange={e => setAuditPeriod(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
            <button onClick={createAudit} className="bg-emerald-600 text-white rounded-md px-4 py-2 text-sm hover:bg-emerald-700">Tạo từ danh mục hiện tại</button>
          </div>

          <div className="rounded-xl border bg-card p-5 space-y-3">
            <h2 className="font-semibold">Lập hồ sơ thanh lý</h2>
            <select value={selectedCode} onChange={e => setSelectedCode(e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
              <option value="">Chọn thiết bị</option>
              {equipments.map((eq) => <option key={eq.code} value={eq.code}>{eq.code} - {eq.name}</option>)}
            </select>
            <textarea value={disposalReason} onChange={e => setDisposalReason(e.target.value)} className="w-full border rounded px-3 py-2 text-sm min-h-20" placeholder="Lý do thanh lý"></textarea>
            <button onClick={createDisposal} className="bg-red-600 text-white rounded-md px-4 py-2 text-sm hover:bg-red-700">Lập hồ sơ</button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="p-4 border-b font-semibold">Biên bản kiểm kê</div>
          {loadingAudits ? <p className="p-4 text-muted-foreground">Đang tải...</p> : audits.map((audit) => (
            <div key={audit._id} className="p-4 border-b last:border-0 space-y-2">
              <div className="flex justify-between gap-3">
                <div>
                  <p className="font-medium">{audit.title}</p>
                  <p className="text-xs text-muted-foreground">{audit.period} • {audit.items.length} thiết bị • {formatDate(audit.createdAt)}</p>
                </div>
                <span className="text-xs rounded-full bg-slate-100 px-2 py-1 h-fit">{audit.status}</span>
              </div>
              {user.role === 'ADMIN' && audit.status === 'Đang kiểm kê' && (
                <button onClick={() => completeAuditMutation.mutate(audit._id)} className="text-xs bg-emerald-100 text-emerald-700 rounded px-2 py-1">Hoàn tất kiểm kê</button>
              )}
            </div>
          ))}
          {!loadingAudits && audits.length === 0 && <p className="p-4 text-muted-foreground">Chưa có biên bản kiểm kê.</p>}
        </div>

        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="p-4 border-b font-semibold">Hồ sơ thanh lý</div>
          {loadingDisposals ? <p className="p-4 text-muted-foreground">Đang tải...</p> : disposals.map((item) => (
            <div key={item._id} className="p-4 border-b last:border-0 space-y-2">
              <div className="flex justify-between gap-3">
                <div>
                  <p className="font-medium">{item.equipmentName}</p>
                  <p className="text-xs text-muted-foreground">{item.equipmentCode} • {item.department}</p>
                  <p className="text-sm mt-1">{item.reason}</p>
                </div>
                <span className="text-xs rounded-full bg-slate-100 px-2 py-1 h-fit">{item.status}</span>
              </div>
              <div className="flex gap-2">
                {user.role === 'DIRECTOR' && item.status === 'Chờ duyệt' && (
                  <>
                    <button onClick={() => updateDisposalMutation.mutate({ id: item._id, status: 'TGĐ phê duyệt' })} className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 rounded px-2 py-1"><CheckCircle2 className="w-3 h-3" /> Duyệt</button>
                    <button onClick={() => updateDisposalMutation.mutate({ id: item._id, status: 'Từ chối' })} className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 rounded px-2 py-1"><XCircle className="w-3 h-3" /> Từ chối</button>
                  </>
                )}
                {user.role === 'ADMIN' && item.status === 'TGĐ phê duyệt' && (
                  <button onClick={() => updateDisposalMutation.mutate({ id: item._id, status: 'Đã thanh lý' })} className="inline-flex items-center gap-1 text-xs bg-red-600 text-white rounded px-2 py-1"><Trash2 className="w-3 h-3" /> Xác nhận thanh lý</button>
                )}
              </div>
            </div>
          ))}
          {!loadingDisposals && disposals.length === 0 && <p className="p-4 text-muted-foreground">Chưa có hồ sơ thanh lý.</p>}
        </div>
      </div>
    </div>
  );
}
