"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
async function updateUser() {
    const prisma = new client_1.PrismaClient();
    const salt = await bcrypt_1.default.genSalt();
    const hashedPassword = await bcrypt_1.default.hash("blabla", salt);
    return await prisma.user.update({
        where: {
            email: 'mael@guillossou.bzh',
        },
        data: {
            password: hashedPassword,
        },
    });
}
updateUser().then(() => console.log("OKK"));
