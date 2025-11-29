"use client";

import AboutPageComponent from "../../../admin/about/page";

// Layout จะตรวจสอบ authentication ให้แล้ว
// ใช้ component เดียวกับ /admin/about แต่จะใช้ username จาก URL parameter
// ซึ่งจะถูกส่งผ่าน apiRequest อัตโนมัติ
export default AboutPageComponent;

