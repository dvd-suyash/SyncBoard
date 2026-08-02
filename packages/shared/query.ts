import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.element.findMany().then(r => console.log(r)).catch(e => console.error(e)).finally(() => prisma.$disconnect());
