import React, { useState, useRef } from 'react';
import { ShoppingCart, X, Printer, Paperclip, FileCheck2, AlertCircle, CalendarClock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useReactToPrint } from 'react-to-print';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../lib/api';
import ProcurementPrintTemplate from '../components/templates/ProcurementPrintTemplate';
import ProcurementPlanPrintTemplate from '../components/templates/ProcurementPlanPrintTemplate';
import { isApproverRole } from '../lib/access';
import type { AuthUser, Procurement, ProcurementItem, ProcurementPlan, Quotation, UploadResponse } from '../lib/types';
import { writeWorkbook } from '../lib/excel';
import { getErrorMessage } from '../lib/errors';
import { getAnnualProcurementDeadlines, isAnnualProcurement, normalizeProcurementYear } from '../lib/procurementTimeline';

const procFormSchema = z.object({
  title: z.string().min(1, 'Vui lòng nhập tiêu đề phiếu đề nghị'),
  requesterName: z.string().min(1, 'Vui lòng nhập tên người yêu cầu'),
  reason: z.string().min(1, 'Vui lòng nhập lý do đề nghị mua sắm'),
});

type ProcFormData = z.infer<typeof procFormSchema>;

interface CreateProcurementPayload {
  title: string;
  reason: string;
  requesterName: string;
  estimatedCost: number;
  items: ProcurementItem[];
  procurementType: 'Định kỳ' | 'Đột xuất';
  targetYear: number;
  attachment: string;
}

interface ProcurementWorkflowPayload {
  status: Procurement['status'];
  hcthOpinion?: string;
  quotations?: Quotation[];
  selectedSupplier?: string;
  contractNumber?: string;
  contractAttachment?: string;
}

interface ProcurementImportPayload {
  receiverName?: string;
  supplier?: string;
  accessories?: string;
  warrantyUntil?: string;
  acceptanceNote?: string;
}

interface CreateProcurementPlanPayload {
  title: string;
  period: string;
  planType: 'Định kỳ' | 'Đột xuất';
  targetYear: number;
  sourceProcurements: string[];
  note?: string;
}

interface OutletCtx {
  user: AuthUser;
}

export default function ProcurementRequest() {
  const { user } = useOutletContext<OutletCtx>();
  const canApprove = isApproverRole(user.role);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const printRef = useRef(null);
  const planPrintRef = useRef(null);
  const [selectedProc, setSelectedProc] = useState<Procurement | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<ProcurementPlan | null>(null);
  const [planningProc, setPlanningProc] = useState<Procurement | null>(null);
  const [handoverProc, setHandoverProc] = useState<Procurement | null>(null);
  const [handoverReceiver, setHandoverReceiver] = useState('');
  const [handoverSupplier, setHandoverSupplier] = useState('');
  const [handoverAccessories, setHandoverAccessories] = useState('');
  const [handoverWarrantyUntil, setHandoverWarrantyUntil] = useState('');
  const [handoverNote, setHandoverNote] = useState('Đã nghiệm thu, bàn giao và hướng dẫn sử dụng theo BM.HCTH.05.03.');
  const [hcthOpinion, setHcthOpinion] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [contractNumber, setContractNumber] = useState('');
  const [contractAttachment, setContractAttachment] = useState('');
  const [quotations, setQuotations] = useState<Quotation[]>([
    { supplier: '', price: 0, attachment: '' },
    { supplier: '', price: 0, attachment: '' },
    { supplier: '', price: 0, attachment: '' },
  ]);
  const [currentYear] = useState(() => new Date().getFullYear());
  const [nowMs] = useState(() => Date.now());
  const [procurementType, setProcurementType] = useState<'Định kỳ' | 'Đột xuất'>('Đột xuất');
  const [targetYear, setTargetYear] = useState(currentYear);
  const [planTitle, setPlanTitle] = useState('Kế hoạch mua sắm thiết bị');
  const [planPeriod, setPlanPeriod] = useState(`${new Date().getFullYear()}`);
  const [planType, setPlanType] = useState<'Định kỳ' | 'Đột xuất'>('Định kỳ');
  const [planTargetYear, setPlanTargetYear] = useState(currentYear);
  const [planNote, setPlanNote] = useState('');
  const queryClient = useQueryClient();

  // Form state (react-hook-form + zod)
  const { register, handleSubmit: handleFormSubmit, reset: resetForm, formState: { errors, isSubmitting: formSubmitting } } = useForm<ProcFormData>({
    resolver: zodResolver(procFormSchema),
    defaultValues: { title: '', requesterName: '', reason: '' }
  });
  const [formItems, setFormItems] = useState<ProcurementItem[]>([{ name: '', unit: 'Cái', quantity: 1, specs: '', estimatedPrice: 0 }]);
  const [formAttachment, setFormAttachment] = useState('');
  const [isUploading, setIsUploading] = useState(false);


  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Phieu_De_Nghi_Mua_Sam',
  });

  const handlePrintPlan = useReactToPrint({
    contentRef: planPrintRef,
    documentTitle: 'Ke_Hoach_Mua_Sam',
  });

  const { data: procurements = [], isLoading } = useQuery({
    queryKey: ['procurements'],
    queryFn: () => api.get<Procurement[]>('/api/procurements')
  });

  const { data: procurementPlans = [] } = useQuery({
    queryKey: ['procurement-plans'],
    queryFn: () => api.get<ProcurementPlan[]>('/api/procurement-plans'),
    enabled: user.role === 'ADMIN' || canApprove,
  });

  const addItemRow = () => {
    setFormItems([...formItems, { name: '', unit: 'Cái', quantity: 1, specs: '', estimatedPrice: 0 }]);
  };

  const updateItem = <K extends keyof ProcurementItem>(index: number, field: K, value: ProcurementItem[K]) => {
    const updated = [...formItems];
    updated[index] = { ...updated[index], [field]: value };
    setFormItems(updated);
  };

  const totalCost = formItems.reduce((sum, item) => sum + (item.quantity * item.estimatedPrice), 0);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.upload<UploadResponse>('/api/upload', formData);
      setFormAttachment(res.url);
      toast.success('Tải tài liệu lên thành công');
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Lỗi tải tài liệu'));
    }
    setIsUploading(false);
  };

  const uploadWorkflowFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.upload<UploadResponse>('/api/upload', formData);
    return res.url;
  };

  const addMutation = useMutation({
    mutationFn: (newProc: CreateProcurementPayload) => api.post<Procurement, CreateProcurementPayload>('/api/procurements', newProc),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procurements'] });
      setIsModalOpen(false);
      resetForm();
      setFormAttachment('');
      setFormItems([{ name: '', unit: 'Cái', quantity: 1, specs: '', estimatedPrice: 0 }]);
      setProcurementType('Đột xuất');
      setTargetYear(currentYear);
      toast.success('Đã gửi phiếu đề nghị mua sắm thành công!');
    },
    onError: () => toast.error('Lỗi gửi phiếu.')
  });

  const onSubmitProc = (data: ProcFormData) => {
    const validItems = formItems
      .filter(i => i.name)
      .map((item) => ({ ...item, unit: item.unit || 'Cái', specs: item.specs || '' }));
    if (validItems.length === 0) return toast.error('Vui lòng nhập ít nhất 1 mặt hàng cần mua');
    addMutation.mutate({
      title: data.title,
      requesterName: data.requesterName,
      reason: data.reason,
      estimatedCost: totalCost,
      items: validItems,
      procurementType,
      targetYear: normalizeProcurementYear(targetYear),
      attachment: formAttachment,
    } satisfies CreateProcurementPayload);
  };

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: ProcurementWorkflowPayload }) => api.put<Procurement, ProcurementWorkflowPayload>(`/api/procurements/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['procurements'] });
      setPlanningProc(null);
      toast.success(`Đã cập nhật trạng thái → ${variables.data.status}`);
    },
    onError: () => toast.error('Lỗi cập nhật.')
  });

  const handleUpdateStatus = async (proc: Procurement, newStatus: Procurement['status']) => {
    updateStatusMutation.mutate({ id: proc._id, data: { status: newStatus } });
  };

  const createPlanMutation = useMutation({
    mutationFn: (payload: CreateProcurementPlanPayload) => api.post<ProcurementPlan, CreateProcurementPlanPayload>('/api/procurement-plans', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procurement-plans'] });
      toast.success('Đã lập kế hoạch mua sắm BM.05.02');
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err, 'Lỗi lập kế hoạch mua sắm.'))
  });

  const planStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ProcurementPlan['status'] }) => api.put<ProcurementPlan, { status: ProcurementPlan['status'] }>(`/api/procurement-plans/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procurement-plans'] });
      queryClient.invalidateQueries({ queryKey: ['procurements'] });
      toast.success('Đã cập nhật kế hoạch mua sắm');
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err, 'Lỗi cập nhật kế hoạch mua sắm.'))
  });

  const openPlanning = (proc: Procurement) => {
    setPlanningProc(proc);
    setHcthOpinion(proc.hcthOpinion || '');
    setSelectedSupplier(proc.selectedSupplier || '');
    setContractNumber(proc.contractNumber || '');
    setContractAttachment(proc.contractAttachment || '');
    setQuotations(proc.quotations?.length ? proc.quotations : [
      { supplier: '', price: 0, attachment: '' },
      { supplier: '', price: 0, attachment: '' },
      { supplier: '', price: 0, attachment: '' },
    ]);
  };

  const submitPlanning = () => {
    if (!planningProc) return;
    updateStatusMutation.mutate({
      id: planningProc._id,
      data: {
        status: 'Đã lập kế hoạch',
        hcthOpinion,
        quotations: quotations.filter((q) => q.supplier && q.price > 0),
        selectedSupplier,
        contractNumber,
        contractAttachment,
      },
    });
  };

  const importMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProcurementImportPayload }) =>
      api.post<{ message: string }, ProcurementImportPayload>(`/api/procurements/${id}/import`, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['procurements'] });
      queryClient.invalidateQueries({ queryKey: ['equipments'] });
      setHandoverProc(null);
      toast.success(data.message || 'Đã nhập kho thành công!');
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err, 'Lỗi khi nhập kho.'))
  });

  const openHandover = (proc: Procurement) => {
    setHandoverProc(proc);
    setHandoverReceiver(proc.requesterName || proc.department);
    setHandoverSupplier(proc.selectedSupplier || '');
    setHandoverAccessories('');
    setHandoverWarrantyUntil('');
    setHandoverNote('Đã nghiệm thu, bàn giao và hướng dẫn sử dụng theo BM.HCTH.05.03.');
  };

  const submitHandover = () => {
    if (!handoverProc) return;
    importMutation.mutate({
      id: handoverProc._id,
      data: {
        receiverName: handoverReceiver,
        supplier: handoverSupplier,
        accessories: handoverAccessories,
        warrantyUntil: handoverWarrantyUntil ? new Date(handoverWarrantyUntil).toISOString() : '',
        acceptanceNote: handoverNote,
      },
    });
  };

  const formatCurrency = (n: number) => n.toLocaleString('vi-VN');
  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('vi-VN') : '';
  const formatDateObj = (d: Date) => d.toLocaleDateString('vi-VN');
  const annualDeadlines = getAnnualProcurementDeadlines(currentYear);
  const annualRequests = procurements.filter((proc) => isAnnualProcurement(proc.procurementType) && (proc.targetYear || currentYear) === currentYear);
  const annualWaiting = annualRequests.filter((proc) => proc.status === 'Chờ duyệt').length;
  const annualPlanned = annualRequests.filter((proc) => proc.status === 'Đã lập kế hoạch').length;
  const annualPlans = procurementPlans.filter((plan) => isAnnualProcurement(plan.planType) && (plan.targetYear || currentYear) === currentYear);
  const annualApprovedPlans = annualPlans.filter((plan) => plan.status === 'TGĐ phê duyệt').length;
  const getDeadlineStyle = (date: Date, done: boolean) => {
    if (done) return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    if (nowMs > date.getTime()) return 'border-red-200 bg-red-50 text-red-800';
    return 'border-blue-200 bg-blue-50 text-blue-800';
  };

  const getStatusStyle = (s: string) => {
    switch (s) {
      case 'Chờ duyệt': return 'bg-yellow-100 text-yellow-700';
      case 'Đã lập kế hoạch': return 'bg-cyan-100 text-cyan-700';
      case 'TGĐ phê duyệt': return 'bg-blue-100 text-blue-700';
      case 'Đang thực hiện': return 'bg-orange-100 text-orange-700';
      case 'Từ chối': return 'bg-red-100 text-red-700';
      case 'Hoàn tất': return 'bg-slate-100 text-slate-700';
      case 'Đã nhập kho': return 'bg-green-100 text-green-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const exportToExcel = async () => {
    const dataToExport = procurements.map((proc) => ({
      'Mã Đề Nghị': proc._id.substring(proc._id.length - 6),
      'Tiêu đề': proc.title,
      'Đơn vị': proc.department,
      'Loại đề nghị': proc.procurementType || 'Đột xuất',
      'Năm kế hoạch': proc.targetYear || '',
      'Hạn gửi định kỳ': proc.submissionDeadline ? formatDate(proc.submissionDeadline) : '',
      'Lý do': proc.reason,
      'Ngày đề nghị': formatDate(proc.requestedDate),
      'Trạng thái': proc.status,
      'Dự toán (VNĐ)': proc.estimatedCost,
      'Số hạng mục': proc.items?.length || 0,
      'Hạng mục': (proc.items || []).map((item) => `${item.name} (${item.unit || 'Cái'} x${item.quantity})`).join('; '),
      'Đặc tính kỹ thuật': (proc.items || []).map((item) => item.specs || '').filter(Boolean).join('; ')
    }));

    await writeWorkbook(
      'De_Nghi_Mua_Sam',
      dataToExport,
      `Danh_sach_mua_sam_${new Date().toISOString().split('T')[0]}.xlsx`,
      [15, 35, 25, 30, 15, 20, 20, 15]
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Đề nghị Mua sắm</h1>
            <p className="text-muted-foreground mt-1">Lập danh sách nhu cầu, tổng hợp kế hoạch mua sắm thiết bị.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
              onClick={exportToExcel}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
          >
            Xuất Excel
          </button>
          <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 h-10 px-4 py-2 shadow-sm transition-colors"
          >
            <ShoppingCart className="mr-2 h-4 w-4" /> Tạo Phiếu Đề nghị
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        <div className={`border rounded-lg p-4 ${getDeadlineStyle(annualDeadlines.noticeDeadline, nowMs > annualDeadlines.noticeDeadline.getTime())}`}>
          <div className="flex items-center gap-2 text-sm font-semibold"><CalendarClock className="w-4 h-4" /> Thông báo nhu cầu</div>
          <p className="text-xs mt-1">Trước {formatDateObj(annualDeadlines.noticeDeadline)}</p>
        </div>
        <div className={`border rounded-lg p-4 ${getDeadlineStyle(annualDeadlines.requestDeadline, annualRequests.length > 0 && annualWaiting === 0)}`}>
          <div className="text-sm font-semibold">ĐVSD gửi BM.05.01</div>
          <p className="text-xs mt-1">Hạn {formatDateObj(annualDeadlines.requestDeadline)} • {annualRequests.length} phiếu năm {currentYear}</p>
        </div>
        <div className={`border rounded-lg p-4 ${getDeadlineStyle(annualDeadlines.planDeadline, annualApprovedPlans > 0)}`}>
          <div className="text-sm font-semibold">HCTH trình BM.05.02</div>
          <p className="text-xs mt-1">Hạn {formatDateObj(annualDeadlines.planDeadline)} • {annualPlanned} phiếu chờ tổng hợp</p>
        </div>
        <div className="border rounded-lg p-4 bg-white">
          <div className="text-sm font-semibold text-slate-800">Kế hoạch năm {currentYear}</div>
          <p className="text-xs text-muted-foreground mt-1">{annualPlans.length} kế hoạch • {annualApprovedPlans} đã duyệt</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {/* Procurement Tickets */}
         <div className="col-span-2 space-y-4">
            <h2 className="text-xl font-semibold">Danh sách Phiếu yêu cầu (BM.05.01)</h2>

            {isLoading ? (
              <div className="text-center text-muted-foreground p-8">Đang tải dữ liệu...</div>
            ) : procurements.length === 0 ? (
              <div className="text-center text-muted-foreground p-8 border rounded-xl bg-card">Chưa có phiếu đề nghị mua sắm nào. Hãy tạo phiếu mới!</div>
            ) : procurements.map((proc) => (
              <div key={proc._id} className="rounded-xl border bg-card p-5 space-y-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex justify-between items-start border-b pb-4">
                   <div>
                      <h3 className="font-bold text-lg text-purple-700">{proc.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{proc.department}{proc.requesterName ? ` - ${proc.requesterName}` : ''} • {formatDate(proc.requestedDate)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {proc.procurementType || 'Đột xuất'}{proc.targetYear ? ` • Năm ${proc.targetYear}` : ''}
                        {proc.submissionDeadline ? ` • Hạn gửi ${formatDate(proc.submissionDeadline)}` : ''}
                      </p>
                   </div>
                   <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getStatusStyle(proc.status)}`}>{proc.status}</span>
                </div>
                <div>
                   <p className="text-sm"><span className="font-medium">Lý do:</span> {proc.reason}</p>
                   <p className="text-sm mt-2"><span className="font-medium">Dự toán:</span> {formatCurrency(proc.estimatedCost)} VNĐ</p>
                </div>
                {proc.items && proc.items.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {proc.items.map((item, i: number) => (
                      <span key={i} className="inline-block mr-2 bg-slate-50 border px-2 py-0.5 rounded">
                        {item.name} ({item.unit || 'Cái'} x{item.quantity}){item.specs ? ` - ${item.specs}` : ''}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex justify-between items-center gap-2 flex-wrap">
                  {/* Approval workflow buttons */}
                  <div className="flex gap-1.5 flex-wrap">
                    {user.role === 'ADMIN' && proc.status === 'Chờ duyệt' && (
                      <button onClick={() => openPlanning(proc)} className="text-xs font-medium bg-cyan-100 text-cyan-700 hover:bg-cyan-200 px-2.5 py-1.5 rounded-md transition-colors">
                        + Lập Kế hoạch
                      </button>
                    )}
                    {canApprove && proc.status === 'Đã lập kế hoạch' && (
                      <>
                        <button onClick={() => handleUpdateStatus(proc, 'TGĐ phê duyệt')} className="text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 px-2.5 py-1.5 rounded-md transition-colors">
                          ✓ Phê duyệt
                        </button>
                        <button onClick={() => handleUpdateStatus(proc, 'Từ chối')} className="text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 px-2.5 py-1.5 rounded-md transition-colors">
                          ✕ Từ chối
                        </button>
                      </>
                    )}
                    {user.role === 'ADMIN' && proc.status === 'TGĐ phê duyệt' && (
                      <button onClick={() => handleUpdateStatus(proc, 'Đang thực hiện')} className="text-xs font-medium bg-orange-100 text-orange-700 hover:bg-orange-200 px-2.5 py-1.5 rounded-md transition-colors">
                        → Tiến hành Mua sắm
                      </button>
                    )}
                    {user.role === 'ADMIN' && proc.status === 'Đang thực hiện' && (
                      <button onClick={() => handleUpdateStatus(proc, 'Hoàn tất')} className="text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 px-2.5 py-1.5 rounded-md transition-colors">
                        → Hoàn tất mua sắm
                      </button>
                    )}
                      {user.role === 'ADMIN' && proc.status === 'Hoàn tất' && (
                        <button onClick={() => openHandover(proc)} disabled={importMutation.isPending} className="inline-flex items-center text-sm font-medium bg-green-600 text-white hover:bg-green-700 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50">
                          {importMutation.isPending ? 'Đang xử lý...' : 'Nghiệm thu & nhập kho'}
                        </button>
                      )}
                    </div>
                  <div className="flex gap-1">
                    {proc.attachment && (
                      <a href={`${api.getBaseUrl()}${proc.attachment}`} target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:bg-slate-50 p-2 rounded-md transition-colors" title="Xem tài liệu đính kèm">
                        <Paperclip className="w-4 h-4" />
                      </a>
                    )}
                    <button onClick={() => { setSelectedProc(proc); setTimeout(() => handlePrint(), 100); }} className="text-blue-600 hover:bg-blue-50 p-2 rounded-md transition-colors" title="In / Xuất PDF Phiếu này">
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
         </div>

         {/* Procurement Plan */}
         <div className="col-span-1 space-y-4">
            <div className="bg-slate-50 border rounded-xl p-5">
               <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-purple-600"/> Kế hoạch Tổng thể (BM.05.02)</h3>
               <p className="text-sm text-muted-foreground mb-4">HCTH tổng hợp các phiếu đề nghị thành kế hoạch mua sắm Quý/Năm.</p>
               {user.role === 'ADMIN' && (
                 <div className="space-y-2 mb-4">
                   <div className="grid grid-cols-2 gap-2">
                     {(['Định kỳ', 'Đột xuất'] as const).map((type) => (
                       <button
                         key={type}
                         type="button"
                         onClick={() => setPlanType(type)}
                         className={`rounded-md border px-3 py-2 text-sm font-medium ${planType === type ? 'border-purple-500 bg-purple-50 text-purple-700' : 'bg-white text-slate-700'}`}
                       >
                         {type}
                       </button>
                     ))}
                   </div>
                   <input value={planTitle} onChange={e => setPlanTitle(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" placeholder="Tên kế hoạch" />
                   <div className="grid grid-cols-2 gap-2">
                     <input value={planPeriod} onChange={e => setPlanPeriod(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" placeholder="Kỳ/Năm" />
                     <input type="number" value={planTargetYear} min={2020} max={2100} onChange={e => setPlanTargetYear(normalizeProcurementYear(e.target.value))} className="w-full border rounded px-3 py-2 text-sm" placeholder="Năm" />
                   </div>
                   <textarea value={planNote} onChange={e => setPlanNote(e.target.value)} className="w-full border rounded px-3 py-2 text-sm min-h-16" placeholder="Ghi chú kế hoạch"></textarea>
                   <button
                     onClick={() => {
                       const sourceProcurements = procurements
                         .filter(p => p.status === 'Đã lập kế hoạch')
                         .filter(p => planType === 'Định kỳ'
                           ? isAnnualProcurement(p.procurementType) && (p.targetYear || currentYear) === planTargetYear
                           : !isAnnualProcurement(p.procurementType))
                         .map(p => p._id);
                       if (sourceProcurements.length === 0) return toast.error('Cần ít nhất 1 phiếu đã lập kế hoạch.');
                       createPlanMutation.mutate({ title: planTitle, period: planPeriod, planType, targetYear: planTargetYear, note: planNote, sourceProcurements });
                     }}
                     className="w-full bg-purple-600 text-white rounded-md py-2 text-sm font-medium hover:bg-purple-700"
                   >
                     Lập BM.05.02 từ phiếu đã thẩm định
                   </button>
                 </div>
               )}

               <div className="space-y-3">
                  {procurementPlans.length > 0 ? procurementPlans.map((plan) => (
                    <div key={plan._id} className="p-3 bg-white border rounded shadow-sm space-y-2">
                       <div className="flex items-center justify-between gap-2">
                         <p className="font-medium text-sm text-blue-700">{plan.title}</p>
                         <span className="text-[11px] rounded-full bg-slate-100 px-2 py-0.5">{plan.status}</span>
                       </div>
                       <p className="text-xs text-muted-foreground mt-1">
                         {plan.period} • {plan.items.length} hạng mục • {plan.totalEstimatedCost.toLocaleString('vi-VN')} VNĐ
                       </p>
                       <p className="text-xs text-muted-foreground">
                         {plan.planType || 'Đột xuất'}{plan.targetYear ? ` • Năm ${plan.targetYear}` : ''}
                         {plan.planningDeadline ? ` • Hạn trình ${formatDate(plan.planningDeadline)}` : ''}
                       </p>
                       <div className="flex gap-1">
                         <button
                           onClick={() => { setSelectedPlan(plan); setTimeout(() => handlePrintPlan(), 100); }}
                           className="text-xs bg-slate-100 text-slate-700 rounded px-2 py-1"
                         >
                           In BM.05.02
                         </button>
                         {user.role === 'ADMIN' && plan.status === 'Đang lập' && (
                           <button onClick={() => planStatusMutation.mutate({ id: plan._id, status: 'Chờ duyệt' })} className="text-xs bg-yellow-100 text-yellow-700 rounded px-2 py-1">Trình duyệt</button>
                         )}
                         {canApprove && plan.status === 'Chờ duyệt' && (
                           <>
                             <button onClick={() => planStatusMutation.mutate({ id: plan._id, status: 'TGĐ phê duyệt' })} className="text-xs bg-blue-100 text-blue-700 rounded px-2 py-1">Duyệt</button>
                             <button onClick={() => planStatusMutation.mutate({ id: plan._id, status: 'Từ chối' })} className="text-xs bg-red-100 text-red-700 rounded px-2 py-1">Từ chối</button>
                           </>
                         )}
                       </div>
                    </div>
                  )) : (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                       <p>Chưa có kế hoạch mua sắm BM.05.02.</p>
                    </div>
                  )}
               </div>
            </div>
         </div>
      </div>

      {planningProc && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl border shadow-lg overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2"><FileCheck2 className="w-5 h-5 text-cyan-600" /> Thẩm định & lập kế hoạch</h2>
              <button onClick={() => setPlanningProc(null)} className="p-1 hover:bg-slate-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-auto">
              <div className="rounded-md bg-slate-50 border p-3 text-sm">
                <p className="font-medium">{planningProc.title}</p>
                <p className="text-muted-foreground">Dự toán: {formatCurrency(planningProc.estimatedCost)} VNĐ</p>
                {planningProc.estimatedCost >= 20000000 ? (
                  <p className="mt-2 flex items-center gap-1 text-orange-700"><AlertCircle className="w-4 h-4" /> Từ 20 triệu: cần hợp đồng.</p>
                ) : (
                  <p className="mt-2 flex items-center gap-1 text-blue-700"><AlertCircle className="w-4 h-4" /> Dưới 20 triệu: cần tối thiểu 03 báo giá.</p>
                )}
              </div>
              <textarea value={hcthOpinion} onChange={e => setHcthOpinion(e.target.value)} className="w-full border rounded px-3 py-2 text-sm min-h-20" placeholder="Ý kiến HCTH, kết quả rà soát hiện trạng/kinh phí..." />
              <div className="space-y-2">
                <p className="font-medium text-sm">Báo giá</p>
                {quotations.map((quote, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2">
                    <input value={quote.supplier} onChange={e => setQuotations(qs => qs.map((q, i) => i === index ? { ...q, supplier: e.target.value } : q))} className="col-span-4 border rounded px-2 py-1 text-sm" placeholder="Nhà cung cấp" />
                    <input type="number" value={quote.price} onChange={e => setQuotations(qs => qs.map((q, i) => i === index ? { ...q, price: parseInt(e.target.value) || 0 } : q))} className="col-span-3 border rounded px-2 py-1 text-sm" placeholder="Giá" />
                    <input type="file" accept=".pdf,image/*" onChange={async e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const url = await uploadWorkflowFile(file);
                        setQuotations(qs => qs.map((q, i) => i === index ? { ...q, attachment: url } : q));
                        toast.success('Đã tải báo giá');
                      } catch (err) {
                        toast.error(getErrorMessage(err, 'Lỗi tải báo giá'));
                      }
                    }} className="col-span-5 text-xs" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)} className="border rounded px-3 py-2 text-sm" placeholder="Nhà cung cấp được chọn" />
                <input value={contractNumber} onChange={e => setContractNumber(e.target.value)} className="border rounded px-3 py-2 text-sm" placeholder="Số hợp đồng nếu có" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">File hợp đồng</label>
                <input type="file" accept=".pdf,image/*" onChange={async e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    setContractAttachment(await uploadWorkflowFile(file));
                    toast.success('Đã tải hợp đồng');
                  } catch (err) {
                    toast.error(getErrorMessage(err, 'Lỗi tải hợp đồng'));
                  }
                }} className="text-sm" />
                {contractAttachment && <p className="text-xs text-green-600">Đã đính kèm hợp đồng.</p>}
              </div>
            </div>
            <div className="p-6 border-t bg-slate-50 flex justify-end gap-2">
              <button onClick={() => setPlanningProc(null)} className="px-4 py-2 text-sm border rounded-md">Hủy</button>
              <button onClick={submitPlanning} className="px-4 py-2 text-sm bg-cyan-600 text-white rounded-md">Lưu & chuyển Đã lập kế hoạch</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tạo Phiếu Đề nghị */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
             <div className="bg-card w-full max-w-2xl rounded-xl border shadow-lg overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b flex justify-between items-center">
                   <h2 className="text-xl font-bold flex items-center gap-2"><ShoppingCart className="text-purple-600 w-5 h-5"/> Tạo Phiếu Đề nghị Mua sắm (BM.05.01)</h2>
                   <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:bg-slate-100 p-1 rounded"><X className="w-5 h-5"/></button>
                </div>
                <form onSubmit={handleFormSubmit(onSubmitProc)}>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-auto">
                   <div className="space-y-2">
                     <label className="text-sm font-medium">Tiêu đề phiếu đề nghị <span className="text-red-500">*</span></label>
                     <input type="text" {...register('title')} className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ${errors.title ? 'border-red-500' : 'border-input'}`} placeholder="VD: Đề nghị mua 5 Laptop Dell mới" />
                     {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2 space-y-2">
                         <label className="text-sm font-medium">Loại đề nghị</label>
                         <div className="grid grid-cols-2 gap-2">
                           {(['Đột xuất', 'Định kỳ'] as const).map((type) => (
                             <button
                               key={type}
                               type="button"
                               onClick={() => setProcurementType(type)}
                               className={`rounded-md border px-3 py-2 text-sm font-medium ${procurementType === type ? 'border-purple-500 bg-purple-50 text-purple-700' : 'bg-white text-slate-700'}`}
                             >
                               {type}
                             </button>
                           ))}
                         </div>
                      </div>
                      <div className="space-y-2">
                         <label className="text-sm font-medium">Năm kế hoạch</label>
                         <input type="number" min={2020} max={2100} value={targetYear} onChange={e => setTargetYear(normalizeProcurementYear(e.target.value))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                      </div>
                   </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <label className="text-sm font-medium">Phòng/Đơn vị</label>
                          <input type="text" value={user.department} disabled className="flex h-10 w-full rounded-md border border-input bg-slate-100 px-3 py-2 text-sm text-muted-foreground" />
                       </div>
                       <div className="space-y-2">
                          <label className="text-sm font-medium">Người yêu cầu <span className="text-red-500">*</span></label>
                          <input type="text" {...register('requesterName')} className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ${errors.requesterName ? 'border-red-500' : 'border-input'}`} placeholder="VD: Nguyễn Văn A" />
                          {errors.requesterName && <p className="text-xs text-red-500">{errors.requesterName.message}</p>}
                       </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Lý do đề nghị mua sắm <span className="text-red-500">*</span></label>
                      <textarea {...register('reason')} className={`flex min-h-[60px] w-full rounded-md border bg-background px-3 py-2 text-sm ${errors.reason ? 'border-red-500' : 'border-input'}`} placeholder="VD: Thay thế máy tính hỏng, mua cho nhân sự mới..."></textarea>
                      {errors.reason && <p className="text-xs text-red-500">{errors.reason.message}</p>}
                   </div>

                    <div className="space-y-2">
                       <label className="text-sm font-medium">Tổng dự toán</label>
                         <div className="flex h-10 w-full rounded-md border border-input bg-slate-50 px-3 py-2 text-sm font-medium text-purple-700">
                           {formatCurrency(totalCost)} VNĐ
                         </div>
                    </div>
                   <div className="space-y-2 border border-dashed p-4 rounded-lg bg-slate-50">
                      <h4 className="text-sm font-semibold mb-2">Danh sách thiết bị cần mua <span className="text-red-500">*</span></h4>
                      <table className="w-full text-sm">
                         <thead className="border-b">
                           <tr>
                             <th className="text-left py-1">Tên/Loại TB</th>
                             <th className="text-left py-1 w-20">ĐVT</th>
                             <th className="text-left py-1 w-20">SL</th>
                             <th className="text-left py-1">Đặc tính kỹ thuật</th>
                             <th className="text-left py-1">Đơn giá (VNĐ)</th>
                           </tr>
                         </thead>
                         <tbody>
                            {formItems.map((item, idx) => (
                              <tr key={idx}>
                                <td className="py-2 pr-2"><input type="text" value={item.name} onChange={e => updateItem(idx, 'name', e.target.value)} className="border rounded px-2 py-1 w-full text-xs" placeholder="Laptop Dell..." /></td>
                                <td className="py-2 pr-2"><input type="text" value={item.unit || 'Cái'} onChange={e => updateItem(idx, 'unit', e.target.value)} className="border rounded px-2 py-1 w-full text-xs" placeholder="Cái" /></td>
                                <td className="py-2 pr-2"><input type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)} className="border rounded px-2 py-1 w-full text-xs" /></td>
                                <td className="py-2 pr-2"><input type="text" value={item.specs || ''} onChange={e => updateItem(idx, 'specs', e.target.value)} className="border rounded px-2 py-1 w-full text-xs" placeholder="Đặc tính kỹ thuật" /></td>
                                <td className="py-2"><input type="number" value={item.estimatedPrice} onChange={e => updateItem(idx, 'estimatedPrice', parseInt(e.target.value) || 0)} className="border rounded px-2 py-1 w-full text-xs" placeholder="20000000" /></td>
                              </tr>
                            ))}
                         </tbody>
                      </table>
                      <button type="button" onClick={addItemRow} className="text-xs text-purple-600 font-medium hover:underline mt-2">+ Thêm dòng</button>
                   </div>

                   <div className="space-y-2">
                      <label className="text-sm font-medium">Đính kèm báo giá (Quy định: Tối thiểu 03 báo giá)</label>
                      <input type="file" accept=".pdf,image/*" onChange={handleFileUpload} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium" />
                      {isUploading && <p className="text-xs text-blue-500">Đang tải tài liệu lên...</p>}
                      {formAttachment && <p className="text-xs text-green-600">Đã đính kèm 1 file tài liệu.</p>}
                   </div>
                </div>
                <div className="p-6 border-t bg-slate-50 flex justify-end gap-2">
                   <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm border rounded-md hover:bg-slate-100">Hủy</button>
                   <button type="submit" disabled={formSubmitting} className="px-4 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50">
                     {formSubmitting ? 'Đang gửi...' : 'Trình HCTH Phê duyệt'}
                   </button>
                </div>
                </form>
             </div>
          </div>
      )}

      {handoverProc && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-xl rounded-xl border shadow-lg overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">Nghiệm thu, bàn giao & nhập kho</h2>
              <button onClick={() => setHandoverProc(null)} className="p-1 hover:bg-slate-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="rounded-md bg-slate-50 border p-3 text-sm">
                <p className="font-medium">{handoverProc.title}</p>
                <p className="text-muted-foreground">{handoverProc.items.length} hạng mục sẽ được tạo thành tài sản.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input value={handoverReceiver} onChange={e => setHandoverReceiver(e.target.value)} className="border rounded px-3 py-2 text-sm" placeholder="Người/đơn vị nhận" />
                <input value={handoverSupplier} onChange={e => setHandoverSupplier(e.target.value)} className="border rounded px-3 py-2 text-sm" placeholder="Nhà cung cấp" />
              </div>
              <input value={handoverAccessories} onChange={e => setHandoverAccessories(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" placeholder="Phụ kiện/tài liệu kèm theo" />
              <div className="space-y-1">
                <label className="text-sm font-medium">Bảo hành đến</label>
                <input type="date" value={handoverWarrantyUntil} onChange={e => setHandoverWarrantyUntil(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <textarea value={handoverNote} onChange={e => setHandoverNote(e.target.value)} className="w-full border rounded px-3 py-2 text-sm min-h-20" placeholder="Ghi chú nghiệm thu/bàn giao" />
            </div>
            <div className="p-6 border-t bg-slate-50 flex justify-end gap-2">
              <button onClick={() => setHandoverProc(null)} className="px-4 py-2 text-sm border rounded-md">Hủy</button>
              <button onClick={submitHandover} disabled={importMutation.isPending} className="px-4 py-2 text-sm bg-green-600 text-white rounded-md disabled:opacity-50">
                {importMutation.isPending ? 'Đang nhập kho...' : 'Xác nhận nhập kho'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ProcurementPrintTemplate selectedProc={selectedProc} printRef={printRef} />
      <ProcurementPlanPrintTemplate selectedPlan={selectedPlan} printRef={planPrintRef} formatCurrency={formatCurrency} />
    </div>
  );
}
