import React from 'react';

interface ProcurementItem {
  name: string;
  quantity: number;
  estimatedPrice: number;
}

interface Procurement {
  department: string;
  reason: string;
  items: ProcurementItem[];
  estimatedCost: number;
}

interface ProcurementPrintTemplateProps {
  selectedProc: Procurement | null;
  printRef: React.RefObject<HTMLDivElement | null>;
  formatCurrency: (n: number) => string;
}

export default function ProcurementPrintTemplate({ selectedProc, printRef, formatCurrency }: ProcurementPrintTemplateProps) {
  return (
    <div className="hidden">
      <div ref={printRef} className="p-10 text-black bg-white" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
        <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-8">
          <div className="text-center font-bold">
            <p>CÔNG TY CỔ PHẦN CẢNG NGHỆ TĨNH</p>
            <p className="text-sm">BM.HCTH.05.01</p>
          </div>
          <div className="text-center font-bold">
            <p>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
            <p>Độc lập - Tự do - Hạnh phúc</p>
            <p className="italic text-sm font-normal mt-1">
              Nghệ An, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
            </p>
          </div>
        </div>
        <h1 className="text-xl font-bold text-center mb-8 uppercase">Giấy Đề Nghị Mua Sắm Thiết Bị</h1>
        <div className="space-y-4 mb-8 leading-relaxed">
          <p><span className="font-bold">Kính gửi:</span> Tổng Giám Đốc Công ty CP Cảng Nghệ Tĩnh</p>
          <p><span className="font-bold">Đơn vị đề nghị:</span> {selectedProc?.department || '..............................'}</p>
          <p><span className="font-bold">Lý do mua sắm:</span> {selectedProc?.reason || '..............................'}</p>
        </div>
        <p className="font-bold mb-2">Danh mục thiết bị đề nghị mua sắm:</p>
        <table className="w-full border-collapse border border-black mb-8">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-2 text-center w-12">STT</th>
              <th className="border border-black p-2 text-left">Tên thiết bị, quy cách</th>
              <th className="border border-black p-2 text-center w-24">ĐVT</th>
              <th className="border border-black p-2 text-center w-24">Số lượng</th>
              <th className="border border-black p-2 text-right">Dự toán/Đơn giá (VNĐ)</th>
            </tr>
          </thead>
          <tbody>
            {(selectedProc?.items || []).map((item, i) => (
              <tr key={i}>
                <td className="border border-black p-2 text-center">{i + 1}</td>
                <td className="border border-black p-2">{item.name}</td>
                <td className="border border-black p-2 text-center">Cái</td>
                <td className="border border-black p-2 text-center">{item.quantity}</td>
                <td className="border border-black p-2 text-right">{formatCurrency(item.estimatedPrice)}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={4} className="border border-black p-2 text-right font-bold">TỔNG CỘNG:</td>
              <td className="border border-black p-2 text-right font-bold">{formatCurrency(selectedProc?.estimatedCost || 0)}</td>
            </tr>
          </tbody>
        </table>
        <div className="grid grid-cols-3 gap-8 mt-12 text-center font-bold">
          <div>
            <p>NGƯỜI ĐỀ NGHỊ</p>
            <p className="font-normal italic text-sm">(Ký, ghi rõ họ tên)</p>
          </div>
          <div>
            <p>PHÒNG HCTH</p>
            <p className="font-normal italic text-sm">(Ký, ghi rõ họ tên)</p>
          </div>
          <div>
            <p>TỔNG GIÁM ĐỐC</p>
            <p className="font-normal italic text-sm">(Phê duyệt)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
