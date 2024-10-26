"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const koa_1 = __importDefault(require("koa"));
const koa_mount_1 = __importDefault(require("koa-mount"));
const routes_1 = __importDefault(require("./routes"));
const provider_1 = __importDefault(require("./provider"));
const node_path_1 = __importDefault(require("node:path"));
const ejs_1 = __importDefault(require("@koa/ejs"));
dotenv_1.default.config();
const app = new koa_1.default();
const { PORT = 3000, ISSUER = `http://localhost:${PORT}` } = process.env;
(0, ejs_1.default)(app, {
    root: node_path_1.default.join(__dirname, "views"),
    layout: "layout",
    viewExt: "ejs",
    cache: false,
    debug: true,
});
app.use(routes_1.default.routes());
app.use((0, koa_mount_1.default)(provider_1.default.app));
app.listen(PORT, () => {
    console.log(`application is listening on port ${PORT}, check ${ISSUER}/.well-known/openid-configuration`);
});
