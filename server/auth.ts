import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User, InsertUser, Account, users, accounts } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { db } from "./db";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import nodemailer from "nodemailer";



declare global {
  namespace Express {
    interface User extends Omit<User, "password"> {}
  }
}

// Security utilities
const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Email verification and password reset functions
async function sendVerificationEmail(user: User, origin: string): Promise<void> {
  const testAccount = await nodemailer.createTestAccount();
  const transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  const verificationToken = uuidv4();
  await db.update(users)
    .set({ verificationToken })
    .where(eq(users.id, user.id));

  const verificationUrl = `${origin}/verify-email?token=${verificationToken}`;

  const info = await transporter.sendMail({
    from: '"Echoverse" <no-reply@echoverse.com>',
    to: user.email,
    subject: "Verify your email address",
    text: `Please verify your email address by clicking this link: ${verificationUrl}`,
    html: `<p>Please verify your email address by clicking this link: <a href="${verificationUrl}">${verificationUrl}</a></p>`,
  });

  console.log("Verification email sent: %s", info.messageId);
  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
}

async function sendPasswordResetEmail(email: string, origin: string): Promise<void> {
  const user = await storage.getUserByEmail(email);
  if (!user) return;

  const testAccount = await nodemailer.createTestAccount();
  const transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetExpires = new Date();
  resetExpires.setHours(resetExpires.getHours() + 1);

  await db.update(users)
    .set({ resetPasswordToken: resetToken, resetPasswordExpires: resetExpires })
    .where(eq(users.id, user.id));

  const resetUrl = `${origin}/reset-password?token=${resetToken}`;

  const info = await transporter.sendMail({
    from: '"Echoverse" <no-reply@echoverse.com>',
    to: user.email,
    subject: "Reset your password",
    text: `Reset your password by clicking this link: ${resetUrl}. This link is valid for 1 hour.`,
    html: `<p>Reset your password by clicking this link: <a href="${resetUrl}">${resetUrl}</a>. This link is valid for 1 hour.</p>`,
  });

  console.log("Password reset email sent: %s", info.messageId);
  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
}

// Authentication middleware
export function isAuthenticated(req: Request, res: Response, next: NextFunction): void {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

export function isAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.isAuthenticated() && req.user.role === "admin") {
    return next();
  }
  res.status(403).json({ message: "Forbidden" });
}

export function setupAuth(app: Express): void {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      {
        usernameField: "username",
        passwordField: "password",
      },
      async (username, password, done) => {
        try {
          const user = await storage.getUserByUsername(username);
          if (!user || !user.password) {
            return done(null, false, { message: "Invalid username or password" });
          }

          const isValid = await comparePasswords(password, user.password);
          if (!isValid) {
            return done(null, false, { message: "Invalid username or password" });
          }

          const { password: _, ...userWithoutPassword } = user;
          await db.update(users)
            .set({ lastLoginAt: new Date() })
            .where(eq(users.id, user.id));

          return done(null, userWithoutPassword);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: "/api/auth/google/callback",
          scope: ["profile", "email"],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const [existingAccount] = await db
              .select()
              .from(accounts)
              .where(and(eq(accounts.provider, "google"), eq(accounts.providerAccountId, profile.id)));

            if (existingAccount) {
              const user = await storage.getUser(existingAccount.userId);
              if (!user) {
                return done(new Error("User not found"));
              }

              await db.update(accounts)
                .set({
                  accessToken,
                  refreshToken,
                  updatedAt: new Date(),
                })
                .where(eq(accounts.id, existingAccount.id));

              const { password: _, ...userWithoutPassword } = user;
              await db.update(users)
                .set({ lastLoginAt: new Date() })
                .where(eq(users.id, user.id));

              return done(null, userWithoutPassword);
            }

            const email = profile.emails && profile.emails[0]?.value;
            if (!email) {
              return done(new Error("Email not provided by Google"));
            }

            const existingUser = await storage.getUserByEmail(email);
            if (existingUser) {
              await db.insert(accounts).values({
                userId: existingUser.id,
                provider: "google",
                providerAccountId: profile.id,
                accessToken,
                refreshToken,
                idToken: profile._json.id_token,
              });

              const { password: _, ...userWithoutPassword } = existingUser;
              await db.update(users)
                .set({ lastLoginAt: new Date() })
                .where(eq(users.id, existingUser.id));

              return done(null, userWithoutPassword);
            }

            const name = profile.displayName || `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim();
            const username = `google_${profile.id}`;

            const newUser = await storage.createUser({
              username,
              email,
              password: null,
              role: "user",
              fullName: name,
              firstName: profile.name?.givenName || null,
              lastName: profile.name?.familyName || null,
              emailVerified: true,
              avatar: profile.photos?.[0]?.value || null,
              onboardingCompleted: false,
              onboardingStep: 1,
            });

            await db.insert(accounts).values({
              userId: newUser.id,
              provider: "google",
              providerAccountId: profile.id,
              accessToken,
              refreshToken,
              idToken: profile._json.id_token,
            });

            const { password: _, ...userWithoutPassword } = newUser;
            return done(null, userWithoutPassword);
          } catch (error) {
            return done(error);
          }
        }
      )
    );
  }

  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
          callbackURL: "/api/auth/github/callback",
          scope: ["user:email"],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const [existingAccount] = await db
              .select()
              .from(accounts)
              .where(and(eq(accounts.provider, "github"), eq(accounts.providerAccountId, profile.id)));

            if (existingAccount) {
              const user = await storage.getUser(existingAccount.userId);
              if (!user) {
                return done(new Error("User not found"));
              }

              await db.update(accounts)
                .set({
                  accessToken,
                  refreshToken,
                  updatedAt: new Date(),
                })
                .where(eq(accounts.id, existingAccount.id));

              const { password: _, ...userWithoutPassword } = user;
              await db.update(users)
                .set({ lastLoginAt: new Date() })
                .where(eq(users.id, user.id));

              return done(null, userWithoutPassword);
            }
            // Handling account creation for GitHub
          } catch (error) {
            return done(error);
          }
        }
      )
    );
  }
}
