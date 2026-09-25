import jwt, { type SignOptions } from "jsonwebtoken";

type TokenPayload = {
  userId: string;
  role: "customer" | "admin";
};

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return secret;
};

export const generateAccessToken = (payload: TokenPayload): string => {
  const expiresIn = (process.env.JWT_EXPIRES_IN ?? "1h") as NonNullable<
    SignOptions["expiresIn"]
  >;

  const options: SignOptions = {
    expiresIn,
  };

  return jwt.sign(payload, getJwtSecret(), options);
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, getJwtSecret()) as TokenPayload;
};