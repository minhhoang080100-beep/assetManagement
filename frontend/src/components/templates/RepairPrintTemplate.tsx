import React from 'react';

interface Repair {
  reqCode: string;
  department: string;
  equipmentCode: string;
  equipmentName: string;
  issue: string;
  hcthAssessment?: string;
  hcthAssessmentNote?: string;
  hcthProposal?: string;
}

interface RepairPrintTemplateProps {
  selectedRepair: Repair | null;
  printRef: React.RefObject<HTMLDivElement | null>;
}

export default function RepairPrintTemplate({ selectedRepair, printRef }: RepairPrintTemplateProps) {
  return (
    <div className="hidden">
      <div ref={printRef} className="p-10 text-black bg-white" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
        <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-8">
          <div className="text-center font-bold">
            <p>CÔNG TY CỔ PHẦN CẢNG NGHỆ TĨNH</p>
            <p className="text-sm">SỐ: {selectedRepair?.reqCode || '...../SC-HCTH'}</p>
          </div>
          <div className="text-center font-bold">
            <p>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
            <p>Độc lập - Tự do - Hạnh phúc</p>
            <p className="italic text-sm font-normal mt-1">
              Nghệ An, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
            </p>
          </div>
        </div>
        <h1 className="text-xl font-bold text-center mb-8 uppercase">Phiếu Yêu Cầu Sửa Chữa Thiết Bị</h1>
        <div className="space-y-3 mb-8 leading-relaxed">
          <p><span className="font-bold">Kính gửi:</span> Phòng Hành chính Tổng hợp</p>
          <p><span className="font-bold">Đơn vị yêu cầu:</span> {selectedRepair?.department || '.................................'}</p>
          <p>
            <span className="font-bold">Mã thiết bị:</span> {selectedRepair?.equipmentCode || '.............................'} 
            <span className="font-bold ml-8">Tên thiết bị:</span> {selectedRepair?.equipmentName || '.................................'}
          </p>
          <p><span className="font-bold">Mô tả sự cố:</span> {selectedRepair?.issue || '...............................................................................'}</p>
          <p><span className="font-bold">Phòng HCTH thẩm định tình trạng:</span> {selectedRepair?.hcthAssessment || '☐ Đúng thực tế  ☐ Khác'} {selectedRepair?.hcthAssessmentNote || ''}</p>
          <p><span className="font-bold">Đề xuất hướng giải quyết:</span> {selectedRepair?.hcthProposal || '...............................................................................'}</p>
        </div>
        <div className="grid grid-cols-2 gap-8 mt-16 text-center font-bold">
          <div>
            <p>NGƯỜI YÊU CẦU</p>
            <p className="font-normal italic text-sm">(Ký, ghi rõ họ tên)</p>
          </div>
          <div>
            <p>PHÒNG HCTH</p>
            <p className="font-normal italic text-sm">(Xác nhận)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
