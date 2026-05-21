import React, { useState } from 'react';
import { ClipboardList, Plus, X, Printer, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useReactToPrint } from 'react-to-print';
import { useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../lib/api';
import type { AuthUser, MaintenanceItem, MaintenancePlan } from '../lib/types';

const maintFormSchema = z.object({
  title: z.string().min(1, 'Vui lòng nhập tiêu đề kế hoạch'),
  period: z.string().min(1, 'Vui lòng nhập kỳ bảo dưỡng'),
});

type MaintFormData = z.infer<typeof maintFormSchema>;

interface OutletCtx {
  user: AuthUser;
}

interface CreateMaintenancePlanPayload {
  title: string;
  period: string;
  items: Partial<MaintenanceItem>[];
}

export default function MaintenancePlanPage() {
  const { user } = useOutletContext<OutletCtx>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const printRef = React.useRef(null);
  const [selectedPlan, setSelectedPlan] = useState<MaintenancePlan | null>(null);

  // Form state (react-hook-form + zod)
  const { register, handleSubmit: handleFormSubmit, reset: resetForm, formState: { errors } } = useForm<MaintFormData>({
    resolver: zodResolver(maintFormSchema),
    defaultValues: { title: '', period: '' }
  });
  const [formItems, setFormItems] = useState<Partial<MaintenanceItem>[]>([
    { equipmentCode: '', equipmentName: '', department: '', content: '', scheduledDate: '' }
  ]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Ke_Hoach_Bao_Duong',
  });

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['maintenance-plans'],
    queryFn: () => api.get<MaintenancePlan[]>('/api/maintenance-plans')
  });

  const addMutation = useMutation({
    mutationFn: (data: CreateMaintenancePlanPayload) => api.post<MaintenancePlan, CreateMaintenancePlanPayload>('/api/maintenance-plans', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-plans'] });
      setIsModalOpen(false);
      resetForm();
      setFormItems([{ equipmentCode: '', equipmentName: '', department: '', content: '', scheduledDate: '' }]);
      toast.success('Đã tạo kế hoạch bảo dưỡng thành công!');
    },
    onError: () => toast.error('Lỗi tạo kế hoạch.')
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: MaintenancePlan['status'] }) => api.put<MaintenancePlan, { status: MaintenancePlan['status'] }>(`/api/maintenance-plans/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-plans'] });
      toast.success('Đã cập nhật trạng thái!');
    },
    onError: () => toast.error('Lỗi cập nhật trạng thái.')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete<{ message: string }>(`/api/maintenance-plans/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-plans'] });
      toast.success('Đã xóa kế hoạch.');
    },
    onError: () => toast.error('Lỗi xóa kế hoạch.')
  });

  const onSubmitMaint = (data: MaintFormData) => {
    const validItems = formItems.filter(i => i.equipmentCode && i.equipmentName && i.content);
    if (validItems.length === 0) return toast.error('Vui lòng nhập ít nhất 1 thiết bị cần bảo dưỡng');
    addMutation.mutate({
      title: data.title,
      period: data.period,
      items: validItems
    });
  };

  const addItemRow = () => {
    setFormItems([...formItems, { equipmentCode: '', equipmentName: '', department: '', content: '', scheduledDate: '' }]);
  };

  const updateItem = <K extends keyof MaintenanceItem>(index: number, field: K, value: MaintenanceItem[K]) => {
    const updated = [...formItems];
    updated[index] = { ...updated[index], [field]: value };
    setFormItems(updated);
  };

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('vi-VN') : '';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <ClipboardList className="w-8 h-8 text-blue-600" /> Kế hoạch Bảo dưỡng
            </h1>
            <p className="text-muted-foreground mt-1">Lập kế hoạch bảo dưỡng máy móc thiết bị định kỳ (BM.HCTH.05.07)</p>
        </div>
        {user.role === 'ADMIN' && (
          <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2 shadow-sm transition-colors"
          >
            <Plus className="mr-2 h-4 w-4" /> Lập Kế hoạch mới
          </button>
        )}
      </div>

      {/* Plans List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center text-muted-foreground p-8">Đang tải dữ liệu...</div>
        ) : plans.length === 0 ? (
          <div className="text-center text-muted-foreground p-8 border rounded-xl bg-card">
            <ClipboardList className="w-10 h-10 mx-auto mb-3 text-blue-200" />
            <p>Chưa có kế hoạch bảo dưỡng nào. Hãy tạo kế hoạch mới!</p>
          </div>
        ) : plans.map((plan: MaintenancePlan) => (
          <div key={plan._id} className="rounded-xl border bg-card p-5 space-y-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start border-b pb-3">
               <div>
                  <h3 className="font-bold text-lg text-blue-700">{plan.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {plan.period && <span className="mr-2">Kỳ: {plan.period}</span>}
                    • Người lập: {plan.createdBy} • {formatDate(plan.createdAt)}
                  </p>
               </div>
               <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                 plan.status === 'Đang lập' ? 'bg-slate-100 text-slate-700' :
                 plan.status === 'Chờ duyệt' ? 'bg-yellow-100 text-yellow-700' :
                 plan.status === 'TGĐ phê duyệt' ? 'bg-blue-100 text-blue-700' :
                 plan.status === 'Từ chối' ? 'bg-red-100 text-red-700' :
                 'bg-green-100 text-green-700'
               }`}>{plan.status}</span>
            </div>

            {/* Items table */}
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Mã TB</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Tên thiết bị</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground hidden md:table-cell">Nội dung bảo dưỡng</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground hidden lg:table-cell">Thời gian</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {(plan.items || []).map((item, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 px-2 font-mono text-xs">{item.equipmentCode}</td>
                      <td className="py-2 px-2">{item.equipmentName}</td>
                      <td className="py-2 px-2 text-muted-foreground hidden md:table-cell">{item.content}</td>
                      <td className="py-2 px-2 hidden lg:table-cell">{item.scheduledDate ? formatDate(item.scheduledDate) : '—'}</td>
                      <td className="py-2 px-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                          item.status === 'Đã thực hiện' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                        }`}>{item.status || 'Chưa thực hiện'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 items-center">
              {user.role === 'ADMIN' && plan.status === 'Đang lập' && (
                <button onClick={() => updateStatusMutation.mutate({ id: plan._id, status: 'Chờ duyệt' })} className="text-sm font-medium bg-yellow-100 text-yellow-700 hover:bg-yellow-200 px-3 py-1.5 rounded-md transition-colors">Trình duyệt</button>
              )}
              {user.role === 'DIRECTOR' && plan.status === 'Chờ duyệt' && (
                <>
                  <button onClick={() => updateStatusMutation.mutate({ id: plan._id, status: 'TGĐ phê duyệt' })} className="text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1.5 rounded-md transition-colors">✓ Phê duyệt</button>
                  <button onClick={() => updateStatusMutation.mutate({ id: plan._id, status: 'Từ chối' })} className="text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1.5 rounded-md transition-colors">✕ Từ chối</button>
                </>
              )}
              {user.role === 'ADMIN' && plan.status === 'TGĐ phê duyệt' && (
                <button onClick={() => updateStatusMutation.mutate({ id: plan._id, status: 'Đã thực hiện' })} className="text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1.5 rounded-md transition-colors">Hoàn thành BD</button>
              )}
              <button
                onClick={() => { setSelectedPlan(plan); setTimeout(() => handlePrint(), 100); }}
                className="text-blue-600 hover:bg-blue-50 p-2 rounded-md transition-colors" title="In kế hoạch"
              >
                <Printer className="w-4 h-4" />
              </button>
              {user.role === 'ADMIN' && (
                <button
                  onClick={() => { if (confirm(`Xóa kế hoạch "${plan.title}"?`)) deleteMutation.mutate(plan._id); }}
                  className="text-red-600 hover:bg-red-50 p-2 rounded-md transition-colors" title="Xóa"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal Tạo KH */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-card w-full max-w-2xl rounded-xl border shadow-lg overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b flex justify-between items-center">
                 <h2 className="text-xl font-bold flex items-center gap-2"><ClipboardList className="text-blue-600 w-5 h-5"/> Lập Kế hoạch Bảo dưỡng (BM.05.07)</h2>
                 <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:bg-slate-100 p-1 rounded"><X className="w-5 h-5"/></button>
              </div>
              <form onSubmit={handleFormSubmit(onSubmitMaint)}>
               <div className="p-6 space-y-4 max-h-[70vh] overflow-auto">
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <label className="text-sm font-medium">Tiêu đề kế hoạch <span className="text-red-500">*</span></label>
                     <input type="text" {...register('title')} className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ${errors.title ? 'border-red-500' : 'border-input'}`} placeholder="KH bảo dưỡng Quý 2/2026" />
                     {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
                   </div>
                   <div className="space-y-2">
                     <label className="text-sm font-medium">Kỳ bảo dưỡng <span className="text-red-500">*</span></label>
                     <input type="text" {...register('period')} className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ${errors.period ? 'border-red-500' : 'border-input'}`} placeholder="Q2-2026" />
                     {errors.period && <p className="text-xs text-red-500">{errors.period.message}</p>}
                   </div>
                 </div>

                 <div className="space-y-2 border border-dashed p-4 rounded-lg bg-slate-50">
                    <h4 className="text-sm font-semibold mb-2">Danh sách thiết bị cần bảo dưỡng <span className="text-red-500">*</span></h4>
                    <table className="w-full text-sm">
                       <thead className="border-b"><tr>
                         <th className="text-left py-1">Mã TB</th>
                         <th className="text-left py-1">Tên thiết bị</th>
                         <th className="text-left py-1">Nội dung BD</th>
                         <th className="text-left py-1 w-32">Thời gian</th>
                       </tr></thead>
                       <tbody>
                          {formItems.map((item, idx) => (
                            <tr key={idx}>
                              <td className="py-2 pr-2"><input type="text" value={item.equipmentCode || ''} onChange={e => updateItem(idx, 'equipmentCode', e.target.value)} className="border rounded px-2 py-1 w-full text-xs" placeholder="CL.KT-MT-001" /></td>
                              <td className="py-2 pr-2"><input type="text" value={item.equipmentName || ''} onChange={e => updateItem(idx, 'equipmentName', e.target.value)} className="border rounded px-2 py-1 w-full text-xs" placeholder="Máy tính Dell" /></td>
                              <td className="py-2 pr-2"><input type="text" value={item.content || ''} onChange={e => updateItem(idx, 'content', e.target.value)} className="border rounded px-2 py-1 w-full text-xs" placeholder="Vệ sinh, thay keo..." /></td>
                              <td className="py-2"><input type="date" value={item.scheduledDate || ''} onChange={e => updateItem(idx, 'scheduledDate', e.target.value)} className="border rounded px-2 py-1 w-full text-xs" /></td>
                            </tr>
                          ))}
                       </tbody>
                    </table>
                    <button type="button" onClick={addItemRow} className="text-xs text-blue-600 font-medium hover:underline mt-2">+ Thêm dòng</button>
                 </div>
              </div>
              <div className="p-6 border-t bg-slate-50 flex justify-end gap-2">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm border rounded-md hover:bg-slate-100">Hủy</button>
                 <button type="submit" disabled={addMutation.isPending} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                   {addMutation.isPending ? 'Đang lưu...' : 'Tạo Kế hoạch'}
                 </button>
              </div>
              </form>
           </div>
        </div>
      )}

      {/* Hidden Print */}
      <div className="hidden">
         <div ref={printRef} className="p-10 text-black bg-white" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
            <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-8">
               <div className="text-center font-bold">
                  <p>CÔNG TY CỔ PHẦN CẢNG NGHỆ TĨNH</p>
                  <p className="text-sm">BM.HCTH.05.07</p>
               </div>
               <div className="text-center font-bold">
                  <p>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                  <p>Độc lập - Tự do - Hạnh phúc</p>
               </div>
            </div>
            <h1 className="text-xl font-bold text-center mb-8 uppercase">Kế Hoạch Bảo Dưỡng Máy Móc Thiết Bị</h1>
            <p className="mb-4"><span className="font-bold">Kỳ:</span> {selectedPlan?.period || selectedPlan?.title}</p>
            <table className="w-full border-collapse border border-black mb-8">
               <thead><tr className="bg-gray-100">
                  <th className="border border-black p-2 text-center w-12">TT</th>
                  <th className="border border-black p-2 text-left">Tên thiết bị</th>
                  <th className="border border-black p-2 text-left">Mã TB</th>
                  <th className="border border-black p-2 text-left">Đơn vị SD</th>
                  <th className="border border-black p-2 text-left">Nội dung bảo dưỡng</th>
                  <th className="border border-black p-2 text-center">Thời gian</th>
               </tr></thead>
               <tbody>
                  {(selectedPlan?.items || []).map((item, i) => (
                    <tr key={i}>
                       <td className="border border-black p-2 text-center">{i + 1}</td>
                       <td className="border border-black p-2">{item.equipmentName}</td>
                       <td className="border border-black p-2">{item.equipmentCode}</td>
                       <td className="border border-black p-2">{item.department || '—'}</td>
                       <td className="border border-black p-2">{item.content}</td>
                       <td className="border border-black p-2 text-center">{item.scheduledDate ? formatDate(item.scheduledDate) : ''}</td>
                    </tr>
                  ))}
               </tbody>
            </table>
            <div className="grid grid-cols-2 gap-8 mt-12 text-center font-bold">
               <div><p>TRƯỞNG PHÒNG / ĐƠN VỊ</p><p className="font-normal italic text-sm">(Ký, ghi rõ họ tên)</p></div>
               <div><p>NGƯỜI LẬP</p><p className="font-normal italic text-sm">(Ký, ghi rõ họ tên)</p></div>
            </div>
         </div>
      </div>
    </div>
  );
}
