import Router from '@koa/router';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import koaBody from 'koa-body';

const router = new Router();

const bodyParser = koaBody({
  text: false, json: true, patchNode: true, patchKoa: true,
});

const prisma = new PrismaClient()

router.post('/user', bodyParser, async (ctx) => {
  console.log(ctx.request.body)

  const salt = await bcrypt.genSalt();
  const hashedPassword = await bcrypt.hash("blabla", salt);

  ctx.body = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      email: ctx.request.body.email,
      password: hashedPassword,
    },
  })
});




export default router;
