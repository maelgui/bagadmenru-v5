// src/index.ts
import render from '@koa/ejs';
import dotenv from "dotenv";
import Koa from 'koa';
import mount from 'koa-mount';
import path from "node:path";
import provider from './provider';
import adminRoutes from './routes/admin';
import interactionRoutes from './routes/flows';
dotenv.config();
const app = new Koa();
const adminApp = new Koa();

let { PORT = 3000, ISSUER = `http://localhost:${PORT}` } = process.env;
PORT = PORT as number;

render(app, {
  root: path.join(__dirname, "views"),
  layout: "layout",
  viewExt: "ejs",
  cache: false,
  debug: true,
});

app.use(interactionRoutes.routes());
app.use(mount(provider.app));
adminApp.use(adminRoutes.routes())

app.listen(PORT, () => {
  console.log(`application is listening on port ${PORT}, check ${ISSUER}/.well-known/openid-configuration`);
});


adminApp.listen(PORT + 1, () => {
  console.log(`admin application is listening on port ${PORT + 1}`);
});
