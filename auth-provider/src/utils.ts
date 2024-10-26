import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt';


async function updateUser() {
  const prisma = new PrismaClient()

  const salt = await bcrypt.genSalt();
  const hashedPassword = await bcrypt.hash("blabla", salt);

  return await prisma.user.create({
    data: {
      id: 'dfe09a43-e51b-4949-af88-1a6ad3d8f8c5',
      email: 'mael@guillossou.bzh',
      password: hashedPassword,
    },
  })
}

updateUser().then(() => console.log("OKK"))
