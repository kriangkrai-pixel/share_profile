"use client";

import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();

  // ซ่อน Footer ในหน้า admin
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  const year = new Date().getFullYear();
  return (
    <footer className="mt-12 border-t bg-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <div>
            <h2 className="text-xl font-bold text-blue-600">KRIANGKRAI.P</h2>
            <p className="mt-2 text-gray-600">พัฒนาและเรียนรู้เทคโนโลยีใหม่ ๆ อย่างต่อเนื่อง</p>
          </div>

          <div className="flex md:justify-center">
            <ul className="space-y-2 text-gray-700">
              <li>
                <a className="hover:text-blue-600 transition-colors" href="/Home">หน้าแรก</a>
              </li>
              <li>
                <a className="hover:text-blue-600 transition-colors" href="/Contact">ติดต่อ</a>
              </li>
            </ul>
          </div>

          <div className="md:text-right">
            <p className="text-gray-700">
              <span className="text-blue-600 font-medium">อีเมล:</span> kik550123@gmail.com
            </p>
            <p className="text-gray-700 mt-1">
              <span className="text-blue-600 font-medium">ภูเก็ต</span>, Thailand
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-4 border-t pt-6">
          <p className="text-sm text-gray-600">© {year} KRIANGKRAI.P. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="/" className="text-sm text-gray-600 hover:text-blue-600">Privacy</a>
            <a href="/" className="text-sm text-gray-600 hover:text-blue-600">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
}


