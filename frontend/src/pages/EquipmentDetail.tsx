import { useState, useRef } from 'react';
import { ArrowLeft, Settings, Clock, Wrench, CheckCircle2, AlertTriangle, Package, Calendar, MapPin, QrCode, ClipboardList, FileText } from 'lucide-react';
import { NavLink, useOutletContext, useParams } from 'react-router-dom';

import { useReactToPrint } from 'react-to-print';
import api from '../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import QRPrintTemplate from '../components/templates/QRPrintTemplate';
import HandoverPrintTemplate from '../components/templates/HandoverPrintTemplate';
import type { AuthUser, Equipment, EquipmentHistoryEvent, Repair } from '../lib/types';

interface OutletCtx {
  user: AuthUser;
}

interface MaintenancePayload {
  type: EquipmentHistoryEvent['type'];
  description: string;
}

export default function EquipmentDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useOutletContext<OutletCtx>();
  const qrPrintRef = useRef(null);
  const handoverPrintRef = useRef(null);
  const queryClient = useQueryClient();

  // Maintenance modal state
  const [showMaintModal, setShowMaintModal] = useState(false);
  const [maintType, setMaintType] = useState<EquipmentHistoryEvent['type']>('Bảo dưỡng');
  const [maintDesc, setMaintDesc] = useState('');

  const handlePrintQR = useReactToPrint({
    contentRef: qrPrintRef,
    documentTitle: `QR_Code_${id}`,
  });

  const handlePrintHandover = useReactToPrint({
    contentRef: handoverPrintRef,
    documentTitle: `Bien_Ban_Ban_Giao_${id}`,
  });

  const maintMutation = useMutation({
    mutationFn: (data: MaintenancePayload) => api.post<Equipment, MaintenancePayload>(`/api/equipments/${id}/maintenance`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipments', id] });
      setShowMaintModal(false);
      setMaintDesc('');
      toast.success('Đã ghi nhận bảo dưỡng thành công!');
    },
    onError: () => toast.error('Lỗi ghi nhận.')
  });

  const { data: equipment, isLoading: loadingEq } = useQuery({
    queryKey: ['equipments', id],
    queryFn: () => api.get<Equipment>(`/api/equipments/${id}`)
  });

  const { data: allRepairs = [], isLoading: loadingRep } = useQuery({
    queryKey: ['repairs'],
    queryFn: () => api.get<Repair[]>('/api/repairs')
  });

  const loading = loadingEq || loadingRep;
  const repairs = allRepairs.filter((r) => r.equipmentCode === id);
  const pendingRepairs = repairs.filter((r) => r.status !== 'Đã hoàn thành');
  const history = [...(equipment?.history || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('vi-VN') : '';

  const getAge = (year?: number) => {
    if (!year) return { text: 'Chưa rõ', color: 'text-slate-600' };
    const age = new Date().getFullYear() - year;
    if (age <= 1) return { text: 'Mới (< 1 năm)', color: 'text-green-600' };
    if (age <= 3) return { text: `${age} năm`, color: 'text-blue-600' };
    if (age <= 5) return { text: `${age} năm`, color: 'text-orange-600' };
    return { text: `${age} năm (Cũ)`, color: 'text-red-600' };
  };

  const getStatusColor = (status: string, condition?: number) => {
    switch(status) {
        case 'Tốt': return 'bg-green-100 text-green-700';
        case 'Đang sửa chữa': return 'bg-orange-100 text-orange-700';
        case 'Kém phẩm chất': 
            if (condition !== undefined && condition >= 60) return 'bg-yellow-100 text-yellow-700';
            return 'bg-red-100 text-red-700';
        case 'Thanh lý': return 'bg-slate-100 text-slate-700';
        default: return 'bg-slate-100 text-slate-700';
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center p-16">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
        <p className="text-muted-foreground">Đang tải lý lịch thiết bị...</p>
      </div>
    </div>
  );

  if (!equipment) return (
    <div className="flex flex-col items-center justify-center p-16 space-y-4">
      <AlertTriangle className="w-12 h-12 text-orange-400" />
      <h2 className="text-xl font-bold">Không tìm thấy thiết bị</h2>
      <p className="text-muted-foreground">Mã <span className="font-mono">{id}</span> không tồn tại trong hệ thống.</p>
      <NavLink to="/equipment" className="text-primary hover:underline text-sm font-medium">← Quay về danh sách</NavLink>
    </div>
  );

  const age = getAge(equipment.purchaseYear);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-4">
            <NavLink to="/equipment" className="p-2 border rounded-md hover:bg-slate-50 transition-colors" title="Quay lại danh sách">
               <ArrowLeft className="w-4 h-4" />
            </NavLink>
            <div>
                <div className="flex items-center gap-3">
                   <h1 className="text-2xl font-bold tracking-tight">{equipment.name}</h1>
                   <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(equipment.status, equipment.condition)}`}>
                      {equipment.status} {equipment.condition !== undefined ? `(${equipment.condition}%)` : ''}
                   </span>
                </div>
                <p className="text-muted-foreground mt-1 font-mono text-sm">Mã: {equipment.code}</p>
            </div>
         </div>
         <div className="flex gap-2 flex-wrap">
            {user.role === 'ADMIN' && (
              <button onClick={() => setShowMaintModal(true)} className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2 transition-colors" title="Ghi nhận bảo dưỡng định kỳ">
                 <ClipboardList className="mr-2 h-4 w-4" /> Ghi Bảo dưỡng
              </button>
            )}
            <button onClick={() => handlePrintHandover()} className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 h-10 px-4 py-2 transition-colors" title="In Biên bản bàn giao (BM.05.03)">
               <FileText className="mr-2 h-4 w-4" /> In BB Bàn giao
            </button>
            <button onClick={() => handlePrintQR()} className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 border h-10 px-4 py-2 transition-colors" title="In mã QR dán lên thiết bị">
               <QrCode className="mr-2 h-4 w-4" /> In Tem QR
            </button>
            <NavLink to="/maintenance" className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 h-10 px-4 py-2 transition-colors">
               <Wrench className="mr-2 h-4 w-4" /> Báo hỏng
            </NavLink>
         </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border bg-card p-4 flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg"><Package className="w-5 h-5 text-blue-600" /></div>
          <div>
            <p className="text-xs text-muted-foreground">Loại thiết bị</p>
            <p className="font-medium text-sm">{equipment.name}</p>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4 flex items-center gap-3">
          <div className="p-2 bg-green-50 rounded-lg"><Calendar className="w-5 h-5 text-green-600" /></div>
          <div>
            <p className="text-xs text-muted-foreground">Tuổi thiết bị</p>
            <p className={`font-medium text-sm ${age.color}`}>{age.text}</p>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4 flex items-center gap-3">
          <div className="p-2 bg-purple-50 rounded-lg"><MapPin className="w-5 h-5 text-purple-600" /></div>
          <div>
            <p className="text-xs text-muted-foreground">Đơn vị sử dụng</p>
            <p className="font-medium text-sm">{equipment.department}</p>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4 flex items-center gap-3">
          <div className="p-2 bg-orange-50 rounded-lg"><Wrench className="w-5 h-5 text-orange-600" /></div>
          <div>
            <p className="text-xs text-muted-foreground">Số lần sửa chữa</p>
            <p className="font-medium text-sm">{repairs.length} lần</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {/* Info Card */}
         <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 col-span-1">
            <h3 className="font-semibold leading-none tracking-tight mb-4 flex items-center gap-2">
               <Settings className="w-5 h-5 text-primary" /> Thông tin kỹ thuật
            </h3>
            <div className="space-y-4">
               <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Mã thiết bị</p>
                  <p className="font-mono font-bold text-primary">{equipment.code}</p>
               </div>
               <div>
                  <p className="text-sm text-muted-foreground">Đơn vị sử dụng</p>
                  <p className="font-medium">{equipment.department}</p>
               </div>
               <div>
                  <p className="text-sm text-muted-foreground">Năm đưa vào sử dụng</p>
                  <p className="font-medium">{equipment.purchaseYear}</p>
               </div>
               <div>
                  <p className="text-sm text-muted-foreground">Đặc tính kỹ thuật</p>
                  <p className="font-medium text-sm">{equipment.specs || 'Chưa cập nhật'}</p>
               </div>
               <div>
                  <p className="text-sm text-muted-foreground">Tình trạng hiện tại</p>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold mt-1 ${getStatusColor(equipment.status, equipment.condition)}`}>
                    {equipment.status} {equipment.condition !== undefined ? `(${equipment.condition}%)` : ''}
                  </span>
               </div>
            </div>
         </div>

         {/* History Timeline */}
         <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 col-span-2">
            <h3 className="font-semibold leading-none tracking-tight mb-6 flex items-center gap-2">
               <Clock className="w-5 h-5 text-primary" /> Lý lịch vòng đời thiết bị
            </h3>

            <div className="relative border-l border-slate-200 ml-3 space-y-8">
               {history.map((event, index) => (
                 <div key={event._id || `${event.type}-${event.date}-${index}`} className="relative pl-6">
                   <span className={`absolute -left-[1.35rem] bg-background border p-1.5 rounded-full flex items-center justify-center ${
                     event.type === 'Sửa chữa' ? 'border-orange-200' :
                     event.type === 'Nhập kho' || event.type === 'Nghiệm thu mới' ? 'border-green-200' :
                     'border-blue-200'
                   }`}>
                     {event.type === 'Sửa chữa' ? <Wrench className="w-4 h-4 text-orange-500" /> :
                      event.type === 'Nhập kho' || event.type === 'Nghiệm thu mới' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> :
                      <ClipboardList className="w-4 h-4 text-blue-500" />}
                   </span>
                   <div className="flex justify-between items-start mb-1">
                      <h4 className="font-medium text-blue-600">{event.type}</h4>
                      <span className="text-xs text-muted-foreground bg-slate-100 px-2 py-1 rounded">{formatDate(event.date)}</span>
                   </div>
                   <p className="text-sm text-muted-foreground">{event.description}</p>
                 </div>
               ))}

               {pendingRepairs.map((repair) => (
                 <div key={repair._id} className="relative pl-6">
                   <span className={`absolute -left-[1.35rem] bg-background border p-1.5 rounded-full flex items-center justify-center ${
                     repair.status === 'Đã hoàn thành' ? 'border-green-200' :
                     repair.status === 'Đang sửa chữa' ? 'border-orange-200' :
                     'border-yellow-200'
                   }`}>
                     {repair.status === 'Đã hoàn thành' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> :
                      repair.status === 'Đang sửa chữa' ? <Wrench className="w-4 h-4 text-orange-500" /> :
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                   </span>
                   <div className="flex justify-between items-start mb-1">
                      <h4 className={`font-medium ${
                        repair.status === 'Đã hoàn thành' ? 'text-green-600' :
                        repair.status === 'Đang sửa chữa' ? 'text-orange-600' :
                        'text-yellow-600'
                      }`}>
                        Sửa chữa — {repair.status}
                        <span className="text-xs text-muted-foreground ml-2 font-mono">({repair.reqCode})</span>
                      </h4>
                      <span className="text-xs text-muted-foreground bg-slate-100 px-2 py-1 rounded">{formatDate(repair.requestedDate)}</span>
                   </div>
                   <p className="text-sm text-muted-foreground">{repair.issue}. Đơn vị yêu cầu: {repair.department}</p>
                 </div>
               ))}

               {/* Bàn giao ban đầu */}
               <div className="relative pl-6">
                  <span className="absolute -left-[1.35rem] bg-background border border-green-200 p-1.5 rounded-full flex items-center justify-center">
                     <CheckCircle2 className="w-4 h-4 text-green-500" />
                  </span>
                  <div className="flex justify-between items-start mb-1">
                     <h4 className="font-medium text-green-600">Bàn giao & Nghiệm thu</h4>
                     <span className="text-xs text-muted-foreground bg-slate-100 px-2 py-1 rounded">{equipment.purchaseYear}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Lắp đặt và bàn giao thiết bị cho {equipment.department}. Tình trạng ban đầu: Mới 100%.
                  </p>
               </div>
            </div>

            {repairs.length === 0 && history.length === 0 && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-100 text-center">
                <CheckCircle2 className="w-6 h-6 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-green-700 font-medium">Thiết bị này chưa có lịch sử sửa chữa nào</p>
                <p className="text-xs text-green-600 mt-1">Hoạt động tốt kể từ khi bàn giao.</p>
              </div>
            )}
         </div>
      </div>


      {/* Modal Ghi nhận Bảo dưỡng */}
      {showMaintModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-card w-full max-w-lg rounded-xl border shadow-lg overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b">
                 <h2 className="text-xl font-bold flex items-center gap-2"><ClipboardList className="text-blue-600 w-5 h-5"/> Ghi nhận Bảo dưỡng / Sửa chữa (BM.05.06)</h2>
                 <p className="text-sm text-muted-foreground mt-1">Thiết bị: {equipment.name} ({equipment.code})</p>
              </div>
              <div className="p-6 space-y-4">
                 <div className="space-y-2">
                   <label className="text-sm font-medium">Loại thao tác</label>
                   <select value={maintType} onChange={e => setMaintType(e.target.value as EquipmentHistoryEvent['type'])} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                     <option value="Bảo dưỡng">Bảo dưỡng định kỳ</option>
                     <option value="Sửa chữa">Sửa chữa</option>
                     <option value="Thay thế linh kiện">Thay thế linh kiện</option>
                   </select>
                 </div>
                 <div className="space-y-2">
                   <label className="text-sm font-medium">Nội dung thực hiện</label>
                   <textarea value={maintDesc} onChange={e => setMaintDesc(e.target.value)} className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="VD: Vệ sinh bụi bên trong, thay keo tản nhiệt CPU, kiểm tra ổ cứng..."></textarea>
                 </div>
              </div>
              <div className="p-6 border-t bg-slate-50 flex justify-end gap-2">
                 <button onClick={() => setShowMaintModal(false)} className="px-4 py-2 text-sm border rounded-md hover:bg-slate-100">Hủy</button>
                 <button onClick={() => maintMutation.mutate({ type: maintType, description: maintDesc })} disabled={!maintDesc || maintMutation.isPending} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                   {maintMutation.isPending ? 'Đang lưu...' : 'Ghi nhận'}
                 </button>
              </div>
           </div>
        </div>
      )}

      <HandoverPrintTemplate equipment={equipment} printRef={handoverPrintRef} />
      <QRPrintTemplate equipment={equipment} printRef={qrPrintRef} />
    </div>
  );
}
