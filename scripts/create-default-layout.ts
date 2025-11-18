import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking existing layouts...');
  
  // ลบ layouts เก่าทั้งหมด
  await prisma.widget.deleteMany({});
  await prisma.layout.deleteMany({});
  
  console.log('✅ Cleared old layouts');
  
  // สร้าง default layout ใหม่
  const layout = await prisma.layout.create({
    data: {
      name: "Default Layout",
      isActive: true,
      widgets: {
        create: [
          {
            type: "hero",
            title: "Hero Section",
            content: null,
            imageUrl: null,
            x: 0,
            y: 0,
            w: 12,
            h: 6,
            order: 0,
            isVisible: true,
            settings: null,
          },
          {
            type: "about",
            title: "About Section",
            content: null,
            imageUrl: null,
            x: 0,
            y: 6,
            w: 12,
            h: 4,
            order: 1,
            isVisible: true,
            settings: null,
          },
          {
            type: "skills",
            title: "Skills",
            content: null,
            imageUrl: null,
            x: 0,
            y: 10,
            w: 12,
            h: 4,
            order: 2,
            isVisible: true,
            settings: null,
          },
          {
            type: "education",
            title: "Education & Experience",
            content: null,
            imageUrl: null,
            x: 0,
            y: 14,
            w: 12,
            h: 5,
            order: 3,
            isVisible: true,
            settings: null,
          },
          {
            type: "portfolio",
            title: "Portfolio",
            content: null,
            imageUrl: null,
            x: 0,
            y: 19,
            w: 12,
            h: 4,
            order: 4,
            isVisible: true,
            settings: null,
          },
          {
            type: "contact",
            title: "Contact",
            content: null,
            imageUrl: null,
            x: 0,
            y: 23,
            w: 12,
            h: 5,
            order: 5,
            isVisible: true,
            settings: null,
          },
        ],
      },
    },
    include: {
      widgets: true,
    },
  });
  
  console.log('✅ Created default layout with', layout.widgets.length, 'widgets');
  console.log('Layout ID:', layout.id);
  console.log('Widgets:', layout.widgets.map(w => `${w.type} (order: ${w.order})`));
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

