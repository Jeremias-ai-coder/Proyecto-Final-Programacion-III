import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@turnosya.com';
  const plainPassword = 'password123';
  
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    console.log('El usuario de prueba ya existe. Puedes loguearte con: admin@turnosya.com / password123');
    return;
  }

  const hashedPassword = await bcrypt.hash(plainPassword, 10);
  
  await prisma.user.create({
    data: {
      name: 'Administrador Pruebas',
      email: email,
      password: hashedPassword,
      role: 'owner' // Propietario para que pueda crear negocios
    }
  });

  console.log('Usuario creado exitosamente.');
  console.log('Email:', email);
  console.log('Contraseña:', plainPassword);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
