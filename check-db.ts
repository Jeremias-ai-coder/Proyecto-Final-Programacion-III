import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const result: any = await prisma.$queryRawUnsafe(`SHOW TABLES;`);
  console.log('--- TABLAS EN LA BASE DE DATOS ---');
  console.log(result);
}

main().catch(console.error).finally(() => prisma.$disconnect());
