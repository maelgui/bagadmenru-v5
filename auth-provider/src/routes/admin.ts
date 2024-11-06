import Router from '@koa/router';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import koaBody from 'koa-body';


/**
 * Human-readable title for your website
 */
const rpName = 'SimpleWebAuthn Example';
/**
 * A unique identifier for your website. 'localhost' is okay for
 * local dev
 */
const rpID = 'localhost';
/**
 * The URL at which registrations and authentications should occur.
 * 'http://localhost' and 'http://localhost:PORT' are also valid.
 * Do NOT include any trailing /
 */
const origin = `http://${rpID}:3000`;



const router = new Router();

const bodyParser = koaBody({
  text: false, json: true, patchNode: true, patchKoa: true,
});

const prisma = new PrismaClient()

router.post('/user', bodyParser, async (ctx) => {

  const salt = await bcrypt.genSalt();
  const hashedPassword = await bcrypt.hash("blabla", salt);

  ctx.body = await prisma.user.create({
    data: {
      id: ctx.request.body?.id ?? crypto.randomUUID(),
      email: ctx.request.body.email,
      password: hashedPassword,
    },
  })
});


export default router;
