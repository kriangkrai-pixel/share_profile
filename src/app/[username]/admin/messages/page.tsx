"use client";

// Layout จะตรวจสอบ authentication ให้แล้ว
// ใช้ component เดียวกับ /admin/messages แต่จะใช้ username จาก URL parameter
// ซึ่งจะถูกส่งผ่าน apiRequest อัตโนมัติ
import MessagesPageComponent from "../../../admin/messages/page";

export default MessagesPageComponent;

