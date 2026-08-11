import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const result: any = await prisma.$queryRawUnsafe(`DESCRIBE businesses;`);
  console.log('--- COLUMNAS DE LA TABLA businesses ---');
  console.log(result);
}

main().catch(console.error).finally(() => prisma.$disconnect());
