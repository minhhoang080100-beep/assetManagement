import { useState } from 'react';
import { History, Search, Filter } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import type { AuditLog } from '../lib/types';

export default function AuditLogPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['auditlogs'],
    queryFn: () => api.get<AuditLog[]>('/api/auditlogs')
  });

  const filteredLogs = logs.filter((log: AuditLog) => {
    const matchesSearch = 
      log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.details || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.entityId && log.entityId.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    
    return matchesSearch && matchesAction;
  });

  const formatDate = (d: string) => {
    return new Date(d).toLocaleString('vi-VN');
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'TẠO MỚI': return 'bg-blue-100 text-blue-700';
      case 'CẬP NHẬT': return 'bg-yellow-100 text-yellow-700';
      case 'XÓA': return 'bg-red-100 text-red-700';
      case 'NHẬP KHO': return 'bg-green-100 text-green-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <History className="w-8 h-8 text-blue-600" />
                Nhật ký Hoạt động
            </h1>
            <p className="text-muted-foreground mt-1">
              Theo dõi lịch sử thao tác của tất cả người dùng trên hệ thống.
            </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
         <div className="flex gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-[300px]">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
               <input
                 type="text"
                 placeholder="Tìm theo user, mã thiết bị, mô tả..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
               />
            </div>
            <div className="relative w-full sm:w-[200px]">
               <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
               <select
                 value={actionFilter}
                 onChange={(e) => setActionFilter(e.target.value)}
                 className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
               >
                 <option value="all">Tất cả hành động</option>
                 <option value="TẠO MỚI">TẠO MỚI</option>
                 <option value="CẬP NHẬT">CẬP NHẬT</option>
                 <option value="XÓA">XÓA</option>
                 <option value="NHẬP KHO">NHẬP KHO</option>
               </select>
            </div>
         </div>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b">
                    <tr>
                        <th className="p-4 font-semibold text-slate-600">Thời gian</th>
                        <th className="p-4 font-semibold text-slate-600">Người thực hiện</th>
                        <th className="p-4 font-semibold text-slate-600">Hành động</th>
                        <th className="p-4 font-semibold text-slate-600">Đối tượng</th>
                        <th className="p-4 font-semibold text-slate-600 hidden md:table-cell">Mô tả chi tiết</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {isLoading ? (
                        <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Đang tải dữ liệu...</td></tr>
                    ) : filteredLogs.length === 0 ? (
                        <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Không tìm thấy bản ghi nào.</td></tr>
                    ) : (
                        filteredLogs.map((log: AuditLog) => (
                        <tr key={log._id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-4 whitespace-nowrap text-muted-foreground">{formatDate(log.createdAt)}</td>
                            <td className="p-4 font-medium">{log.user}</td>
                            <td className="p-4">
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${getActionColor(log.action)}`}>
                                    {log.action}
                                </span>
                            </td>
                            <td className="p-4">
                                <div>{log.entity}</div>
                                {log.entityId && log.entityId !== 'N/A' && <div className="text-xs text-muted-foreground mt-0.5">ID: {log.entityId}</div>}
                            </td>
                            <td className="p-4 hidden md:table-cell max-w-md truncate" title={log.details}>
                                {log.details || ''}
                            </td>
                        </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}
