import Router from "@koa/router";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import koaBody from "koa-body";
import { ACTION_ACTIVATE_ACCOUNT, signToken } from "../support/token";

const router = new Router();

const bodyParser = koaBody({
  text: false,
  json: true,
  patchNode: true,
  patchKoa: true,
});

const prisma = new PrismaClient();

router.get("/users/:id", bodyParser, async (ctx) => {
  ctx.body = await prisma.user.findUnique({
    where: {
      id: ctx.params.id,
    },
    select: {
      id: true,
      email: true,
      emailVerified: true,
    },
  });
});

router.post("/users", bodyParser, async (ctx) => {
  const userId = ctx.request.body?.id ?? crypto.randomUUID();

  const token = await signToken({
    action: ACTION_ACTIVATE_ACCOUNT,
    userId,
  });
  const emailTextContent = await ctx.render("activateAccountEmailText", {
    layout: false,
    activationLink: `${process.env.ORIGIN}/activate-account?token=${token}`,
  });
  const emailHtmlContent = await ctx.render("activateAccountEmailHtml", {
    layout: false,
    activationLink: `${process.env.ORIGIN}/activate-account?token=${token}`,
  });
  await fetch(`${process.env.EMAIL_API_ENDPOINT}/batch_send_emails`, {
    method: "POST",
    body: JSON.stringify([
      {
        to: ctx.request.body.email,
        subject: "[bagadmenru] Activer votre compte",
        body_html: emailHtmlContent,
        body_text: emailTextContent,
      },
    ]),
    headers: { "Content-Type": "application/json" },
  });

  ctx.body = await prisma.user.create({
    data: {
      id: userId,
      email: ctx.request.body.email,
    },
  });
});

export default router;
