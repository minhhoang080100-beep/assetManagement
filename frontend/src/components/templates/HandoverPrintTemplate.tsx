import React from 'react';

interface HandoverPrintTemplateProps {
  equipment: {
    code: string;
    name: string;
    specs?: string;
    status: string;
    condition?: number;
  };
  printRef: React.RefObject<HTMLDivElement | null>;
}

export default function HandoverPrintTemplate({ equipment, printRef }: HandoverPrintTemplateProps) {
  return (
    <div className="hidden">
      <div ref={printRef} className="p-10 text-black bg-white" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
        <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-8">
          <div className="text-center font-bold">
            <p>CÔNG TY CỔ PHẦN CẢNG NGHỆ TĨNH</p>
            <p className="text-sm">BM.HCTH.05.03</p>
          </div>
          <div className="text-center font-bold">
            <p>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
            <p>Độc lập - Tự do - Hạnh phúc</p>
            <p className="italic text-sm font-normal mt-1">
              Nghệ An, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
            </p>
          </div>
        </div>
        <h1 className="text-xl font-bold text-center mb-2 uppercase">Biên Bản Nghiệm Thu, Bàn Giao,</h1>
        <h2 className="text-lg font-bold text-center mb-8 uppercase">Cam Kết Sử Dụng Thiết Bị</h2>
        
        <div className="space-y-2 mb-6 leading-relaxed">
          <p className="font-bold">I. THÀNH PHẦN THAM GIA</p>
          <p>Phòng HCTH (Bên giao): Ông/Bà ................................. Chức vụ: .........................</p>
          <p>Đơn vị sử dụng (Bên nhận): Ông/Bà ............................. Chức vụ: ........................</p>
        </div>
        
        <div className="space-y-2 mb-6">
          <p className="font-bold">II. NỘI DUNG BÀN GIAO</p>
          <table className="w-full border-collapse border border-black mb-4">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-2 w-12">TT</th>
                <th className="border border-black p-2">Tên Thiết bị</th>
                <th className="border border-black p-2">Đặc tính KT/Mã hiệu</th>
                <th className="border border-black p-2 w-20">SL</th>
                <th className="border border-black p-2">Tình trạng KT</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-2 text-center">1</td>
                <td className="border border-black p-2">{equipment.name}</td>
                <td className="border border-black p-2">{equipment.specs || equipment.code}</td>
                <td className="border border-black p-2 text-center">1</td>
                <td className="border border-black p-2">{equipment.status} {equipment.condition !== undefined ? `(${equipment.condition}%)` : ''}</td>
              </tr>
            </tbody>
          </table>
          <p>Đi kèm gồm có: ........................................</p>
        </div>
        
        <div className="space-y-2 mb-6">
          <p className="font-bold">III. THÔNG TIN BẢO HÀNH</p>
          <p>Thời hạn bảo hành: ....................................... đến ngày: ...../...../20.....</p>
          <p>Đơn vị cung cấp/Sửa chữa: ................................... SĐT: .................................</p>
        </div>
        
        <div className="space-y-2 mb-8">
          <p className="font-bold">IV. CAM KẾT CỦA ĐƠN VỊ SỬ DỤNG</p>
          <p className="text-sm leading-relaxed">
            Đơn vị sử dụng xác nhận đã nhận đủ thiết bị, được hướng dẫn vận hành và cam kết: (1) Sử dụng đúng mục đích, đúng quy trình; (2) Không tự ý tháo dỡ, sửa chữa khi chưa có ý kiến Phòng HCTH; (3) Chịu trách nhiệm bảo quản theo quy định.
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-8 mt-12 text-center font-bold">
          <div>
            <p>PHÒNG HCTH</p>
            <p className="font-normal italic text-sm">(Ký, ghi rõ họ tên)</p>
          </div>
          <div>
            <p>ĐƠN VỊ SỬ DỤNG</p>
            <p className="font-normal italic text-sm">(Ký, ghi rõ họ tên)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
