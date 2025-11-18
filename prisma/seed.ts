import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // สร้าง Profile เริ่มต้น
  const profile = await prisma.profile.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'เกรียงไกร ภูทองก้าน',
      email: 'kik550123@gmail.com',
      phone: '091-826-6369',
      location: 'Phuket, Thailand',
      description: 'Full Stack Developer',
      bio: 'ผม เกรียงไกร ภูทองก้าน นักพัฒนาเว็บไซต์ที่มีประสบการณ์ในการสร้างเว็บแอปพลิเคชันที่ทันสมัยและมีประสิทธิภาพ',
      achievement: 'สำเร็จการศึกษาระดับปริญญาตรี สาขาเทคโนโลยีสารสนเทศ จากมหาวิทยาลัยชั้นนำ พร้อมประสบการณ์ในการพัฒนาโปรเจคต่างๆ',
    },
  });

  console.log('✅ Created profile:', profile.name);

  // สร้าง Layout เริ่มต้น
  const layout = await prisma.layout.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Default Layout',
      isActive: true,
    },
  });

  console.log('✅ Created layout:', layout.name);

  // ลบ Widgets เดิมทั้งหมด (ถ้ามี)
  await prisma.widget.deleteMany({
    where: { layoutId: layout.id },
  });

  // สร้าง Widgets เริ่มต้น
  const widgetTypes = [
    { 
      type: 'hero', 
      title: 'Welcome to My Portfolio', 
      content: 'สวัสดีครับ! ยินดีต้อนรับสู่เว็บไซต์ Portfolio ของผม', 
      order: 0,
      settings: JSON.stringify({
        backgroundColor: '#3b82f6',
        textColor: '#ffffff',
        alignment: 'center',
        padding: '4rem',
      }),
    },
    { 
      type: 'about', 
      title: 'เกี่ยวกับเรา', 
      content: 'ผมเป็นนักพัฒนาเว็บไซต์ที่มีประสบการณ์ในการสร้างเว็บแอปพลิเคชัน', 
      order: 1,
      settings: JSON.stringify({
        backgroundColor: '#ffffff',
        textColor: '#1f2937',
        alignment: 'left',
        padding: '2rem',
      }),
    },
    { 
      type: 'skills', 
      title: 'ทักษะ', 
      content: 'ทักษะและความสามารถของผม', 
      order: 2,
      settings: JSON.stringify({
        backgroundColor: '#f3f4f6',
        textColor: '#1f2937',
        alignment: 'center',
        padding: '2rem',
      }),
    },
    { 
      type: 'education', 
      title: 'การศึกษา', 
      content: 'ประวัติการศึกษาของผม', 
      order: 3,
      settings: JSON.stringify({
        backgroundColor: '#ffffff',
        textColor: '#1f2937',
        alignment: 'left',
        padding: '2rem',
      }),
    },
    { 
      type: 'experience', 
      title: 'ประสบการณ์', 
      content: 'ประสบการณ์การทำงานของผม', 
      order: 4,
      settings: JSON.stringify({
        backgroundColor: '#f3f4f6',
        textColor: '#1f2937',
        alignment: 'left',
        padding: '2rem',
      }),
    },
    { 
      type: 'portfolio', 
      title: 'ผลงาน', 
      content: 'ผลงานที่ผมภูมิใจ', 
      order: 5,
      settings: JSON.stringify({
        backgroundColor: '#ffffff',
        textColor: '#1f2937',
        alignment: 'center',
        padding: '2rem',
      }),
    },
    { 
      type: 'contact', 
      title: 'ติดต่อ', 
      content: 'ติดต่อเราได้ที่นี่', 
      order: 6,
      settings: JSON.stringify({
        backgroundColor: '#3b82f6',
        textColor: '#ffffff',
        alignment: 'center',
        padding: '2rem',
      }),
    },
  ];

  for (const widget of widgetTypes) {
    await prisma.widget.create({
      data: {
        ...widget,
        layoutId: layout.id,
        isVisible: true,
      },
    });
  }

  console.log(`✅ Created ${widgetTypes.length} widgets`);

  // สร้าง SiteSettings เริ่มต้น
  await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      primaryColor: '#3b82f6',
      secondaryColor: '#8b5cf6',
      accentColor: '#10b981',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      headerBgColor: '#ffffff',
      footerBgColor: '#1f2937',
    },
  });

  console.log('✅ Created site settings');

  // สร้าง Skills ตัวอย่าง
  const skills = ['JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js', 'MySQL', 'Prisma', 'Tailwind CSS'];
  
  await prisma.skill.deleteMany({
    where: { profileId: profile.id },
  });

  for (const skillName of skills) {
    await prisma.skill.create({
      data: {
        name: skillName,
        profileId: profile.id,
      },
    });
  }

  console.log(`✅ Created ${skills.length} skills`);

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

