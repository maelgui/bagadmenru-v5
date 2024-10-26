"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAccountByEmail = findAccountByEmail;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function findAccountByEmail(email) {
    return prisma.user.findUnique({ where: { email: email } });
}
