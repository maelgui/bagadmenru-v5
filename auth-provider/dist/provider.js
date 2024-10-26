"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const oidc_provider_1 = __importDefault(require("oidc-provider"));
const configuration_1 = __importDefault(require("./configuration"));
const { PORT = 3000, ISSUER = `http://localhost:${PORT}` } = process.env;
exports.default = new oidc_provider_1.default(ISSUER, { ...configuration_1.default });
