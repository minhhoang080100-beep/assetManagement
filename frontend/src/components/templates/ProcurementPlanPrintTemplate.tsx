import React from 'react';
import type { ProcurementPlan } from '../../lib/types';

interface ProcurementPlanPrintTemplateProps {
  selectedPlan: ProcurementPlan | null;
  printRef: React.RefObject<HTMLDivElement | null>;
  formatCurrency: (n: number) => string;
}

export default function ProcurementPlanPrintTemplate({ selectedPlan, printRef, formatCurrency }: ProcurementPlanPrintTemplateProps) {
  return (
    <div className="hidden">
      <div ref={printRef} className="p-10 text-black bg-white" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
        <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-8">
          <div className="text-center font-bold">
            <p>CÔNG TY CỔ PHẦN CẢNG NGHỆ TĨNH</p>
            <p className="text-sm">BM.HCTH.05.02</p>
          </div>
          <div className="text-center font-bold">
            <p>CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
            <p>Độc lập - Tự do - Hạnh Phúc</p>
          </div>
        </div>

        <h1 className="text-xl font-bold text-center mb-8 uppercase">Kế hoạch mua sắm vật tư, trang thiết bị</h1>
        <div className="space-y-2 mb-6">
          <p><span className="font-bold">Kế hoạch:</span> {selectedPlan?.title || '..............................'}</p>
          <p><span className="font-bold">Kỳ/Năm:</span> {selectedPlan?.period || '..............................'}</p>
          <p><span className="font-bold">Loại kế hoạch:</span> {selectedPlan?.planType || 'Đột xuất'}{selectedPlan?.targetYear ? ` - Năm ${selectedPlan.targetYear}` : ''}</p>
          {selectedPlan?.planningDeadline && <p><span className="font-bold">Hạn trình theo SOP:</span> {new Date(selectedPlan.planningDeadline).toLocaleDateString('vi-VN')}</p>}
          {selectedPlan?.note && <p><span className="font-bold">Ghi chú:</span> {selectedPlan.note}</p>}
        </div>

        <table className="w-full border-collapse border border-black mb-8">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-2 text-center w-12">TT</th>
              <th className="border border-black p-2 text-left">Tên thiết bị</th>
              <th className="border border-black p-2 text-center w-20">Số lượng</th>
              <th className="border border-black p-2 text-left">Đặc tính kỹ thuật</th>
              <th className="border border-black p-2 text-left">Trang bị cho phòng, đơn vị</th>
              <th className="border border-black p-2 text-right">Dự toán</th>
            </tr>
          </thead>
          <tbody>
            {(selectedPlan?.items || []).map((item, index) => (
              <tr key={`${item.name}-${index}`}>
                <td className="border border-black p-2 text-center">{index + 1}</td>
                <td className="border border-black p-2">{item.name}</td>
                <td className="border border-black p-2 text-center">{item.quantity}</td>
                <td className="border border-black p-2">{item.specs || ''}</td>
                <td className="border border-black p-2">{item.department}</td>
                <td className="border border-black p-2 text-right">{formatCurrency(item.quantity * item.estimatedPrice)}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={5} className="border border-black p-2 text-right font-bold">TỔNG CỘNG:</td>
              <td className="border border-black p-2 text-right font-bold">
                {formatCurrency(selectedPlan?.totalEstimatedCost || 0)}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="grid grid-cols-3 gap-8 mt-12 text-center font-bold">
          <div>
            <p>TỔNG GIÁM ĐỐC</p>
            <p className="font-normal italic text-sm">(Ký, ghi rõ họ tên)</p>
          </div>
          <div>
            <p>PHÒNG HCTH</p>
            <p className="font-normal italic text-sm">(Ký, ghi rõ họ tên)</p>
          </div>
          <div>
            <p>NGƯỜI LẬP KẾ HOẠCH</p>
            <p className="font-normal italic text-sm">(Ký, ghi rõ họ tên)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
