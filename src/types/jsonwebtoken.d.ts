// Type definitions for jsonwebtoken module
declare module "jsonwebtoken" {
  interface JwtPayload {
    [key: string]: any;
  }

  interface SignOptions {
    algorithm?: string;
    expiresIn?: string | number;
    notBefore?: string | number;
    audience?: string;
    issuer?: string;
    jwtid?: string;
    keyid?: string;
    subject?: string;
    noTimestamp?: boolean;
    header?: boolean | object;
    encoding?: string;
  }

  interface VerifyOptions {
    algorithms?: string[];
    audience?: string | string[];
    issuer?: string | string[];
    jwtid?: string;
    subject?: string;
    clockTolerance?: number | string;
    maxAge?: string | number;
    clockTimestamp?: number;
  }

  function sign(
    payload: string | object | Buffer,
    secretOrPrivateKey: string,
    options?: SignOptions,
  ): string;
  function verify(
    token: string,
    secretOrPublicKey: string | Buffer,
    options?: VerifyOptions,
  ): object | string;
  function decode(
    token: string,
    options?: { complete?: boolean; json?: boolean },
  ): object | string;
}
