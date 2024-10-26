"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const router_1 = __importDefault(require("@koa/router"));
const koa_body_1 = require("koa-body");
const node_assert_1 = require("node:assert");
const provider_1 = __importDefault(require("./provider"));
const account_1 = require("./support/account");
const bcrypt_1 = __importDefault(require("bcrypt"));
const router = new router_1.default();
// router.use(async (ctx, next) => {
//   ctx.set('cache-control', 'no-store');
//   try {
//     await next();
//   } catch (err) {
//     if (err instanceof SessionNotFound) {
//       ctx.status = err.status;
//       const { message: error, error_description } = err;
//       await defaults.renderError(ctx, { error, error_description }, err);
//     } else {
//       throw err;
//     }
//   }
// });
router.get('/interaction/:uid', async (ctx, next) => {
    const { uid, prompt, params, session, } = await provider_1.default.interactionDetails(ctx.req, ctx.res);
    const client = await provider_1.default.Client.find(params.client_id);
    switch (prompt.name) {
        case 'login': {
            return ctx.render('login', {
                client,
                uid,
                details: prompt.details,
                params,
                title: 'Sign-in',
                session: session,
                dbg: {
                    params: params,
                    prompt: prompt,
                },
            });
        }
        case 'consent': {
            return ctx.render('consent', {
                client,
                uid,
                details: prompt.details,
                params,
                title: 'Authorize',
                session: session,
                dbg: {
                    params: params,
                    prompt: prompt,
                },
            });
        }
        default:
            return next();
    }
});
const bodyParser = (0, koa_body_1.koaBody)({
    text: false, json: false, patchNode: true, patchKoa: true,
});
router.post('/interaction/:uid/login', bodyParser, async (ctx) => {
    const { prompt: { name }, uid } = await provider_1.default.interactionDetails(ctx.req, ctx.res);
    node_assert_1.strict.equal(name, 'login');
    const user = await (0, account_1.findAccountByEmail)(ctx.request.body.login);
    console.log(user);
    let result;
    if (user !== null &&
        await bcrypt_1.default.compare(ctx.request.body.password, user.password)) {
        result = {
            login: {
                accountId: user?.id,
            },
        };
        return provider_1.default.interactionFinished(ctx.req, ctx.res, result, {
            mergeWithLastSubmission: false,
        });
    }
    else {
        return ctx.redirect(`/interaction/${uid}`);
    }
});
router.post('/interaction/:uid/confirm', bodyParser, async (ctx) => {
    const interactionDetails = await provider_1.default.interactionDetails(ctx.req, ctx.res);
    const { prompt: { name, details }, params, session } = interactionDetails;
    node_assert_1.strict.notEqual(session, undefined);
    node_assert_1.strict.equal(name, 'consent');
    const accountId = session?.accountId;
    let { grantId } = interactionDetails;
    let grant;
    if (grantId) {
        // we'll be modifying existing grant in existing session
        grant = await provider_1.default.Grant.find(grantId);
    }
    else {
        // we're establishing a new grant
        grant = new provider_1.default.Grant({
            accountId,
            clientId: params.client_id,
        });
    }
    if (details.missingOIDCScope) {
        // @ts-ignore
        grant.addOIDCScope(details.missingOIDCScope.join(' '));
    }
    if (details.missingOIDCClaims) {
        grant.addOIDCClaims(details.missingOIDCClaims);
    }
    if (details.missingResourceScopes) {
        for (const [indicator, scope] of Object.entries(details.missingResourceScopes)) {
            grant.addResourceScope(indicator, scope.join(' '));
        }
    }
    if (details.rar) {
        // @ts-ignore
        for (const rar of details.rar) {
            grant.addRar(rar);
        }
    }
    grantId = await grant.save();
    const consent = {};
    if (!interactionDetails.grantId) {
        // we don't have to pass grantId to consent, we're just modifying existing one
        consent.grantId = grantId;
    }
    const result = { consent };
    return provider_1.default.interactionFinished(ctx.req, ctx.res, result, {
        mergeWithLastSubmission: true,
    });
});
exports.default = router;
