import type { RequestHandler } from "express";
import { prisma } from "../lib/prisma.js";

const id = process.env.GOOGLE_CLIENT_ID;
const secret = process.env.GOOGLE_CLIENT_SECRET;
const cb = process.env.GOOGLE_CALLBACK_URL;

export let isGoogleOAuthConfigured = false;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let passportLib: any = null;
let initializeMiddleware: RequestHandler | null = null;

/**
 * Loads passport (and Google strategy if env is set). Safe if packages are missing:
 * email/password auth still works after a noop initialize middleware.
 */
export async function loadPassport(): Promise<void> {
  isGoogleOAuthConfigured = false;
  passportLib = null;
  initializeMiddleware = null;

  let passport: typeof import("passport").default;
  try {
    passport = (await import("passport")).default;
  } catch {
    console.warn(
      "[auth] Package `passport` is missing. Run `npm install` in the server folder. Google sign-in disabled; email/password login still works."
    );
    return;
  }

  passportLib = passport;
  initializeMiddleware = passport.initialize();

  if (!(id && secret && cb)) return;

  try {
    const { Strategy: GoogleStrategy } = await import("passport-google-oauth20");
    passport.use(
      new GoogleStrategy(
        {
          clientID: id,
          clientSecret: secret,
          callbackURL: cb,
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const raw = profile.emails?.[0]?.value;
            const email = raw?.trim().toLowerCase();
            if (!email) {
              return done(new Error("No email from Google"), undefined);
            }

            let user = await prisma.user.findUnique({ where: { email } });
            if (!user) {
              user = await prisma.user.create({
                data: { email, googleId: profile.id },
              });
            } else if (!user.googleId) {
              user = await prisma.user.update({
                where: { id: user.id },
                data: { googleId: profile.id },
              });
            }
            return done(null, user);
          } catch (e) {
            return done(e as Error, undefined);
          }
        }
      )
    );
    isGoogleOAuthConfigured = true;
  } catch {
    console.warn(
      "[auth] `passport-google-oauth20` failed to load. Google sign-in disabled. Run `npm install` in the server folder."
    );
  }
}

export function passportInitialize(): RequestHandler {
  if (initializeMiddleware) return initializeMiddleware;
  return (_req, _res, next) => next();
}

export function getPassport(): typeof import("passport").default | null {
  return passportLib;
}
