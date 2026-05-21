import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QRPrintTemplateProps {
  equipment: {
    code: string;
    name: string;
    department: string;
    purchaseYear?: number;
    status: string;
  };
  printRef: React.RefObject<HTMLDivElement | null>;
}

export default function QRPrintTemplate({ equipment, printRef }: QRPrintTemplateProps) {
  return (
    <div className="hidden">
      <div 
        ref={printRef} 
        className="p-8 text-black bg-white flex flex-col items-center justify-center border-2 border-dashed border-slate-300 w-[400px] mx-auto mt-8 rounded-xl" 
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <h2 className="text-xl font-bold uppercase mb-1 text-center">Cảng Nghệ Tĩnh</h2>
        <p className="text-sm font-medium text-center mb-6 border-b pb-2 w-full">Tem Quản Lý Tài Sản</p>
        <div className="p-4 bg-white border-2 border-slate-900 rounded-xl mb-6 shadow-sm">
          <QRCodeSVG 
            value={`${window.location.origin}/equipment/${equipment.code}`} 
            size={180} 
            level={"H"} 
            includeMargin={true} 
          />
        </div>
        <div className="w-full space-y-2 text-center">
          <p className="font-bold text-lg leading-tight">{equipment.name}</p>
          <p className="font-mono text-base font-semibold bg-slate-100 inline-block px-3 py-1 rounded-md border">{equipment.code}</p>
          <p className="text-sm mt-2">{equipment.department}</p>
          <p className="text-xs text-slate-500 mt-2">Năm SD: {equipment.purchaseYear || '—'} • TT: {equipment.status}</p>
        </div>
      </div>
    </div>
  );
}
