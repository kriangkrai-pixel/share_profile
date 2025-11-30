"use client";

/**
 * User Admin Dashboard - หน้า admin สำหรับ user แต่ละคน
 * 
 * Path: /[username]/admin
 * 
 * ใช้ Shared Component จาก AdminDashboard
 */

import { useParams } from "next/navigation";
import AdminDashboard from "../../component/AdminDashboard";

export default function UserAdminDashboard() {
  const params = useParams();
  const urlUsername = params?.username as string;

  return (
    <AdminDashboard
      basePath={`/${urlUsername}/admin`}
      showMainAdminLink={false}
      urlUsername={urlUsername}
    />
  );
}

