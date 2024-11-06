import Router from '@koa/router';
import { PrismaClient } from '@prisma/client';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  VerifiedAuthenticationResponse,
  VerifiedRegistrationResponse,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON
} from '@simplewebauthn/types';
import koaBody from 'koa-body';
import { strict as assert } from 'node:assert';
import provider from '../provider';
import { findAuthenticatorById } from '../support/account';

const router = new Router();

const prisma = new PrismaClient()

/**
 * Human-readable title for your website
 */
const rpName = 'Bagad Men Ru';
/**
 * A unique identifier for your website. 'localhost' is okay for
 * local dev
 */
const rpID = process.env.RP_ID;
/**
 * The URL at which registrations and authentications should occur.
 * 'http://localhost' and 'http://localhost:PORT' are also valid.
 * Do NOT include any trailing /
 */
const origin = process.env.RP_ORIGIN;



router.get('/webauthn/list', async (ctx) => {
  const session = await provider.Session.get(ctx)
  const signedIn = !!session.accountId

  if (!signedIn) {
    return false
  }

  const authenticators = await prisma.authenticator.findMany({
    where: {
      userId: session.accountId,
    }
  })

  return ctx.render('webauthn', {
    title: 'Passkeys',
    session,
    authenticators,
  });

})

router.get('/generate-registration-options', async (ctx) => {
  const session = await provider.Session.get(ctx)
  const signedIn = !!session.accountId

  if (!signedIn) {
    return false
  }

  const user = await prisma.user.findUnique({ where: { id: session.accountId }, include: { authenticators: true } })
  if (!user) {
    return
  }

  const options: PublicKeyCredentialCreationOptionsJSON = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: user.email,
    // Don't prompt users for additional information about the authenticator
    // (Recommended for smoother UX)
    attestationType: 'none',
    // Prevent users from re-registering existing authenticators
    excludeCredentials: user.authenticators.map(passkey => ({
      id: passkey.id,
    })),
    // See "Guiding use of authenticators via authenticatorSelection" below
    authenticatorSelection: {
      // Defaults
      residentKey: 'preferred',
      userVerification: 'preferred',
      // Optional
      // authenticatorAttachment: 'platform',
    },
  });
  ctx.body = options;
  ctx.session.registration = options;
});


const bodyParser = koaBody({
  text: false, json: true, patchNode: true, patchKoa: true,
});



router.post('/verify-registration', bodyParser, async (ctx) => {
  const session = await provider.Session.get(ctx)
  const signedIn = !!session.accountId

  if (!signedIn) {
    return false
  }

  const user = await prisma.user.findUnique({ where: { id: session.accountId } })
  if (!user) {
    return
  }

  let verification: VerifiedRegistrationResponse;
  try {
    verification = await verifyRegistrationResponse({
      response: ctx.request.body,
      expectedChallenge: ctx.session.registration.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });
  } catch (error) {
    console.error(error);
    ctx.res.statusCode = 400
    ctx.body = { error: error.message };
    return;
  }

  if (!verification.verified) {
    ctx.res.statusCode = 400
    ctx.body = { error: 'Authenticator verification failed.' };
    return;
  }

  const info = verification.registrationInfo!;
  await prisma.authenticator.create({
    data: {
      // Created by `generateRegistrationOptions()` in Step 1
      webauthnUserID: ctx.session.registration.user.id,
      // A unique identifier for the credential
      id: info.credential.id,
      // The public key bytes, used for subsequent authentication signature verification
      publicKey: Buffer.from(info.credential.publicKey),
      // The number of times the authenticator has been used on this site so far
      counter: info.credential.counter,
      // How the browser can talk with this credential's authenticator
      transports: info.credential.transports?.join(','),
      // Whether the passkey is single-device or multi-device
      deviceType: info.credentialDeviceType,
      // Whether the passkey has been backed up in some way
      backedUp: info.credentialBackedUp,
      userId: user.id,
      friendlyName: ctx.request.body.friendlyName,
    }
  })

  ctx.body = verification;
});


router.get('/interaction/:uid/webauthn/challenge', async (ctx) => {
  // Retrieve interaction details
  const { prompt: { name }, uid } = await provider.interactionDetails(ctx.req, ctx.res);
  assert.equal(name, 'login');

  // Generate challenge
  const options: PublicKeyCredentialRequestOptionsJSON = await generateAuthenticationOptions({
    rpID,
  });

  // Set session and body
  ctx.session.challenge = options.challenge;
  ctx.body = options;
});

router.post('/interaction/:uid/webauthn/verify', bodyParser, async (ctx) => {
  // Retrieve interaction details
  const { prompt: { name }, uid } = await provider.interactionDetails(ctx.req, ctx.res);
  assert.equal(name, 'login');

  // Retrieve authenticator
  const authenticator = await findAuthenticatorById(ctx.request.body.response.id);
  if (!authenticator) {
    ctx.res.statusCode = 400
    ctx.body = { error: 'Unkown authenticator' };
    return;
  }
  // Verify authentication
  let verification: VerifiedAuthenticationResponse;
  try {
    verification = await verifyAuthenticationResponse({
      response: ctx.request.body.response,
      expectedChallenge: ctx.session.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: authenticator.webauthnUserID,
        publicKey: authenticator.publicKey,
        counter: authenticator.counter,
      }
    });
  } catch (error) {
    console.error(error);
    ctx.res.statusCode = 400
    ctx.body = { error: error.message };
    return;
  }

  if (!verification.verified) {
    ctx.res.statusCode = 400
    ctx.body = { error: 'Authenticator verification failed.' };
    return;
  }

  await prisma.authenticator.update({
    where: { id: authenticator.id },
    data: {
      counter: verification.authenticationInfo.newCounter,
      lastUsed: new Date(),
    }
  })

  ctx.body = { verified: verification.verified };

  const result = {
    login: {
      accountId: authenticator.user.id,
    },
  };

  // Push interaction result and return next url
  ctx.body.returnTo = await provider.interactionResult(ctx.req, ctx.res, result, {
    mergeWithLastSubmission: false,
  });
})



export default router;
