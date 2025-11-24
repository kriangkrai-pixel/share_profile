#!/bin/bash

# Cleanup Script - ทำความสะอาด Ports, Lock Files, และ Processes
# ใช้สำหรับแก้ไขปัญหา Port ถูกใช้งานและ Next.js lock file

echo "🧹 เริ่มทำความสะอาดระบบ..."

# สีสำหรับ output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ฟังก์ชันสำหรับตรวจสอบและหยุด process บน port
kill_port() {
    local port=$1
    local name=$2
    
    echo -e "\n${YELLOW}🔍 กำลังตรวจสอบ port $port ($name)...${NC}"
    
    # หา process ที่ใช้ port นี้
    local pid=$(lsof -ti:$port 2>/dev/null)
    
    if [ -z "$pid" ]; then
        echo -e "${GREEN}✅ Port $port ไม่มี process ใช้งาน${NC}"
    else
        echo -e "${YELLOW}⚠️  พบ process ที่ใช้ port $port (PID: $pid)${NC}"
        echo -e "${YELLOW}   กำลังหยุด process...${NC}"
        kill -9 $pid 2>/dev/null
        sleep 1
        
        # ตรวจสอบอีกครั้ง
        local pid_check=$(lsof -ti:$port 2>/dev/null)
        if [ -z "$pid_check" ]; then
            echo -e "${GREEN}✅ หยุด process บน port $port สำเร็จ${NC}"
        else
            echo -e "${RED}❌ ไม่สามารถหยุด process บน port $port ได้${NC}"
        fi
    fi
}

# 1. หยุด processes บน port 3000 และ 3001
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📌 ขั้นตอนที่ 1: ตรวจสอบและหยุด Processes${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

kill_port 3000 "Frontend (Next.js)"
kill_port 3001 "Backend (NestJS)"

# 2. ตรวจสอบและหยุด PM2 processes (ถ้ามี)
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📌 ขั้นตอนที่ 2: ตรวจสอบ PM2 Processes${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}🔍 กำลังตรวจสอบ PM2 processes...${NC}"
    local pm2_count=$(pm2 list | grep -c "online\|stopped" || echo "0")
    
    if [ "$pm2_count" -gt "1" ]; then
        echo -e "${YELLOW}⚠️  พบ PM2 processes ที่กำลังรัน${NC}"
        echo -e "${YELLOW}   ต้องการหยุด PM2 processes หรือไม่? (y/n)${NC}"
        read -t 5 -n 1 -r response || response="n"
        echo
        if [[ $response =~ ^[Yy]$ ]]; then
            pm2 stop all 2>/dev/null
            echo -e "${GREEN}✅ หยุด PM2 processes สำเร็จ${NC}"
        else
            echo -e "${YELLOW}⏭️  ข้ามการหยุด PM2 processes${NC}"
        fi
    else
        echo -e "${GREEN}✅ ไม่มี PM2 processes ที่กำลังรัน${NC}"
    fi
else
    echo -e "${GREEN}✅ PM2 ไม่ได้ติดตั้ง (ข้าม)${NC}"
fi

# 3. ลบ Next.js lock files และ cache
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📌 ขั้นตอนที่ 3: ลบ Lock Files และ Cache${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# ลบ Next.js lock file
if [ -f ".next/dev/lock" ]; then
    echo -e "${YELLOW}🗑️  กำลังลบ Next.js lock file...${NC}"
    rm -f .next/dev/lock
    echo -e "${GREEN}✅ ลบ Next.js lock file สำเร็จ${NC}"
else
    echo -e "${GREEN}✅ ไม่พบ Next.js lock file${NC}"
fi

# ลบ Next.js cache (optional - comment out if you want to keep cache)
if [ -d ".next" ]; then
    echo -e "${YELLOW}🗑️  กำลังลบ Next.js cache...${NC}"
    rm -rf .next/cache
    echo -e "${GREEN}✅ ลบ Next.js cache สำเร็จ${NC}"
else
    echo -e "${GREEN}✅ ไม่พบ Next.js cache directory${NC}"
fi

# 4. แสดงสถานะ ports
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📌 ขั้นตอนที่ 4: สรุปสถานะ Ports${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

check_port_status() {
    local port=$1
    local name=$2
    local pid=$(lsof -ti:$port 2>/dev/null)
    
    if [ -z "$pid" ]; then
        echo -e "${GREEN}✅ Port $port ($name): พร้อมใช้งาน${NC}"
    else
        local process_info=$(ps -p $pid -o comm= 2>/dev/null || echo "unknown")
        echo -e "${RED}❌ Port $port ($name): ถูกใช้งานโดย PID $pid ($process_info)${NC}"
    fi
}

check_port_status 3000 "Frontend"
check_port_status 3001 "Backend"

# สรุป
echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ ทำความสะอาดเสร็จสมบูรณ์!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "\n${YELLOW}💡 คำแนะนำ:${NC}"
echo -e "   - รัน \`npm run dev:all\` เพื่อเริ่ม dev server"
echo -e "   - หรือรัน \`npm run dev:clean\` เพื่อทำความสะอาดและรันพร้อมกัน"
echo ""

