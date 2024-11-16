import crypto from "crypto";
import { CompactSign, compactVerify } from "jose";

const TOKEN_MAX_AGE = 3600 * 24 * 7; // 7 days
export const ACTION_ACTIVATE_ACCOUNT = "ActivateAccount";

export type TokenPayload = {
  action: string;
  userId: string;
  timestamp: number;
};

export class TokenDecodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TokenDecodeError";
  }
}

export async function validateToken(
  token: string,
  max_age: number = TOKEN_MAX_AGE,
): Promise<TokenPayload> {
  const privateKey = crypto.createSecretKey(
    process.env.TOKEN_SECRET_KEY,
    "utf-8",
  );
  let decodedPayload: TokenPayload | undefined;
  try {
    const { payload } = await compactVerify(token, privateKey);
    decodedPayload = JSON.parse(
      new TextDecoder().decode(payload),
    ) as TokenPayload;
  } catch (err) {
    console.log(err);
    throw new TokenDecodeError("Unable to decode token");
  }

  if (decodedPayload.action !== "ActivateAccount") {
    throw new TokenDecodeError("Invalid token action");
  }

  if (decodedPayload.timestamp + max_age < Date.now()) {
    throw new TokenDecodeError("Token expired");
  }

  return decodedPayload;
}

export async function signToken(tokenData: Omit<TokenPayload, "timestamp">) {
  const data = { ...tokenData, timestamp: Date.now() };
  const privateKey = crypto.createSecretKey(
    process.env.TOKEN_SECRET_KEY,
    "utf-8",
  );
  const jws = await new CompactSign(
    new TextEncoder().encode(JSON.stringify(data)),
  )
    .setProtectedHeader({ alg: "HS256" })
    .sign(privateKey);

  return jws;
}
