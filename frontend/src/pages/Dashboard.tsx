
import { Package, Wrench, ShoppingCart, CheckCircle2, TrendingUp, AlertTriangle } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import api from '../lib/api';
import { useQuery } from '@tanstack/react-query';
import type { AuthUser, Equipment, Procurement, Repair } from '../lib/types';

interface OutletCtx {
  user: AuthUser;
}


export default function Dashboard() {
  const { user } = useOutletContext<OutletCtx>();
  
  const colors = ['bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-emerald-500', 'bg-pink-500', 'bg-cyan-500', 'bg-slate-400'];

  const { data: equipments = [], isLoading: loadingEq } = useQuery({
    queryKey: ['equipments'],
    queryFn: () => api.get<Equipment[]>('/api/equipments')
  });

  const { data: repairs = [], isLoading: loadingRep } = useQuery({
    queryKey: ['repairs'],
    queryFn: () => api.get<Repair[]>('/api/repairs')
  });

  const { data: procurements = [], isLoading: loadingProc } = useQuery({
    queryKey: ['procurements'],
    queryFn: () => api.get<Procurement[]>('/api/procurements')
  });

  const loading = loadingEq || loadingRep || loadingProc;

  // Compute stats dynamically
  const total = equipments.length;
  const good = equipments.filter((e) => e.status === 'Tốt').length;
  const repairing = repairs.filter((r) => ['Đang sửa chữa', 'TGĐ phê duyệt'].includes(r.status)).length;
  const goodPercent = total > 0 ? ((good / total) * 100).toFixed(1) : '0';

  const stats = { total, repairing, procurement: procurements.length, goodPercent };

  // Compute department distribution
  const deptCount: Record<string, number> = {};
  equipments.forEach((eq) => {
    const dept = (eq.department || 'Khác').split(' - ')[0].trim();
    let shortName = dept;
    if (dept.toLowerCase().includes('cửa lò')) shortName = 'Cửa Lò (CL)';
    else if (dept.toLowerCase().includes('bến thủy')) shortName = 'Bến Thủy (BT)';
    else if (dept.toLowerCase().includes('văn phòng cảng') || dept.toLowerCase().includes('văn phòng')) shortName = 'Văn Phòng Cảng (VP)';
    else shortName = dept;
    deptCount[shortName] = (deptCount[shortName] || 0) + 1;
  });

  const deptStats = Object.entries(deptCount)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count], i) => ({
      name,
      count,
      percent: Math.round((count / total) * 100),
      color: colors[i % colors.length]
    }));

  const recentRepairs = repairs.slice(0, 3);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tổng quan Hệ thống</h1>
          <p className="text-muted-foreground mt-1">Xin chào, <span className="font-medium text-foreground">{user.fullName}</span> 👋</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-shadow group">
            <div className="flex items-center justify-between space-y-0 pb-2">
                <h3 className="tracking-tight text-sm font-medium text-muted-foreground">Tổng thiết bị</h3>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:scale-110 transition-transform"><Package className="h-5 w-5" /></div>
            </div>
            <div className="text-3xl font-bold mt-2">{loading ? '...' : stats.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><TrendingUp className="w-3 h-3 text-green-500" /> Tổng tài sản trong hệ thống</p>
        </div>

        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-shadow group">
            <div className="flex items-center justify-between space-y-0 pb-2">
                <h3 className="tracking-tight text-sm font-medium text-muted-foreground">Đang sửa chữa</h3>
                <div className="p-2 bg-orange-50 text-orange-500 rounded-lg group-hover:scale-110 transition-transform"><Wrench className="h-5 w-5" /></div>
            </div>
            <div className="text-3xl font-bold mt-2">{loading ? '...' : stats.repairing}</div>
            <p className="text-xs text-muted-foreground mt-1">Phiếu yêu cầu chưa hoàn thành</p>
        </div>

        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-shadow group">
            <div className="flex items-center justify-between space-y-0 pb-2">
                <h3 className="tracking-tight text-sm font-medium text-muted-foreground">Đề xuất mua sắm</h3>
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg group-hover:scale-110 transition-transform"><ShoppingCart className="h-5 w-5" /></div>
            </div>
            <div className="text-3xl font-bold mt-2">{loading ? '...' : stats.procurement}</div>
            <p className="text-xs text-muted-foreground mt-1">Phiếu đề nghị mua sắm</p>
        </div>

        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-shadow group">
            <div className="flex items-center justify-between space-y-0 pb-2">
                <h3 className="tracking-tight text-sm font-medium text-muted-foreground">Tình trạng Tốt</h3>
                <div className="p-2 bg-green-50 text-green-500 rounded-lg group-hover:scale-110 transition-transform"><CheckCircle2 className="h-5 w-5" /></div>
            </div>
            <div className="text-3xl font-bold mt-2">{loading ? '...' : `${stats.goodPercent}%`}</div>
            <p className="text-xs text-muted-foreground mt-1">Tài sản đang hoạt động tốt</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm col-span-4 p-6">
            <h3 className="font-semibold leading-none tracking-tight mb-6">Hoạt động gần đây</h3>
            <div className="space-y-5">
                {recentRepairs.length > 0 ? recentRepairs.map((r, i: number) => (
                  <div key={r._id || i} className="flex items-start gap-4">
                    <div className={`p-2.5 rounded-full mt-0.5 ${r.status === 'Đã hoàn thành' ? 'bg-green-100' : r.status === 'Đang sửa chữa' ? 'bg-orange-100' : 'bg-yellow-100'}`}>
                      {r.status === 'Đã hoàn thành' ? <CheckCircle2 className="w-4 h-4 text-green-600" /> :
                       r.status === 'Đang sửa chữa' ? <Wrench className="w-4 h-4 text-orange-600" /> :
                       <AlertTriangle className="w-4 h-4 text-yellow-600" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {r.status === 'Chờ duyệt' ? 'Yêu cầu sửa chữa' : r.status} {r.equipmentName}
                        <span className="text-xs text-muted-foreground ml-2">({r.equipmentCode})</span>
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">{r.issue}. Đơn vị: {r.department}</p>
                    </div>
                    <div className="text-xs font-medium text-muted-foreground bg-slate-100 px-2 py-1 rounded-full whitespace-nowrap">
                      {r.requestedDate ? new Date(r.requestedDate).toLocaleDateString('vi-VN') : ''}
                    </div>
                  </div>
                )) : (
                  <div className="text-center text-muted-foreground py-8">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-300" />
                    <p className="text-sm">Chưa có hoạt động sửa chữa nào.</p>
                    <p className="text-xs mt-1">Hãy vào tab "Sửa chữa" để tạo phiếu báo hỏng mới.</p>
                  </div>
                )}
            </div>
        </div>

        <div className="rounded-xl border bg-card text-card-foreground shadow-sm col-span-3 p-6 flex flex-col">
            <h3 className="font-semibold leading-none tracking-tight mb-6">Phân bổ thiết bị theo Đơn vị</h3>
            <div className="flex-1 flex flex-col justify-center gap-3">
                {loading ? (
                  <p className="text-center text-muted-foreground">Đang tải...</p>
                ) : deptStats.map((dept) => (
                  <div key={dept.name} className="space-y-1.5">
                     <div className="flex justify-between text-sm">
                        <span className="font-medium">{dept.name}</span>
                        <span className="text-muted-foreground">{dept.count} ({dept.percent}%)</span>
                     </div>
                     <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${dept.color} rounded-full transition-all duration-1000`} style={{ width: `${dept.percent}%` }}></div>
                     </div>
                  </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
}
