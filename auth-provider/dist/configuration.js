"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const oidc_provider_1 = require("oidc-provider");
const corsProp = 'urn:custom:client:allowed-cors-origins';
const isOrigin = (value) => {
    if (typeof value !== 'string') {
        return false;
    }
    try {
        const { origin } = new URL(value);
        // Origin: <scheme> "://" <hostname> [ ":" <port> ]
        return value === origin;
    }
    catch (err) {
        return false;
    }
};
exports.default = {
    clients: [
        {
            client_id: 'aaaa',
            client_secret: 'aaaa',
            grant_types: ['refresh_token', 'authorization_code'],
            redirect_uris: ['https://openidconnect.net/callback'],
        },
        {
            client_id: 'bbe2',
            client_secret: 'aaaa',
            application_type: 'web',
            token_endpoint_auth_method: 'none',
            grant_types: ['refresh_token', 'authorization_code'],
            redirect_uris: ['http://localhost:5173/callback'],
            [corsProp]: ["http://localhost:5173"],
        },
        {
            client_id: 'bbe2-back',
            client_secret: 'aaaa',
            redirect_uris: [],
            response_types: [],
            grant_types: ['client_credentials']
        }
    ],
    interactions: {
        url(ctx, interaction) {
            return `/interaction/${interaction.uid}`;
        },
    },
    cookies: {
        keys: ['some secret key', 'and also the old rotated away some time ago', 'and one more'],
    },
    claims: {
        address: ['address'],
        email: ['email', 'email_verified'],
        phone: ['phone_number', 'phone_number_verified'],
        profile: ['birthdate', 'family_name', 'gender', 'given_name', 'locale', 'middle_name', 'name',
            'nickname', 'picture', 'preferred_username', 'profile', 'updated_at', 'website', 'zoneinfo'],
    },
    features: {
        devInteractions: { enabled: false }, // defaults to true
        resourceIndicators: {
            enabled: true
        },
        introspection: {
            enabled: true,
            allowedPolicy: () => true,
        },
        clientCredentials: {
            enabled: true,
        }
    },
    jwks: {
        keys: [
            {
                d: 'VEZOsY07JTFzGTqv6cC2Y32vsfChind2I_TTuvV225_-0zrSej3XLRg8iE_u0-3GSgiGi4WImmTwmEgLo4Qp3uEcxCYbt4NMJC7fwT2i3dfRZjtZ4yJwFl0SIj8TgfQ8ptwZbFZUlcHGXZIr4nL8GXyQT0CK8wy4COfmymHrrUoyfZA154ql_OsoiupSUCRcKVvZj2JHL2KILsq_sh_l7g2dqAN8D7jYfJ58MkqlknBMa2-zi5I0-1JUOwztVNml_zGrp27UbEU60RqV3GHjoqwI6m01U7K0a8Q_SQAKYGqgepbAYOA-P4_TLl5KC4-WWBZu_rVfwgSENwWNEhw8oQ',
                dp: 'E1Y-SN4bQqX7kP-bNgZ_gEv-pixJ5F_EGocHKfS56jtzRqQdTurrk4jIVpI-ZITA88lWAHxjD-OaoJUh9Jupd_lwD5Si80PyVxOMI2xaGQiF0lbKJfD38Sh8frRpgelZVaK_gm834B6SLfxKdNsP04DsJqGKktODF_fZeaGFPH0',
                dq: 'F90JPxevQYOlAgEH0TUt1-3_hyxY6cfPRU2HQBaahyWrtCWpaOzenKZnvGFZdg-BuLVKjCchq3G_70OLE-XDP_ol0UTJmDTT-WyuJQdEMpt_WFF9yJGoeIu8yohfeLatU-67ukjghJ0s9CBzNE_LrGEV6Cup3FXywpSYZAV3iqc',
                e: 'AQAB',
                kty: 'RSA',
                n: 'xwQ72P9z9OYshiQ-ntDYaPnnfwG6u9JAdLMZ5o0dmjlcyrvwQRdoFIKPnO65Q8mh6F_LDSxjxa2Yzo_wdjhbPZLjfUJXgCzm54cClXzT5twzo7lzoAfaJlkTsoZc2HFWqmcri0BuzmTFLZx2Q7wYBm0pXHmQKF0V-C1O6NWfd4mfBhbM-I1tHYSpAMgarSm22WDMDx-WWI7TEzy2QhaBVaENW9BKaKkJklocAZCxk18WhR0fckIGiWiSM5FcU1PY2jfGsTmX505Ub7P5Dz75Ygqrutd5tFrcqyPAtPTFDk8X1InxkkUwpP3nFU5o50DGhwQolGYKPGtQ-ZtmbOfcWQ',
                p: '5wC6nY6Ev5FqcLPCqn9fC6R9KUuBej6NaAVOKW7GXiOJAq2WrileGKfMc9kIny20zW3uWkRLm-O-3Yzze1zFpxmqvsvCxZ5ERVZ6leiNXSu3tez71ZZwp0O9gys4knjrI-9w46l_vFuRtjL6XEeFfHEZFaNJpz-lcnb3w0okrbM',
                q: '3I1qeEDslZFB8iNfpKAdWtz_Wzm6-jayT_V6aIvhvMj5mnU-Xpj75zLPQSGa9wunMlOoZW9w1wDO1FVuDhwzeOJaTm-Ds0MezeC4U6nVGyyDHb4CUA3ml2tzt4yLrqGYMT7XbADSvuWYADHw79OFjEi4T3s3tJymhaBvy1ulv8M',
                qi: 'wSbXte9PcPtr788e713KHQ4waE26CzoXx-JNOgN0iqJMN6C4_XJEX-cSvCZDf4rh7xpXN6SGLVd5ibIyDJi7bbi5EQ5AXjazPbLBjRthcGXsIuZ3AtQyR0CEWNSdM7EyM5TRdyZQ9kftfz9nI03guW3iKKASETqX2vh0Z8XRjyU',
                use: 'sig',
            }, {
                crv: 'P-256',
                d: 'K9xfPv773dZR22TVUB80xouzdF7qCg5cWjPjkHyv7Ws',
                kty: 'EC',
                use: 'sig',
                x: 'FWZ9rSkLt6Dx9E3pxLybhdM6xgR5obGsj5_pqmnz5J4',
                y: '_n8G69C-A2Xl4xUW2lF0i8ZGZnk_KPYrhv4GbTGu5G4',
            },
        ],
    },
    extraClientMetadata: {
        properties: [corsProp],
        validator(ctx, key, value, metadata) {
            if (key === corsProp) {
                // set default (no CORS)
                if (value === undefined) {
                    metadata[corsProp] = [];
                    return;
                }
                // validate an array of Origin strings
                if (!Array.isArray(value) || !value.every(isOrigin)) {
                    throw new oidc_provider_1.errors.InvalidClientMetadata(`${corsProp} must be an array of origins`);
                }
            }
        },
    },
    clientBasedCORS(ctx, origin, client) {
        // ctx.oidc.route can be used to exclude endpoints from this behaviour, in that case just return
        // true to always allow CORS on them, false to deny
        // you may also allow some known internal origins if you want to
        const allowedOrigins = client[corsProp];
        return allowedOrigins.includes(origin);
    },
};
