import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function findAccountByEmail(email: string) {
  return prisma.user.findUnique({ where: { email: email } });
}
export async function findAccountById(id: string) {
  return prisma.user.findUnique({ where: { id: id } });
}

export async function findAuthenticatorById(id: string) {
  return prisma.authenticator.findUnique({
    where: { id: id },
    include: { user: true },
  });
}
