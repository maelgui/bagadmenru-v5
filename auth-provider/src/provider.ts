import Provider from "oidc-provider";
import configuration from "./configuration";

const { PORT = 3000, ISSUER = `http://localhost:${PORT}` } = process.env;

export default new Provider(ISSUER, { ...configuration });
