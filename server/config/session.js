import connectPgSimple from "connect-pg-simple";
import session from "express-session";

import pool from "../db/index.js";

const PostgresSessionStore = connectPgSimple(session);

const isProduction = process.env.NODE_ENV === "production";

const sessionStore = new PostgresSessionStore({
  pool,
  tableName: "user_sessions",
});

const sessionMiddleware = session({
  store: sessionStore,
  name: "finance.sid",
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
});

export default sessionMiddleware;
