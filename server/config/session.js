import connectPgSimple from "connect-pg-simple";
import session from "express-session";

import pool from "../db/index.js";

const PostgresSessionStore = connectPgSimple(session);

const isProduction = process.env.NODE_ENV === "production";

export const SESSION_COOKIE_NAME = "finance.sid";

export const SESSION_COOKIE_CLEAR_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/",
};

const sessionStore = new PostgresSessionStore({
  pool,
  tableName: "user_sessions",
});

const sessionMiddleware = session({
  store: sessionStore,
  name: SESSION_COOKIE_NAME,
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    ...SESSION_COOKIE_CLEAR_OPTIONS,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
});

export default sessionMiddleware;
