import Router from '@koa/router';
import bcrypt from 'bcrypt';
import { koaBody } from 'koa-body';
import { strict as assert } from 'node:assert';
import { InteractionResults } from 'oidc-provider';
import provider from '../provider';
import { findAccountByEmail } from '../support/account';

const router = new Router();

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
  const {
    uid, prompt, params, session,
  } = await provider.interactionDetails(ctx.req, ctx.res);
  const client = await provider.Client.find(params.client_id as string);

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

const bodyParser = koaBody({
  text: false, json: false, patchNode: true, patchKoa: true,
});

router.post('/interaction/:uid/login', bodyParser, async (ctx) => {
  const { prompt: { name }, uid } = await provider.interactionDetails(ctx.req, ctx.res);
  assert.equal(name, 'login');

  const user = await findAccountByEmail(ctx.request.body.login);
  console.log(user)
  let result: InteractionResults;

  if (user !== null &&
    await bcrypt.compare(ctx.request.body.password, user.password)) {
    result = {
      login: {
        accountId: user?.id,
      },
    };
    return provider.interactionFinished(ctx.req, ctx.res, result, {
      mergeWithLastSubmission: false,
    });
  }
  else {
    return ctx.redirect(`/interaction/${uid}`)
  }

});


router.post('/interaction/:uid/confirm', bodyParser, async (ctx) => {
  const interactionDetails = await provider.interactionDetails(ctx.req, ctx.res);
  const { prompt: { name, details }, params, session } = interactionDetails;
  assert.notEqual(session, undefined)
  assert.equal(name, 'consent');
  const accountId = session?.accountId;
  let { grantId } = interactionDetails;
  let grant;

  if (grantId) {
    // we'll be modifying existing grant in existing session
    grant = await provider.Grant.find(grantId);
  } else {
    // we're establishing a new grant
    grant = new provider.Grant({
      accountId,
      clientId: params.client_id as string,
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

  const consent: InteractionResults["consent"] = {};
  if (!interactionDetails.grantId) {
    // we don't have to pass grantId to consent, we're just modifying existing one
    consent.grantId = grantId;
  }

  const result: InteractionResults = { consent };
  return provider.interactionFinished(ctx.req, ctx.res, result, {
    mergeWithLastSubmission: true,
  });
});


router.get('/interaction/:uid/abort', async (ctx) => {
  const result = {
    error: 'access_denied',
    error_description: 'End-User aborted interaction',
  };

  return provider.interactionFinished(ctx.req, ctx.res, result, {
    mergeWithLastSubmission: false,
  });
});


export default router;
