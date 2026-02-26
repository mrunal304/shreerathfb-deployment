import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api, errorSchemas } from "@shared/routes";
import { z } from "zod";
import session from "express-session";
import MemoryStore from "memorystore";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { connectDB } from "./db";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Connect to MongoDB
  await connectDB();

  // Session Setup
  const SessionStore = MemoryStore(session);
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "shree-rath-secret",
      resave: false,
      saveUninitialized: false,
      store: new SessionStore({
        checkPeriod: 86400000,
      }),
      cookie: { 
        secure: false, // Set to false for compatibility with non-https servers
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      },
    })
  );

  // Passport Setup
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy((username, password, done) => {
      // Hardcoded admin credentials as requested
      // Note: Updated password to avoid compromise warnings
      if (username === "admin" && password === "shreerath_admin_2026") {
        return done(null, { id: "admin", username: "admin", role: "admin" });
      }
      return done(null, false, { message: "Invalid credentials" });
    })
  );

  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((user: any, done) => done(null, user));

  // Middleware to check auth
  const requireAuth = (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ message: "Unauthorized" });
  };

  // Auth Routes
  app.post(api.auth.login.path, (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info.message });
      req.logIn(user, (err) => {
        if (err) return next(err);
        return res.status(200).json({ message: "Login successful", user });
      });
    })(req, res, next);
  });

  app.post(api.auth.logout.path, (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.status(200).json({ message: "Logged out" });
    });
  });

  app.get(api.auth.me.path, (req, res) => {
    if (req.isAuthenticated()) {
      res.status(200).json(req.user);
    } else {
      res.status(200).json(null);
    }
  });

  // Feedback Routes
  app.post(api.feedback.create.path, async (req, res) => {
    try {
      const input = api.feedback.create.input.parse(req.body);
      const result = await storage.createFeedback(input);
      res.status(201).json(result);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      // Check for duplicate key error (MongoDB code 11000)
      if (err.code === 11000) {
        return res.status(409).json({ message: "You have already submitted feedback today. Thank you!" });
      }
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.feedback.list.path, requireAuth, async (req, res) => {
    try {
      // Safely parse query params
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const search = req.query.search as string;
      const date = req.query.date as string;
      const rating = req.query.rating ? parseInt(req.query.rating as string) : undefined;

      const result = await storage.getFeedback({ page, limit, search, date, rating });
      
      res.status(200).json({
        data: result.data,
        pagination: {
          total: result.total,
          page,
          limit,
          pages: Math.ceil(result.total / limit),
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch(api.feedback.markContacted.path, requireAuth, async (req, res) => {
    try {
      const id = req.params.id as string;
      const input = api.feedback.markContacted.input.parse(req.body);
      const updated = await storage.markContacted(id, input);
      if (!updated) {
        return res.status(404).json({ message: "Feedback not found" });
      }
      res.status(200).json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.analytics.get.path, requireAuth, async (req, res) => {
    try {
      const period = (req.query.period as 'week' | 'month') || 'week';
      const data = await storage.getAnalytics(period);
      res.status(200).json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  return httpServer;
}
