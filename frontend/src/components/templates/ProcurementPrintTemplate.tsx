import React from 'react';

interface ProcurementItem {
  name: string;
  unit?: string;
  quantity: number;
  specs?: string;
}

interface Procurement {
  department: string;
  requesterName?: string;
  procurementType?: string;
  targetYear?: number;
  submissionDeadline?: string;
  reason: string;
  hcthOpinion?: string;
  items: ProcurementItem[];
}

interface ProcurementPrintTemplateProps {
  selectedProc: Procurement | null;
  printRef: React.RefObject<HTMLDivElement | null>;
}

export default function ProcurementPrintTemplate({ selectedProc, printRef }: ProcurementPrintTemplateProps) {
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
        <h1 className="text-xl font-bold text-center mb-8 uppercase">Phiếu đề xuất mua vật tư, trang thiết bị</h1>
        <div className="space-y-4 mb-8 leading-relaxed">
          <p><span className="font-bold">Kính gửi:</span> - Tổng Giám đốc Công ty</p>
          <p className="pl-20">- Phòng HCTH</p>
          <p><span className="font-bold">Phòng/Đơn vị:</span> {selectedProc?.department || '..............................'}</p>
          <p><span className="font-bold">Người đề nghị:</span> {selectedProc?.requesterName || '..............................'}</p>
          <p><span className="font-bold">Loại đề nghị:</span> {selectedProc?.procurementType || 'Đột xuất'}{selectedProc?.targetYear ? ` - Năm ${selectedProc.targetYear}` : ''}</p>
          <p>Nội dung đề nghị: Kính đề nghị Tổng Giám đốc cho phép mua một số vật tư, trang thiết bị sau:</p>
        </div>
        <table className="w-full border-collapse border border-black mb-8">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-2 text-center w-12">TT</th>
              <th className="border border-black p-2 text-left">Tên vật tư, trang thiết bị</th>
              <th className="border border-black p-2 text-center w-24">Đơn vị tính</th>
              <th className="border border-black p-2 text-center w-24">Số lượng</th>
              <th className="border border-black p-2 text-left">Đặc tính kỹ thuật</th>
            </tr>
          </thead>
          <tbody>
            {(selectedProc?.items || []).map((item, i) => (
              <tr key={i}>
                <td className="border border-black p-2 text-center">{i + 1}</td>
                <td className="border border-black p-2">{item.name}</td>
                <td className="border border-black p-2 text-center">{item.unit || 'Cái'}</td>
                <td className="border border-black p-2 text-center">{item.quantity}</td>
                <td className="border border-black p-2">{item.specs || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="space-y-3 mb-8 leading-relaxed">
          <p><span className="font-bold">Lý do đề nghị:</span> {selectedProc?.reason || '..................................................................................................'}</p>
          <p><span className="font-bold">Ý kiến HCTH:</span> {selectedProc?.hcthOpinion || '..................................................................................................'}</p>
        </div>
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
