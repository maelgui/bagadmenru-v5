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

router.get('/users/:id', bodyParser, async (ctx) => {
  ctx.body = await prisma.user.findUnique({
    where: {
      id: ctx.params.id,
    },
    select: {
      id: true,
      email: true,
      emailVerified: true,
    }
  })
});

router.post('/users', bodyParser, async (ctx) => {

  const salt = await bcrypt.genSalt();
  const hashedPassword = await bcrypt.hash("RochRoj", salt);

  ctx.body = await prisma.user.create({
    data: {
      id: ctx.request.body?.id ?? crypto.randomUUID(),
      email: ctx.request.body.email,
      password: hashedPassword,
    },
  })
});


export default router;
