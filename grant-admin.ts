import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Buscar usuario que contenga "jere" en el nombre o email
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: 'jere' } },
        { email: { contains: 'jere' } },
        { name: { contains: 'Jere' } },
        { email: { contains: 'Jere' } },
      ]
    }
  });

  if (users.length === 0) {
    console.log('No se encontró ningún usuario con "jere" en el nombre o email.');
    return;
  }

  console.log('Usuarios encontrados:');
  users.forEach(u => console.log(`  ID: ${u.id} | Nombre: ${u.name} | Email: ${u.email} | Rol actual: ${u.role}`));

  // Actualizar todos los que coincidan
  for (const user of users) {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: 'administrator' }
    });
    console.log(`\n✅ Actualizado: "${user.name}" (${user.email}) → rol: administrator`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
