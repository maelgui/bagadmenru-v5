// src/index.ts
import render from "@koa/ejs";
import dotenv from "dotenv";
import Koa from "koa";
import session from "koa-generic-session";
import logger from "koa-logger";
import mount from "koa-mount";
import serve from "koa-static";
import path from "node:path";
import provider from "./provider";
import adminRoutes from "./routes/admin";
import interactionRoutes from "./routes/flows";
import utilsRoutes from "./routes/utils";
import webauthnRoutes from "./routes/webauthn";

dotenv.config();
const app = new Koa();
app.use(logger());

const adminApp = new Koa();

const { PORT = 3000, ISSUER = `http://localhost:${PORT}` } = process.env;

if (process.env.NODE_ENV === "production") {
  app.proxy = true;

  app.use(async (ctx, next) => {
    if (ctx.secure) {
      await next();
    } else if (ctx.method === "GET" || ctx.method === "HEAD") {
      ctx.status = 303;
      ctx.redirect(ctx.href.replace(/^http:\/\//i, "https://"));
    } else {
      ctx.body = {
        error: "invalid_request",
        error_description: "do yourself a favor and only use https",
      };
      ctx.status = 400;
    }
  });
}

render(app, {
  root: path.join(__dirname, "views"),
  layout: "layout",
  viewExt: "ejs",
  cache: false,
});
app.use(mount("/static", serve("./public")));
app.use(session());
app.keys = ["keys", "keykeys"];
app.use(interactionRoutes.routes());
app.use(webauthnRoutes.routes());
app.use(utilsRoutes.routes());
app.use(mount(provider.app));
adminApp.use(adminRoutes.routes());

app.listen(PORT, () => {
  console.log(
    `application is listening on port ${PORT}, check ${ISSUER}/.well-known/openid-configuration`,
  );
});

render(adminApp, {
  root: path.join(__dirname, "views"),
  viewExt: "ejs",
  cache: false,
});

adminApp.listen((PORT as number) + 1, () => {
  console.log(`admin application is listening on port ${PORT + 1}`);
});
