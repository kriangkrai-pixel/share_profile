import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="text-6xl mb-4">😕</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">ไม่พบผู้ใช้</h1>
        <p className="text-gray-600 mb-6">
          ไม่พบข้อมูลผู้ใช้ที่คุณกำลังมองหา
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
        >
          <span>←</span>
          <span>กลับไปหน้าแรก</span>
        </Link>
      </div>
    </div>
  );
}

