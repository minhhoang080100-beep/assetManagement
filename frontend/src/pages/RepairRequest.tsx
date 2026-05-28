import React, { useState, useRef } from 'react';
import { Search, AlertTriangle, Printer, CheckCircle2, X, Wrench, Clock, Paperclip } from 'lucide-react';
import toast from 'react-hot-toast';
import { useReactToPrint } from 'react-to-print';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../lib/api';
import RepairPrintTemplate from '../components/templates/RepairPrintTemplate';
import { isApproverRole } from '../lib/access';
import type { AuthUser, Repair, UploadResponse } from '../lib/types';
import { getErrorMessage } from '../lib/errors';

const repairFormSchema = z.object({
  equipmentCode: z.string().min(1, 'Vui lòng nhập mã thiết bị'),
  equipmentName: z.string().min(1, 'Vui lòng nhập tên thiết bị'),
  requesterName: z.string().min(1, 'Vui lòng nhập tên người yêu cầu'),
  issue: z.string().min(1, 'Vui lòng mô tả tình trạng lỗi'),
  requestType: z.enum(['Sửa chữa', 'Thay thế linh kiện']),
});

type RepairFormData = z.infer<typeof repairFormSchema>;

interface CreateRepairPayload {
  equipmentCode: string;
  equipmentName: string;
  issue: string;
  requestType: RepairFormData['requestType'];
  requesterName: string;
  attachment: string;
}

interface UpdateRepairPayload {
  status: Repair['status'];
  hcthAssessment?: Repair['hcthAssessment'];
  hcthAssessmentNote?: string;
  hcthProposal?: string;
  solution?: string;
  cost?: number;
  performedBy?: string;
  completedDate?: string;
}

interface OutletCtx {
  user: AuthUser;
}

export default function RepairRequest() {
  const { user } = useOutletContext<OutletCtx>();
  const canApprove = isApproverRole(user.role);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Repair['status']>('all');
  const [selectedRepair, setSelectedRepair] = useState<Repair | null>(null);
  const printRef = useRef(null);
  const queryClient = useQueryClient();

  // Form state (react-hook-form + zod)
  const { register, handleSubmit: handleFormSubmit, reset: resetForm, formState: { errors, isSubmitting: formSubmitting } } = useForm<RepairFormData>({
    resolver: zodResolver(repairFormSchema),
    defaultValues: { equipmentCode: '', equipmentName: '', requesterName: '', issue: '', requestType: 'Sửa chữa' }
  });
  const [formAttachment, setFormAttachment] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Completion modal state (for ADMIN to enter solution/cost when completing repair)
  const [completionRepair, setCompletionRepair] = useState<Repair | null>(null);
  const [completionSolution, setCompletionSolution] = useState('');
  const [completionCost, setCompletionCost] = useState(0);
  const [completionPerformedBy, setCompletionPerformedBy] = useState('');
  const [assessmentRepair, setAssessmentRepair] = useState<Repair | null>(null);
  const [assessmentResult, setAssessmentResult] = useState<Repair['hcthAssessment']>('Đúng thực tế');
  const [assessmentNote, setAssessmentNote] = useState('');
  const [assessmentProposal, setAssessmentProposal] = useState('');


  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Phieu_Bao_Hong',
  });

  const { data: repairs = [], isLoading } = useQuery({
    queryKey: ['repairs'],
    queryFn: () => api.get<Repair[]>('/api/repairs')
  });

  const addMutation = useMutation({
    mutationFn: (newRepair: CreateRepairPayload) => api.post<Repair, CreateRepairPayload>('/api/repairs', newRepair),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repairs'] });
      setIsModalOpen(false);
      resetForm();
      setFormAttachment('');
      toast.success('Đã gửi phiếu yêu cầu sửa chữa thành công!');
    },
    onError: () => toast.error('Lỗi gửi phiếu.')
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.upload<UploadResponse>('/api/upload', formData);
      setFormAttachment(res.url);
      toast.success('Tải ảnh lên thành công');
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Lỗi tải ảnh lên'));
    }
    setIsUploading(false);
  };

  const onSubmitRepair = (data: RepairFormData) => {
    const newRepair = {
      equipmentCode: data.equipmentCode,
      equipmentName: data.equipmentName,
      issue: data.issue,
      requestType: data.requestType,
      requesterName: data.requesterName,
      attachment: formAttachment,
    } satisfies CreateRepairPayload;
    addMutation.mutate(newRepair);
  };

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: UpdateRepairPayload }) => api.put<Repair, UpdateRepairPayload>(`/api/repairs/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repairs'] });
      toast.success(`Đã cập nhật trạng thái phiếu thành công!`);
    },
    onError: () => toast.error('Lỗi cập nhật.')
  });

  const handleUpdateStatus = async (repair: Repair, newStatus: Repair['status']) => {
    if (newStatus === 'Đã hoàn thành') {
      // Open completion modal instead of directly updating
      setCompletionRepair(repair);
      setCompletionSolution('');
      setCompletionCost(0);
      setCompletionPerformedBy('');
      return;
    }
    if (newStatus === 'Đã tiếp nhận') {
      setAssessmentRepair(repair);
      setAssessmentResult(repair.hcthAssessment || 'Đúng thực tế');
      setAssessmentNote(repair.hcthAssessmentNote || '');
      setAssessmentProposal(repair.hcthProposal || 'Kiểm tra thực tế và trình lãnh đạo phê duyệt sửa chữa');
      return;
    }
    updateStatusMutation.mutate({ id: repair._id, data: { status: newStatus } });
  };

  const handleAcceptRepair = () => {
    if (!assessmentRepair) return;
    updateStatusMutation.mutate({
      id: assessmentRepair._id,
      data: {
        status: 'Đã tiếp nhận',
        hcthAssessment: assessmentResult || 'Đúng thực tế',
        hcthAssessmentNote: assessmentNote,
        hcthProposal: assessmentProposal,
      },
    });
    setAssessmentRepair(null);
  };

  const handleCompleteRepair = () => {
    if (!completionRepair) return;
    updateStatusMutation.mutate({
      id: completionRepair._id,
      data: {
        status: 'Đã hoàn thành',
        solution: completionSolution,
        cost: completionCost,
        performedBy: completionPerformedBy,
        completedDate: new Date().toISOString()
      }
    });
    setCompletionRepair(null);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  const filtered = repairs.filter((item) => {
    const matchSearch = (item.reqCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.equipmentName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.equipmentCode || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusCounts: Record<'all' | Repair['status'], number> = {
    all: repairs.length,
    'Chờ duyệt': repairs.filter((r) => r.status === 'Chờ duyệt').length,
    'Đã tiếp nhận': repairs.filter((r) => r.status === 'Đã tiếp nhận').length,
    'TGĐ phê duyệt': repairs.filter((r) => r.status === 'TGĐ phê duyệt').length,
    'Từ chối': repairs.filter((r) => r.status === 'Từ chối').length,
    'Đang sửa chữa': repairs.filter((r) => r.status === 'Đang sửa chữa').length,
    'Đã hoàn thành': repairs.filter((r) => r.status === 'Đã hoàn thành').length,
  };

  const statusTabs: Array<{ key: 'all' | Repair['status']; label: string; color: string }> = [
    { key: 'all', label: 'Tất cả', color: 'bg-slate-100 text-slate-700 hover:bg-slate-200' },
    { key: 'Chờ duyệt', label: 'Chờ duyệt', color: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' },
    { key: 'Đã tiếp nhận', label: 'Đã tiếp nhận', color: 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100' },
    { key: 'TGĐ phê duyệt', label: 'TGĐ duyệt', color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
    { key: 'Từ chối', label: 'Từ chối', color: 'bg-red-50 text-red-700 hover:bg-red-100' },
    { key: 'Đang sửa chữa', label: 'Đang sửa', color: 'bg-orange-50 text-orange-700 hover:bg-orange-100' },
    { key: 'Đã hoàn thành', label: 'Hoàn thành', color: 'bg-green-50 text-green-700 hover:bg-green-100' },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Chờ duyệt': return <Clock className="w-3.5 h-3.5" />;
      case 'Đã tiếp nhận': return <CheckCircle2 className="w-3.5 h-3.5" />;
      case 'TGĐ phê duyệt': return <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />;
      case 'Đang sửa chữa': return <Wrench className="w-3.5 h-3.5" />;
      case 'Đã hoàn thành': return <CheckCircle2 className="w-3.5 h-3.5" />;
      case 'Từ chối': return <X className="w-3.5 h-3.5" />;
      default: return null;
    }
  };


  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Yêu cầu Sửa chữa</h1>
            <p className="text-muted-foreground mt-1">Tiếp nhận, xử lý sự cố thiết bị từ các phòng ban.</p>
        </div>
        <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 h-10 px-4 py-2 shadow-sm transition-colors"
        >
          <AlertTriangle className="mr-2 h-4 w-4" /> Báo hỏng Thiết bị
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${statusFilter === tab.key ? tab.color + ' ring-2 ring-offset-1 ring-slate-300' : tab.color + ' opacity-60'}`}
          >
            {tab.key !== 'all' && getStatusIcon(tab.key)}
            {tab.label}
            <span className="text-xs opacity-60">({statusCounts[tab.key]})</span>
          </button>
        ))}
      </div>

      <div className="flex gap-4">
         <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm theo mã SC, thiết bị..."
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
         </div>
      </div>

      <div className="rounded-md border bg-card">
        <div className="w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                    <tr className="border-b bg-muted/50">
                        <th className="h-12 px-4 text-left font-medium text-muted-foreground">Mã YC</th>
                        <th className="h-12 px-4 text-left font-medium text-muted-foreground">Thiết bị</th>
                        <th className="h-12 px-4 text-left font-medium text-muted-foreground hidden md:table-cell">Mô tả sự cố</th>
                        <th className="h-12 px-4 text-left font-medium text-muted-foreground hidden lg:table-cell">Đơn vị</th>
                        <th className="h-12 px-4 text-left font-medium text-muted-foreground">Ngày YC</th>
                        <th className="h-12 px-4 text-left font-medium text-muted-foreground">Trạng thái</th>
                        <th className="h-12 px-4 text-right font-medium text-muted-foreground">Thao tác</th>
                    </tr>
                </thead>
                <tbody>
                    {isLoading ? (
                        <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                            Đang tải dữ liệu...
                          </div>
                        </td></tr>
                    ) : filtered.length === 0 ? (
                        <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Chưa có phiếu yêu cầu sửa chữa nào.</td></tr>
                    ) : filtered.map((item) => {
                        return (
                        <tr key={item._id} className="border-b transition-colors hover:bg-muted/50">
                            <td className="p-4 font-mono font-medium text-sm">{item.reqCode}</td>
                            <td className="p-4">
                                <div className="font-medium">{item.equipmentName}</div>
                                <div className="text-xs text-muted-foreground">{item.equipmentCode}</div>
                            </td>
                            <td className="p-4 text-muted-foreground hidden md:table-cell max-w-[200px] truncate">{item.issue}</td>
                            <td className="p-4 hidden lg:table-cell text-sm">
                              <div>{item.department}</div>
                              {item.requesterName && <div className="text-xs text-muted-foreground">{item.requesterName}</div>}
                            </td>
                            <td className="p-4 text-sm">{formatDate(item.requestedDate)}</td>
                            <td className="p-4">
                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                    item.status === 'Chờ duyệt' ? 'bg-yellow-100 text-yellow-700' :
                                    item.status === 'Đã tiếp nhận' ? 'bg-cyan-100 text-cyan-700' :
                                    item.status === 'TGĐ phê duyệt' ? 'bg-blue-100 text-blue-700' :
                                    item.status === 'Từ chối' ? 'bg-red-100 text-red-700' :
                                    item.status === 'Đang sửa chữa' ? 'bg-orange-100 text-orange-700' :
                                    'bg-green-100 text-green-700'
                                }`}>
                                    {getStatusIcon(item.status)}
                                    {item.status}
                                </span>
                                {(item.cost || 0) > 0 && item.status === 'Đã hoàn thành' && (
                                  <span className="ml-1 text-xs text-muted-foreground">{(item.cost || 0).toLocaleString('vi-VN')}đ</span>
                                )}
                            </td>
                            <td className="p-4 text-right">
                                <div className="flex justify-end gap-1">
                                  {user.role === 'ADMIN' && item.status === 'Chờ duyệt' && (
                                    <button onClick={() => handleUpdateStatus(item, 'Đã tiếp nhận')} className="text-xs font-medium px-2.5 py-1.5 rounded-md bg-cyan-100 text-cyan-700 hover:bg-cyan-200 transition-colors">→ Tiếp nhận</button>
                                  )}
                                  {canApprove && item.status === 'Đã tiếp nhận' && (
                                    <>
                                      <button onClick={() => handleUpdateStatus(item, 'TGĐ phê duyệt')} className="text-xs font-medium px-2.5 py-1.5 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors">✓ Phê duyệt</button>
                                      <button onClick={() => handleUpdateStatus(item, 'Từ chối')} className="text-xs font-medium px-2.5 py-1.5 rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition-colors">✕ Từ chối</button>
                                    </>
                                  )}
                                  {user.role === 'ADMIN' && item.status === 'TGĐ phê duyệt' && (
                                    <button onClick={() => handleUpdateStatus(item, 'Đang sửa chữa')} className="text-xs font-medium px-2.5 py-1.5 rounded-md bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors">→ Tổ chức thực hiện</button>
                                  )}
                                  {user.role === 'ADMIN' && item.status === 'Đang sửa chữa' && (
                                    <button onClick={() => handleUpdateStatus(item, 'Đã hoàn thành')} className="text-xs font-medium px-2.5 py-1.5 rounded-md bg-green-100 text-green-700 hover:bg-green-200 transition-colors">→ Hoàn thành</button>
                                  )}
                                  {item.attachment && (
                                    <a
                                      href={`${api.getBaseUrl()}${item.attachment}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-2 hover:bg-slate-100 rounded-md text-slate-500 transition-colors"
                                      title="Xem file đính kèm"
                                    >
                                      <Paperclip className="w-4 h-4" />
                                    </a>
                                  )}
                                  <button onClick={() => { setSelectedRepair(item); setTimeout(() => handlePrint(), 100); }} className="p-2 hover:bg-slate-100 rounded-md text-slate-500 transition-colors" title="In phiếu">
                                      <Printer className="w-4 h-4"/>
                                  </button>
                                </div>
                            </td>
                        </tr>
                      );
                    })}
                </tbody>
            </table>
        </div>
      </div>

      {/* Modal Báo hỏng */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
             <div className="bg-card w-full max-w-lg rounded-xl border shadow-lg overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b">
                   <h2 className="text-xl font-bold flex items-center gap-2"><AlertTriangle className="text-orange-500 w-5 h-5"/> Gửi Phiếu Yêu cầu Sửa chữa (BM.05.04)</h2>
                </div>
                <form onSubmit={handleFormSubmit(onSubmitRepair)}>
                <div className="p-6 space-y-4">
                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                       <label className="text-sm font-medium">Mã thiết bị <span className="text-red-500">*</span></label>
                       <input type="text" {...register('equipmentCode')} className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ${errors.equipmentCode ? 'border-red-500 focus:ring-red-500' : 'border-input'}`} placeholder="VD: CL.KT-MT-001" />
                       {errors.equipmentCode && <p className="text-xs text-red-500">{errors.equipmentCode.message}</p>}
                     </div>
                     <div className="space-y-2">
                       <label className="text-sm font-medium">Tên thiết bị <span className="text-red-500">*</span></label>
                       <input type="text" {...register('equipmentName')} className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ${errors.equipmentName ? 'border-red-500 focus:ring-red-500' : 'border-input'}`} placeholder="Máy tính Dell..." />
                       {errors.equipmentName && <p className="text-xs text-red-500">{errors.equipmentName.message}</p>}
                     </div>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                       <label className="text-sm font-medium">Đơn vị yêu cầu</label>
                       <input type="text" value={user.department} disabled className="flex h-10 w-full rounded-md border border-input bg-slate-100 px-3 py-2 text-sm text-muted-foreground" />
                     </div>
                     <div className="space-y-2">
                       <label className="text-sm font-medium">Người yêu cầu <span className="text-red-500">*</span></label>
                       <input type="text" {...register('requesterName')} className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ${errors.requesterName ? 'border-red-500 focus:ring-red-500' : 'border-input'}`} placeholder="VD: Nguyễn Văn A" />
                       {errors.requesterName && <p className="text-xs text-red-500">{errors.requesterName.message}</p>}
                     </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-sm font-medium">Mô tả tình trạng lỗi <span className="text-red-500">*</span></label>
                      <textarea {...register('issue')} className={`flex min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm ${errors.issue ? 'border-red-500 focus:ring-red-500' : 'border-input'}`} placeholder="Máy tính khởi động không lên màn hình..."></textarea>
                      {errors.issue && <p className="text-xs text-red-500">{errors.issue.message}</p>}
                   </div>
                   <div className="space-y-2">
                      <label className="text-sm font-medium">Đề nghị của đơn vị</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="radio" value="Sửa chữa" {...register('requestType')} className="accent-orange-500" />
                          Sửa chữa
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="radio" value="Thay thế linh kiện" {...register('requestType')} className="accent-orange-500" />
                          Thay thế linh kiện
                        </label>
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-sm font-medium">Đính kèm ảnh tình trạng (Tùy chọn)</label>
                     <input type="file" accept="image/*" onChange={handleFileUpload} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium" />
                     {isUploading && <p className="text-xs text-blue-500">Đang tải ảnh lên...</p>}
                     {formAttachment && <p className="text-xs text-green-600">Đã đính kèm 1 file ảnh.</p>}
                   </div>
                </div>
                <div className="p-6 border-t bg-slate-50 flex justify-end gap-2">
                   <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm border rounded-md hover:bg-slate-100">Hủy</button>
                   <button type="submit" disabled={formSubmitting} className="px-4 py-2 text-sm bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50">
                     {formSubmitting ? 'Đang gửi...' : 'Gửi Yêu Cầu'}
                   </button>
                </div>
                </form>
             </div>
          </div>
      )}

      {/* Modal Tiếp nhận / Thẩm định HCTH */}
      {assessmentRepair && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-card w-full max-w-lg rounded-xl border shadow-lg overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b">
                 <h2 className="text-xl font-bold flex items-center gap-2"><CheckCircle2 className="text-cyan-500 w-5 h-5"/> Tiếp nhận và thẩm định HCTH</h2>
                 <p className="text-sm text-muted-foreground mt-1">Phiếu {assessmentRepair.reqCode} — {assessmentRepair.equipmentName}</p>
              </div>
              <div className="p-6 space-y-4">
                 <div className="space-y-2">
                   <label className="text-sm font-medium">Kết quả kiểm tra thực tế</label>
                   <div className="flex gap-4">
                     <label className="flex items-center gap-2 text-sm cursor-pointer">
                       <input
                         type="radio"
                         value="Đúng thực tế"
                         checked={assessmentResult === 'Đúng thực tế'}
                         onChange={() => setAssessmentResult('Đúng thực tế')}
                         className="accent-cyan-600"
                       />
                       Đúng thực tế
                     </label>
                     <label className="flex items-center gap-2 text-sm cursor-pointer">
                       <input
                         type="radio"
                         value="Khác"
                         checked={assessmentResult === 'Khác'}
                         onChange={() => setAssessmentResult('Khác')}
                         className="accent-cyan-600"
                       />
                       Khác
                     </label>
                   </div>
                 </div>
                 <div className="space-y-2">
                   <label className="text-sm font-medium">Ghi chú thẩm định</label>
                   <textarea
                     value={assessmentNote}
                     onChange={(event) => setAssessmentNote(event.target.value)}
                     className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                     placeholder="Ghi nhận hiện trạng, nguyên nhân sơ bộ..."
                   />
                 </div>
                 <div className="space-y-2">
                   <label className="text-sm font-medium">Đề xuất hướng giải quyết</label>
                   <textarea
                     value={assessmentProposal}
                     onChange={(event) => setAssessmentProposal(event.target.value)}
                     className="flex min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                     placeholder="Đề xuất sửa chữa, thay thế linh kiện hoặc hướng xử lý khác..."
                   />
                 </div>
              </div>
              <div className="p-6 border-t bg-slate-50 flex justify-end gap-2">
                 <button onClick={() => setAssessmentRepair(null)} className="px-4 py-2 text-sm border rounded-md hover:bg-slate-100">Hủy</button>
                 <button onClick={handleAcceptRepair} className="px-4 py-2 text-sm bg-cyan-600 text-white rounded-md hover:bg-cyan-700">
                   Xác nhận tiếp nhận
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Modal Hoàn thành Sửa chữa */}
      {completionRepair && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-card w-full max-w-lg rounded-xl border shadow-lg overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b">
                 <h2 className="text-xl font-bold flex items-center gap-2"><CheckCircle2 className="text-green-500 w-5 h-5"/> Xác nhận Hoàn thành Sửa chữa</h2>
                 <p className="text-sm text-muted-foreground mt-1">Phiếu {completionRepair.reqCode} — {completionRepair.equipmentName}</p>
              </div>
              <div className="p-6 space-y-4">
                 <div className="space-y-2">
                   <label className="text-sm font-medium">Giải pháp / Nội dung đã xử lý</label>
                   <textarea value={completionSolution} onChange={e => setCompletionSolution(e.target.value)} className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="VD: Thay ổ cứng SSD 256GB, cài lại Windows 11..."></textarea>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <label className="text-sm font-medium">Chi phí sửa chữa (VNĐ)</label>
                     <input type="number" value={completionCost} onChange={e => setCompletionCost(parseInt(e.target.value) || 0)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="500000" />
                   </div>
                   <div className="space-y-2">
                     <label className="text-sm font-medium">Người/Đơn vị thực hiện</label>
                     <input type="text" value={completionPerformedBy} onChange={e => setCompletionPerformedBy(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Phòng HCTH" />
                   </div>
                 </div>
              </div>
              <div className="p-6 border-t bg-slate-50 flex justify-end gap-2">
                 <button onClick={() => setCompletionRepair(null)} className="px-4 py-2 text-sm border rounded-md hover:bg-slate-100">Hủy</button>
                 <button onClick={handleCompleteRepair} className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700">
                   Xác nhận Hoàn thành
                 </button>
              </div>
           </div>
        </div>
      )}

      <RepairPrintTemplate selectedRepair={selectedRepair} printRef={printRef} />
    </div>
  );
}
