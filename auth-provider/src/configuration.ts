import { Configuration, errors } from "oidc-provider";
import { findAccountById } from "./support/account";

const corsProp = "urn:custom:client:allowed-cors-origins";
const resourcesProp = "urn:custom:client:allowed-resources";
const isOrigin = (value: unknown) => {
  if (typeof value !== "string") {
    return false;
  }
  try {
    const { origin } = new URL(value);
    // Origin: <scheme> "://" <hostname> [ ":" <port> ]
    return value === origin;
  } catch (err) {
    console.error(err);
    return false;
  }
};

export default {
  async findAccount(_ctx, sub, _token) {
    // @param ctx - koa request context
    // @param sub {string} - account identifier (subject)
    // @param token - is a reference to the token used for which a given account is being loaded,
    //   is undefined in scenarios where claims are returned from authorization endpoint
    const user = await findAccountById(sub);
    return {
      accountId: sub,
      // @param use {string} - can either be "id_token" or "userinfo", depending on
      //   where the specific claims are intended to be put in
      // @param scope {string} - the intended scope, while oidc-provider will mask
      //   claims depending on the scope automatically you might want to skip
      //   loading some claims from external resources or through db projection etc. based on this
      //   detail or not return them in ID Tokens but only UserInfo and so on
      // @param claims {object} - the part of the claims authorization parameter for either
      //   "id_token" or "userinfo" (depends on the "use" param)
      // @param rejected {Array[String]} - claim names that were rejected by the end-user, you might
      //   want to skip loading some claims from external resources or through db projection
      async claims(_use, _scope, _claims, _rejected) {
        return {
          sub: user?.id,
          email_verified: user?.emailVerified,
          email: {
            email: user?.email,
          },
        };
      },
    };
  },
  clients: [
    {
      client_id: "bagad-frontend-dev",
      client_secret: "aaaa",
      application_type: "web",
      token_endpoint_auth_method: "none",
      grant_types: ["refresh_token", "authorization_code"],
      redirect_uris: ["http://localhost:5173/callback"],
      post_logout_redirect_uris: ["https://bagadmenru.bzh"],
      [corsProp]: ["http://localhost:5173"],
      [resourcesProp]: ["http://localhost:5173"],
    },
    {
      client_id: "bbe2-back",
      client_secret: "aaaa",
      redirect_uris: [],
      response_types: [],
      grant_types: ["client_credentials"],
    },
    {
      client_id: "bagad-frontend",
      application_type: "web",
      token_endpoint_auth_method: "none",
      grant_types: ["refresh_token", "authorization_code"],
      redirect_uris: ["https://beta.bagadmenru.bzh/callback"],
      post_logout_redirect_uris: ["https://bagadmenru.bzh"],
      [corsProp]: ["https://beta.bagadmenru.bzh"],
      [resourcesProp]: ["https://api.beta.bagadmenru.bzh"],
    },
    {
      client_id: "bagad-backend",
      client_secret:
        "b299326082d350a0311a6323cea7fd8bf02220b5a0126b48a83c3f272f20f59a",
      redirect_uris: [],
      response_types: [],
      grant_types: ["client_credentials"],
    },
    {
      client_id: "postman",
      client_secret: "aaaa",
      redirect_uris: ["https://oauth.pstmn.io/v1/callback"],
      grant_types: ["authorization_code"],
      [resourcesProp]: ["http://localhost:5173", "http://localhost:9999"],
    },
  ],
  interactions: {
    url(ctx, interaction) {
      return `/interaction/${interaction.uid}`;
    },
  },
  cookies: {
    keys: [
      "some secret key",
      "and also the old rotated away some time ago",
      "and one more",
    ],
  },
  claims: {
    nbf: null,
    email: ["email", "email_verified"],
    profile: [
      "birthdate",
      "family_name",
      "gender",
      "given_name",
      "locale",
      "middle_name",
      "name",
      "nickname",
      "picture",
      "preferred_username",
      "profile",
      "updated_at",
      "website",
      "zoneinfo",
    ],
  },

  features: {
    devInteractions: { enabled: false }, // defaults to true
    introspection: {
      enabled: true,
      allowedPolicy: () => true,
    },
    clientCredentials: {
      enabled: true,
    },
    resourceIndicators: {
      getResourceServerInfo(ctx, resourceIndicator, client) {
        const allowedResources = client[resourcesProp] as string[];
        console.log(allowedResources, resourceIndicator);
        if (!allowedResources.includes(resourceIndicator)) {
          throw new errors.InvalidTarget();
        }
        console.log(resourceIndicator, client);
        return {
          scope: "api:read offline_access",
          accessTokenFormat: "jwt",
        };
      },
      async useGrantedResource(_ctx, _model) {
        // @param ctx - koa request context
        // @param model - depending on the request's grant_type this can be either an AuthorizationCode, BackchannelAuthenticationRequest,
        //                RefreshToken, or DeviceCode model instance.
        return true;
      },
    },
  },
  jwks: {
    keys: [
      {
        crv: "P-256",
        d: "hyKRoPP8LCp80620H-JNfB7oil8_XKRjF3DATl9a9hs",
        kty: "EC",
        use: "sig",
        x: "BQIn4SaAyFvo7e8wN7Pv_oAVrBF91vElako4J5vpPyA",
        y: "tI790Gj0gtHAIZS-1mU3o9yJ3CMS4K0C85w-eW0C_kI",
      },
      {
        d: "ENOEDZYhkEOZWirUCqVTXdqw_z6xCxfF4by8rFCYLpcrygQgmkvRAYpXoKDW0l0yKw5VEugrJgsOGddymJy487Arn699WJe7m8BTEop76RRfK7J68c3tQoBC0ZbEm03mRq-vn764eYwgRQiw1CNWIWw9zqdObRwHYOcHD63xpIMEt1D-1vA_0q_1hgGYIjg2QHZYNKSG1ca9dMLFpwSSkfpmxIz9LPmNvfgBrXvNm9zufE7hdhkEv9uwkgRrHFaehUH6VVRkHv28ndaXmnlJOnvxvygffy9BttRaZXV3FLodEU_e_TgQW0w_U5nFZQcl9CfEaMQmfh5Xt_Ra8VcrcQ",
        dp: "RotDzkuO6X3ITSPdpGjgMFoCZwEv10epE4PKQTABfKxKuJuLM6wrmIojTeiv1XZ23JOZZJMZYF0IvNO62yR-DGZ_t0XaaLWR3kqi-b-l9qvXgVWDw5_A33xACKwdTRUzB61J4duHz-5D41f9BwEcMG9lDAiC2P8qC2O13Rb5wgk",
        dq: "gpnPrRc8LewW6ij1vA0aK3lLkaIS1VkGz61RThT7gQz3Fe-uiT1w4dUXzIJuwoOA0eazNSdKoIOmRfakJptkqJzZT0atq6UKb95MeWaVJ-VpjCKuCiV-0o6v9V77cmn0vgrqIfs5Du4m6Ybz-Zc4CtKqH2LFHOIIrCiVoFNrfOE",
        e: "AQAB",
        kty: "RSA",
        n: "rV3SD_ccinSj1d5sJGXdft7SENStAy6ijq4GDynoKURnmlVJrcXBP9sFGaA15g_HLn7DOhNr3CX1ZAumIZlK7QniEhhzgv8c036PIeZw-bPiGXErcqXhP576TyD1wAH-1hdqgBlx4Q3jSlMA6KIgAbSRC5sQbWjAf3ATbWvYIj4qrv-F6mmgEo9WdxkDYwSAKValmOu1JNzMtzZ4m1vDELK6YnZyhJmnARY9AetQl6VJ0r268-mbXZCOH2IPWjev6YR_qY5plADnivNSdMT6wX8Yb_Fa4DqLhPC3SarR8aa0ab-Q-hb1W7BiFhptWJbkYM5QBQeJ3-pQHznLJ43mMQ",
        p: "2G8NW35j_KcVtwRDjDZeYV02UFCeGsRt9aHAX86PagYa1P2vSYqFAxOqJNcR6yaO0bvIutHSw6OjEiNZsK3WO54ENz5BZNlVRIuP7QxN-Yar5SrDADKtHkxV0dyS2RGI3GwFyk12rPXrPPzH1zsDh6vKfpk4SPxJCjhFIs0KTok",
        q: "zQ8_tHs2LPIemzGhFrXTjNCrmbuUsJxl0MZtb-7JpdH6LdHbTfcVQ_fQ6CSsDfLSYKgIN7RwBANHq5aSJlFF0gjkhiU421cOIvByw0A-G5c0YxbnB9j_rnAIRJZXlzqajoiZjnIlNHiKgqYSZyfTqDz4SOR6K9wFF3xRmgxKMGk",
        qi: "p560QEi5sLjtdWirdyRc2LLJ6ZwDwqGmP9nwXvxLWgXtXJ3iIvIWGs7ZX0kLs77sINko2QHOe8KKclsPFqgVSB0WmGHLUM3rDnskjb3w27NxTRu33_0fOXhNeyXC6FyPEBuEnFJ8iSX6R74u67EYssFy72YIX0vKtRa4FEEbqYo",
        use: "sig",
      },
    ],
  },
  extraClientMetadata: {
    properties: [corsProp, resourcesProp],
    validator(ctx, key, value, metadata) {
      if (key === corsProp) {
        // set default (no CORS)
        if (value === undefined) {
          metadata[corsProp] = [];
          return;
        }
        // validate an array of Origin strings
        if (!Array.isArray(value) || !value.every(isOrigin)) {
          throw new errors.InvalidClientMetadata(
            `${corsProp} must be an array of origins`,
          );
        }
      }
    },
  },
  clientBasedCORS(ctx, origin, client) {
    // ctx.oidc.route can be used to exclude endpoints from this behaviour, in that case just return
    // true to always allow CORS on them, false to deny
    // you may also allow some known internal origins if you want to
    console.log("ici");
    const allowedOrigins = client[corsProp] as string[];
    return allowedOrigins.includes(origin);
  },
} as Configuration;
