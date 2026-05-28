import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Package, Wrench, CalendarCheck, Home, Bell, LogOut, ChevronDown, User, History, ClipboardList, Clock, ClipboardCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { getRoleName, isApproverRole } from '../lib/access';
import { countOverdue } from '../lib/sla';
import { getAnnualProcurementDeadlines, isAnnualProcurement } from '../lib/procurementTimeline';
import type { AuthUser, MaintenancePlan, NotificationItem, Procurement, ProcurementPlan, Repair } from '../lib/types';

interface TopNavProps {
  user: AuthUser;
  onLogout: () => void;
}

export default function TopNav({ user, onLogout }: TopNavProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const navigate = useNavigate();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user.role],
    queryFn: async () => {
      try {
        const [repairs, procs, plans, procurementPlans] = await Promise.all([
          api.get<Repair[]>('/api/repairs').catch(() => [] as Repair[]),
          api.get<Procurement[]>('/api/procurements').catch(() => [] as Procurement[]),
          api.get<MaintenancePlan[]>('/api/maintenance-plans').catch(() => [] as MaintenancePlan[]),
          isApproverRole(user.role) || user.role === 'ADMIN'
            ? api.get<ProcurementPlan[]>('/api/procurement-plans').catch(() => [] as ProcurementPlan[])
            : Promise.resolve([] as ProcurementPlan[]),
        ]);
        
        const notifs: NotificationItem[] = [];
        let idCounter = 1;
        const currentYear = new Date().getFullYear();
        const annualDeadlines = getAnnualProcurementDeadlines(currentYear);
        const annualRequests = procs.filter(p => isAnnualProcurement(p.procurementType) && (p.targetYear || currentYear) === currentYear);
        const annualPlans = procurementPlans.filter(p => isAnnualProcurement(p.planType) && (p.targetYear || currentYear) === currentYear);
        
        if (user.role === 'ADMIN') {
          const now = Date.now();
          const annualPending = annualRequests.filter(p => p.status === 'Chờ duyệt').length;
          if (annualPending > 0 && now > annualDeadlines.requestDeadline.getTime()) {
            notifs.push({ id: idCounter++, title: 'Quá hạn', desc: `${annualPending} đề nghị mua sắm định kỳ đã qua hạn 30/01 cần HCTH xử lý.`, link: '/procurement' });
          }
          const annualPlanApproved = annualPlans.some(p => p.status === 'TGĐ phê duyệt');
          if (annualRequests.length > 0 && !annualPlanApproved && now > annualDeadlines.planDeadline.getTime()) {
            notifs.push({ id: idCounter++, title: 'Quá hạn', desc: `Kế hoạch mua sắm năm ${currentYear} chưa được duyệt sau hạn 01/03.`, link: '/procurement' });
          }

          const rCount = repairs.filter(r => r.status === 'Chờ duyệt').length;
          if (rCount > 0) notifs.push({ id: idCounter++, title: 'Sửa chữa', desc: `Có ${rCount} yêu cầu báo hỏng cần tiếp nhận.`, link: '/maintenance' });
          
          const pCount = procs.filter(p => p.status === 'Chờ duyệt').length;
          if (pCount > 0) notifs.push({ id: idCounter++, title: 'Mua sắm', desc: `Có ${pCount} đề nghị cần lập kế hoạch mua sắm.`, link: '/procurement' });
          
          const pCount2 = procs.filter(p => p.status === 'TGĐ phê duyệt').length;
          if (pCount2 > 0) notifs.push({ id: idCounter++, title: 'Mua sắm', desc: `Có ${pCount2} kế hoạch đã duyệt, cần tiến hành mua sắm.`, link: '/procurement' });
        } else if (isApproverRole(user.role)) {
          const overdueRepairs = countOverdue(repairs, 'Đã tiếp nhận');
          if (overdueRepairs > 0) notifs.push({ id: idCounter++, title: 'Quá hạn', desc: `${overdueRepairs} phiếu sửa chữa quá hạn phê duyệt theo KPI 02 ngày.`, link: '/maintenance' });

          const overdueProcs = countOverdue(procs, 'Đã lập kế hoạch');
          if (overdueProcs > 0) notifs.push({ id: idCounter++, title: 'Quá hạn', desc: `${overdueProcs} đề nghị mua sắm quá hạn phê duyệt theo KPI 03 ngày.`, link: '/procurement' });

          const overdueProcPlans = countOverdue(procurementPlans, 'Chờ duyệt');
          if (overdueProcPlans > 0) notifs.push({ id: idCounter++, title: 'Quá hạn', desc: `${overdueProcPlans} kế hoạch mua sắm BM.05.02 quá hạn phê duyệt.`, link: '/procurement' });

          const overdueMaintenance = countOverdue(plans, 'Chờ duyệt');
          if (overdueMaintenance > 0) notifs.push({ id: idCounter++, title: 'Quá hạn', desc: `${overdueMaintenance} kế hoạch bảo dưỡng quá hạn phê duyệt.`, link: '/maintenance-plan' });

          const rCount = repairs.filter(r => r.status === 'Đã tiếp nhận').length;
          if (rCount > 0) notifs.push({ id: idCounter++, title: 'Phê duyệt', desc: `Có ${rCount} phiếu sửa chữa đang chờ phê duyệt.`, link: '/maintenance' });
          
          const pCount = procs.filter(p => p.status === 'Đã lập kế hoạch').length;
          if (pCount > 0) notifs.push({ id: idCounter++, title: 'Phê duyệt', desc: `Có ${pCount} đề nghị mua sắm đang chờ phê duyệt.`, link: '/procurement' });

          const planCount = procurementPlans.filter(p => p.status === 'Chờ duyệt').length;
          if (planCount > 0) notifs.push({ id: idCounter++, title: 'Phê duyệt', desc: `Có ${planCount} kế hoạch mua sắm BM.05.02 đang chờ phê duyệt.`, link: '/procurement' });
          
          const mCount = plans.filter(p => p.status === 'Chờ duyệt').length;
          if (mCount > 0) notifs.push({ id: idCounter++, title: 'Phê duyệt', desc: `Có ${mCount} kế hoạch bảo dưỡng đang chờ phê duyệt.`, link: '/maintenance-plan' });
        }
        return notifs;
      } catch {
        return [];
      }
    },
    refetchInterval: 30000 // Refresh every 30s
  });

  const getInitials = (name: string) => {
    return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center px-4 max-w-7xl mx-auto">
        <div className="mr-4 flex">
          <a className="mr-6 flex items-center space-x-2" href="/">
            <Package className="h-6 w-6 text-primary" />
            <span className="hidden font-bold sm:inline-block">
              Quản Lý Tài Sản
            </span>
          </a>
          <div className="flex gap-6 text-sm font-medium">
            <NavLink to="/" end className={({isActive}) => isActive ? "text-primary" : "text-foreground/60 hover:text-foreground/80 transition-colors"}>
              <span className="flex items-center gap-1"><Home className="w-4 h-4"/> Tổng quan</span>
            </NavLink>
            <NavLink to="/equipment" className={({isActive}) => isActive ? "text-primary" : "text-foreground/60 hover:text-foreground/80 transition-colors"}>
              <span className="flex items-center gap-1"><Package className="w-4 h-4"/> Thiết bị</span>
            </NavLink>
            <NavLink to="/maintenance" className={({isActive}) => isActive ? "text-primary" : "text-foreground/60 hover:text-foreground/80 transition-colors"}>
              <span className="flex items-center gap-1"><Wrench className="w-4 h-4"/> Sửa chữa</span>
            </NavLink>
            <NavLink to="/procurement" className={({isActive}) => isActive ? "text-primary" : "text-foreground/60 hover:text-foreground/80 transition-colors"}>
              <span className="flex items-center gap-1"><CalendarCheck className="w-4 h-4"/> Mua sắm</span>
            </NavLink>
            <NavLink to="/maintenance-plan" className={({isActive}) => isActive ? "text-primary" : "text-foreground/60 hover:text-foreground/80 transition-colors"}>
              <span className="flex items-center gap-1"><ClipboardList className="w-4 h-4"/> Bảo dưỡng</span>
            </NavLink>
            {(user.role === 'ADMIN' || isApproverRole(user.role)) && (
              <NavLink to="/inventory" className={({isActive}) => isActive ? "text-primary" : "text-foreground/60 hover:text-foreground/80 transition-colors"}>
                <span className="flex items-center gap-1"><ClipboardCheck className="w-4 h-4"/> Kiểm kê</span>
              </NavLink>
            )}
            {user.role === 'ADMIN' && (
              <NavLink to="/audit" className={({isActive}) => isActive ? "text-primary" : "text-foreground/60 hover:text-foreground/80 transition-colors"}>
                <span className="flex items-center gap-1"><History className="w-4 h-4"/> Nhật ký</span>
              </NavLink>
            )}
          </div>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-3">
          {/* Notification dropdown */}
          <div className="relative">
            <button 
              onClick={() => { setShowNotifMenu(!showNotifMenu); setShowUserMenu(false); }}
              className="relative text-foreground/60 hover:text-foreground transition-colors hover:bg-slate-100 p-2 rounded-full"
            >
               <Bell className="w-5 h-5" />
               {notifications.length > 0 && (
                 <span className="absolute top-1 right-1 flex h-2 w-2 rounded-full bg-destructive"></span>
               )}
            </button>

            {showNotifMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifMenu(false)} />
                <div className="absolute right-0 mt-2 w-80 bg-card rounded-xl border shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-3 border-b bg-slate-50/50 flex justify-between items-center">
                     <h3 className="font-semibold text-sm">Thông báo</h3>
                     {notifications.length > 0 && <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-medium">{notifications.length} mới</span>}
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                     {notifications.length === 0 ? (
                       <div className="p-6 text-center text-muted-foreground text-sm flex flex-col items-center">
                          <Bell className="w-8 h-8 opacity-20 mb-2" />
                          <p>Không có thông báo mới.</p>
                       </div>
                     ) : (
                       <div className="flex flex-col">
                         {notifications.map((notif) => (
                           <button 
                             key={notif.id}
                             onClick={() => { setShowNotifMenu(false); navigate(notif.link); }}
                             className="text-left p-3 hover:bg-slate-50 border-b last:border-0 transition-colors flex gap-3 items-start"
                           >
                             <div className="mt-0.5 bg-blue-100 text-blue-600 p-1.5 rounded-full">
                               <Clock className="w-3.5 h-3.5" />
                             </div>
                             <div>
                               <p className="text-sm font-medium">{notif.title}</p>
                               <p className="text-xs text-muted-foreground mt-0.5">{notif.desc}</p>
                             </div>
                           </button>
                         ))}
                       </div>
                     )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User dropdown */}
          <div className="relative">
            <button 
              onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifMenu(false); }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                {getInitials(user.fullName)}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium leading-tight">{user.fullName}</p>
                <p className="text-xs text-muted-foreground leading-tight">{getRoleName(user.role)}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground hidden md:block" />
            </button>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                <div className="absolute right-0 mt-2 w-64 bg-card rounded-xl border shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-4 border-b bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                        {getInitials(user.fullName)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{user.fullName}</p>
                        <p className="text-xs text-muted-foreground">{user.department}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-2">
                    <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span>Vai trò: <span className="font-medium text-foreground">{getRoleName(user.role)}</span></span>
                    </div>
                    <button
                      onClick={onLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Đăng xuất
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
