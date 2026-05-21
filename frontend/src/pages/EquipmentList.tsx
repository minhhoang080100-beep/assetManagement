import React, { useState } from 'react';
import { Search, Plus, Edit, Trash2, Eye, Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { NavLink, useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { FLAT_DEPARTMENTS, UNIT_CODE_MAP, DEPT_CODE_MAP, EQUIPMENT_TYPE_MAP } from '../lib/constants';
import type { AuthUser, Equipment } from '../lib/types';
import { readWorkbookRows, writeWorkbook } from '../lib/excel';
import { getErrorMessage } from '../lib/errors';

interface OutletCtx {
  user: AuthUser;
}

interface CreateEquipmentPayload {
  name: string;
  specs: string;
  department: string;
  typeCode: string;
  status: 'Tốt';
  purchaseYear: number;
}

const ITEMS_PER_PAGE = 20;

export default function EquipmentList() {
  const { user } = useOutletContext<OutletCtx>();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Form state
  const [formName, setFormName] = useState('');
  const [formSpecs, setFormSpecs] = useState('');
  const [formDept, setFormDept] = useState(FLAT_DEPARTMENTS[0]);
  const [formType, setFormType] = useState('MT');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editEquip, setEditEquip] = useState<Equipment | null>(null);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editSpecs, setEditSpecs] = useState('');
  const [editStatus, setEditStatus] = useState<Equipment['status']>('Tốt');
  const [editDept, setEditDept] = useState('');



  const queryClient = useQueryClient();

  const { data: allEquipments = [], isLoading } = useQuery({
    queryKey: ['equipments'],
    queryFn: () => api.get<Equipment[]>('/api/equipments')
  });

  const equipments = React.useMemo(() => {
    if (user.role === 'ADMIN') return allEquipments;
    const deptKeywords = user.department.toLowerCase().split(/[\s\-–]+/).filter((w: string) => w.length > 2);
    return allEquipments.filter((eq: Equipment) => {
      const eqDept = (eq.department || '').toLowerCase();
      return deptKeywords.some((kw: string) => eqDept.includes(kw));
    });
  }, [allEquipments, user]);

  // --- Departments list (dynamic) ---
  const departments = Array.from(new Set(equipments.map((e) => e.department).filter(Boolean))).sort();

  // --- Search + Filter + Pagination ---
  const searched = equipments.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.department || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchDept = deptFilter === 'all' || item.department === deptFilter;
    const matchStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchSearch && matchDept && matchStatus;
  });
  const totalPages = Math.ceil(searched.length / ITEMS_PER_PAGE);
  const safePage = Math.min(currentPage, totalPages || 1);
  const paged = searched.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  // --- Add Equipment ---
  const getDeptPrefix = (dept: string) => {
    const [unitName, deptName] = dept.split(' - ');
    const unitCode = UNIT_CODE_MAP[unitName] || 'CNT';
    const deptCode = DEPT_CODE_MAP[deptName] || 'KH';
    return `${unitCode}.${deptCode}`;
  };

  const generateCode = () => {
    const year = new Date().getFullYear().toString().slice(-2);
    const prefix = `${getDeptPrefix(formDept)}-${formType}.${year}`;
    const existing = equipments.filter((e) => e.code.startsWith(prefix));
    const nextSeq = String(existing.length + 1).padStart(3, '0');
    return `${prefix}-${nextSeq}`;
  };

  const addMutation = useMutation({
    mutationFn: (newEquip: CreateEquipmentPayload) => api.post<Equipment, CreateEquipmentPayload>('/api/equipments', newEquip),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['equipments'] });
      setIsAddModalOpen(false);
      setFormName(''); setFormSpecs('');
      toast.success(`Đã thêm thiết bị ${data.code} thành công!`);
    },
    onError: () => toast.error('Lỗi khi thêm thiết bị.'),
    onSettled: () => setFormSubmitting(false)
  });

  const handleAddEquipment = async () => {
    if (!formName) return;
    setFormSubmitting(true);
    const newEquip = {
      name: formName,
      specs: formSpecs,
      department: formDept,
      typeCode: formType,
      status: 'Tốt',
      purchaseYear: new Date().getFullYear(),
    } satisfies CreateEquipmentPayload;
    addMutation.mutate(newEquip);
  };

  // --- Edit Equipment ---
  const openEdit = (equip: Equipment) => {
    setEditEquip(equip);
    setEditName(equip.name);
    setEditSpecs(equip.specs || '');
    setEditStatus(equip.status);
    setEditDept(equip.department || '');
  };

  const editMutation = useMutation({
    mutationFn: ({ code, data }: { code: string, data: Partial<Equipment> }) => api.put<Equipment, Partial<Equipment>>(`/api/equipments/${code}`, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['equipments'] });
      setEditEquip(null);
      toast.success(`Đã cập nhật ${data.code} thành công!`);
    },
    onError: () => toast.error('Lỗi khi cập nhật.'),
    onSettled: () => setFormSubmitting(false)
  });

  const handleSaveEdit = async () => {
    if (!editEquip) return;
    setFormSubmitting(true);
    editMutation.mutate({
      code: editEquip.code,
      data: { name: editName, specs: editSpecs, status: editStatus, department: editDept }
    });
  };

  // --- Delete Equipment ---
  const deleteMutation = useMutation({
    mutationFn: (code: string) => api.delete(`/api/equipments/${code}`),
    onSuccess: (_, code) => {
      queryClient.invalidateQueries({ queryKey: ['equipments'] });
      toast.success(`Đã xóa ${code} thành công.`);
    },
    onError: () => toast.error('Lỗi khi xóa thiết bị.')
  });

  const handleDelete = async (equip: Equipment) => {
    if (!confirm(`Bạn có chắc muốn xóa thiết bị "${equip.name}" (${equip.code})?`)) return;
    deleteMutation.mutate(equip.code);
  };

  const exportToExcel = async () => {
    const dataToExport = equipments.map((eq) => ({
      'Mã Thiết Bị': eq.code,
      'Tên Thiết Bị': eq.name,
      'Cấu hình/Thông số': eq.specs || '',
      'Đơn vị sử dụng': eq.department,
      'Trạng thái': eq.status,
      'Phẩm chất (%)': eq.condition !== undefined ? eq.condition : 100,
      'Năm sử dụng': eq.purchaseYear ?? null
    }));

    await writeWorkbook(
      'Tai_San',
      dataToExport,
      `Danh_sach_tai_san_${new Date().toISOString().split('T')[0]}.xlsx`,
      [15, 25, 40, 25, 15, 15, 15]
    );
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const importFile = async () => {
      try {
        const data = await readWorkbookRows(file);
        const itemsToImport = data.map((row) => ({
          code: String(row['Mã Thiết Bị'] || row['Mã'] || '').trim(),
          name: String(row['Tên Thiết Bị'] || row['Tên'] || 'Không tên').trim(),
          specs: String(row['Cấu hình/Thông số'] || row['Thông số'] || '').trim(),
          department: String(row['Đơn vị sử dụng'] || row['Đơn vị'] || 'Hành chính Tổng hợp').trim(),
          status: String(row['Trạng thái'] || 'Tốt').trim() as Equipment['status'],
          condition: row['Phẩm chất (%)'] !== null && row['Phẩm chất (%)'] !== undefined ? Number(row['Phẩm chất (%)']) : 100,
          purchaseYear: row['Năm sử dụng'] ? Number(row['Năm sử dụng']) : Number(row['Năm mua'] || new Date().getFullYear()),
        })).filter((item) => item.code && item.name);

        const res = await api.post<{ message?: string; count?: number }, typeof itemsToImport>('/api/equipments/bulk', itemsToImport);
        toast.success(res.message || `Đã nhập thành công ${res.count || itemsToImport.length} thiết bị!`);
        queryClient.invalidateQueries({ queryKey: ['equipments'] });
      } catch (err: unknown) {
        toast.error(getErrorMessage(err, 'Lỗi khi nhập dữ liệu.'));
      }
    };

    importFile();
    e.target.value = '';
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

  return (
    <div className="space-y-6">

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Quản lý Thiết bị</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-muted-foreground">
                {isLoading ? 'Đang tải...' : `${searched.length} thiết bị`}
                {searchTerm && ` (lọc từ ${equipments.length})`}
              </p>
              {user.role !== 'ADMIN' && (
                <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  <Shield className="w-3 h-3" /> {user.department}
                </span>
              )}
            </div>
        </div>
        <div className="flex items-center gap-2">
          {user.role === 'ADMIN' && (
            <div className="relative">
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleImportExcel}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                title="Nhập dữ liệu từ file Excel"
              />
              <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
                Nhập Excel
              </button>
            </div>
          )}
          <button
              onClick={exportToExcel}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
          >
            Xuất Excel
          </button>
          {user.role === 'ADMIN' && (
            <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              <Plus className="mr-2 h-4 w-4" /> Thêm Thiết bị
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
         <div className="flex gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:max-w-xs">
               <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
               <input
                   type="text"
                   placeholder="Tìm theo mã, tên..."
                   className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm pl-9 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                   value={searchTerm}
                   onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
               />
            </div>
            <select
               value={deptFilter}
               onChange={(e) => { setDeptFilter(e.target.value); setCurrentPage(1); }}
               className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-w-[180px]"
            >
               <option value="all">Tất cả đơn vị ({equipments.length})</option>
               {departments.map(d => (
                 <option key={d} value={d}>{d} ({equipments.filter((e) => e.department === d).length})</option>
               ))}
            </select>
            <select
               value={statusFilter}
               onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
               className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-w-[150px]"
            >
               <option value="all">Tất cả trạng thái</option>
               <option value="Tốt">✅ Tốt</option>
               <option value="Đang sửa chữa">🔧 Đang sửa chữa</option>
               <option value="Kém phẩm chất">⚠️ Kém phẩm chất</option>
               <option value="Thanh lý">🗑️ Thanh lý</option>
            </select>
         </div>
         <p className="text-sm text-muted-foreground whitespace-nowrap">
           Trang {safePage}/{totalPages || 1} • Hiển thị {paged.length}/{searched.length}
         </p>
      </div>

      <div className="rounded-md border bg-card">
        <div className="w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                    <tr className="border-b transition-colors hover:bg-muted/50">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Mã Thiết Bị</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Tên Thiết Bị</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground hidden md:table-cell">Đặc tính kỹ thuật</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground hidden lg:table-cell">Đơn vị sử dụng</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Tình trạng</th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Thao tác</th>
                    </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                    {isLoading ? (
                        <tr>
                            <td colSpan={6} className="p-8 text-center text-muted-foreground">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                Đang tải dữ liệu từ máy chủ...
                              </div>
                            </td>
                        </tr>
                    ) : paged.map((item) => (
                        <tr key={item._id || item.id} className="border-b transition-colors hover:bg-muted/50">
                            <td className="p-4 align-middle font-mono font-medium text-sm">{item.code}</td>
                            <td className="p-4 align-middle">{item.name}</td>
                            <td className="p-4 align-middle text-muted-foreground hidden md:table-cell text-sm">{item.specs || '—'}</td>
                            <td className="p-4 align-middle hidden lg:table-cell text-sm">{item.department}</td>
                            <td className="p-4 align-middle">
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(item.status, item.condition)}`}>
                                    {item.status} {item.condition !== undefined ? `(${item.condition}%)` : ''}
                                </span>
                            </td>
                            <td className="p-4 align-middle text-right">
                                <div className="flex justify-end gap-1">
                                    <NavLink to={`/equipment/${item.code}`} className="p-2 hover:bg-slate-100 rounded-md text-slate-500 transition-colors" title="Xem Lý lịch">
                                        <Eye className="w-4 h-4" />
                                    </NavLink>
                                    {user.role === 'ADMIN' && (
                                      <button onClick={() => openEdit(item)} className="p-2 hover:bg-slate-100 rounded-md text-blue-600 transition-colors" title="Sửa">
                                          <Edit className="w-4 h-4" />
                                      </button>
                                    )}
                                    {user.role === 'ADMIN' && (
                                      <button onClick={() => handleDelete(item)} className="p-2 hover:bg-red-50 rounded-md text-red-600 transition-colors" title="Xóa">
                                          <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                    {!isLoading && paged.length === 0 && (
                        <tr>
                            <td colSpan={6} className="p-8 text-center text-muted-foreground">Không tìm thấy thiết bị nào.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t">
           <p className="text-sm text-muted-foreground">
             {searched.length > 0 ? `${(safePage - 1) * ITEMS_PER_PAGE + 1}–${Math.min(safePage * ITEMS_PER_PAGE, searched.length)} / ${searched.length} thiết bị` : 'Không có dữ liệu'}
           </p>
           <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 disabled:opacity-50 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Trước
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 7) {
                  pageNum = i + 1;
                } else if (safePage <= 4) {
                  pageNum = i + 1;
                } else if (safePage >= totalPages - 3) {
                  pageNum = totalPages - 6 + i;
                } else {
                  pageNum = safePage - 3 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`inline-flex items-center justify-center rounded-md text-sm font-medium h-8 w-8 transition-colors ${safePage === pageNum ? 'bg-primary text-primary-foreground' : 'border border-input bg-background hover:bg-accent'}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 disabled:opacity-50 disabled:pointer-events-none transition-colors"
              >
                Tiếp <ChevronRight className="w-4 h-4 ml-1" />
              </button>
           </div>
        </div>
      </div>

      {/* Add Equipment Modal */}
      {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
             <div className="bg-card w-full max-w-lg rounded-xl border shadow-lg overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b">
                   <h2 className="text-xl font-bold">Thêm thiết bị mới</h2>
                   <p className="text-sm text-muted-foreground mt-1">Điền thông tin để tạo mã thiết bị tự động.</p>
                </div>
                <div className="p-6 space-y-4">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <label className="text-sm font-medium leading-none">Đơn vị / Phòng ban</label>
                         <select value={formDept} onChange={e => setFormDept(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            {FLAT_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                         </select>
                      </div>
                      <div className="space-y-2">
                         <label className="text-sm font-medium leading-none">Loại thiết bị</label>
                         <select value={formType} onChange={e => setFormType(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            {Object.entries(EQUIPMENT_TYPE_MAP).map(([k, v]) => <option key={k} value={k}>{v} ({k})</option>)}
                         </select>
                      </div>
                   </div>

                   <div className="space-y-2 p-3 bg-slate-50 border rounded-lg flex justify-between items-center">
                      <span className="text-sm font-medium text-muted-foreground">Mã dự kiến:</span>
                      <span className="font-mono font-bold text-primary tracking-wider">{generateCode()}</span>
                   </div>

                   <div className="space-y-2">
                      <label className="text-sm font-medium leading-none">Tên thiết bị</label>
                      <input type="text" value={formName} onChange={e => setFormName(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Nhập tên..." />
                   </div>

                   <div className="space-y-2">
                      <label className="text-sm font-medium leading-none">Đặc tính kỹ thuật</label>
                      <textarea value={formSpecs} onChange={e => setFormSpecs(e.target.value)} className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Cấu hình, công suất..."></textarea>
                   </div>
                </div>
                <div className="p-6 border-t bg-slate-50/50 flex justify-end gap-2">
                   <button onClick={() => setIsAddModalOpen(false)} className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
                      Hủy bỏ
                   </button>
                   <button onClick={handleAddEquipment} disabled={formSubmitting || !formName} className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 disabled:opacity-50">
                      {formSubmitting ? 'Đang lưu...' : 'Lưu Thiết bị'}
                   </button>
                </div>
             </div>
          </div>
      )}

      {/* Edit Equipment Modal */}
      {editEquip && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
             <div className="bg-card w-full max-w-lg rounded-xl border shadow-lg overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b">
                   <h2 className="text-xl font-bold">Chỉnh sửa thiết bị</h2>
                   <p className="text-sm text-muted-foreground mt-1 font-mono">{editEquip.code}</p>
                </div>
                <div className="p-6 space-y-4">
                   <div className="space-y-2">
                      <label className="text-sm font-medium">Tên thiết bị</label>
                      <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-sm font-medium">Đặc tính kỹ thuật</label>
                      <textarea value={editSpecs} onChange={e => setEditSpecs(e.target.value)} className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"></textarea>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <label className="text-sm font-medium">Tình trạng</label>
                         <select value={editStatus} onChange={e => setEditStatus(e.target.value as Equipment['status'])} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                            <option value="Tốt">Tốt</option>
                            <option value="Đang sửa chữa">Đang sửa chữa</option>
                            <option value="Kém phẩm chất">Kém phẩm chất</option>
                            <option value="Thanh lý">Thanh lý</option>
                         </select>
                      </div>
                      <div className="space-y-2">
                         <label className="text-sm font-medium">Đơn vị sử dụng</label>
                         <input type="text" value={editDept} onChange={e => setEditDept(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                      </div>
                   </div>
                </div>
                <div className="p-6 border-t bg-slate-50/50 flex justify-end gap-2">
                   <button onClick={() => setEditEquip(null)} className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent h-10 px-4 py-2">
                      Hủy bỏ
                   </button>
                   <button onClick={handleSaveEdit} disabled={formSubmitting || !editName || !editDept} className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2 disabled:opacity-50">
                      {formSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                   </button>
                </div>
             </div>
          </div>
      )}
    </div>
  );
}
