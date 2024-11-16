import Router from "@koa/router";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import koaBody from "koa-body";
import {
  TokenDecodeError,
  TokenPayload,
  validateToken,
} from "../support/token";

const router = new Router();

const prisma = new PrismaClient();

router.get("/activate-account", async (ctx) => {
  const token = ctx.request.query.token as string;
  if (!token) {
    ctx.status = 400;
    return;
  }

  try {
    await validateToken(token);
  } catch (err) {
    if (err instanceof TokenDecodeError) {
      ctx.status = 400;
      ctx.body = err.message;
      return;
    }
    throw err;
  }

  return ctx.render("activateAccount", { title: "Activer mon compte" });
});

const bodyParser = koaBody({
  text: false,
  json: true,
  patchNode: true,
  patchKoa: true,
});

router.post("/activate-account", bodyParser, async (ctx) => {
  const token = ctx.request.query.token as string;
  if (!token) {
    ctx.status = 400;
    return;
  }

  let payload: TokenPayload;
  try {
    payload = await validateToken(token);
  } catch (err) {
    if (err instanceof TokenDecodeError) {
      ctx.status = 400;
      ctx.body = err.message;
      return;
    }
    throw err;
  }

  // validate identical password and confirmation in ctx.request.body
  if (ctx.request.body.password !== ctx.request.body.passwordConfirmation) {
    ctx.status = 400;
    ctx.body = "Passwords do not match";
    return;
  }

  // update user password
  const hashedPassword = await bcrypt.hash(ctx.request.body.password, 10);
  await prisma.user.update({
    where: {
      id: payload.userId,
    },
    data: {
      password: hashedPassword,
      emailVerified: true,
    },
  });

  ctx.redirect("https://bagadmenru.bzh");
  return;
});

export default router;
