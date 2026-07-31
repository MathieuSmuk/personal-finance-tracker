import argon2 from "argon2";

import pool from "../db/index.js";

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

const DUMMY_PASSWORD_HASH = await argon2.hash(
  "ThisPasswordIsNeverUsedForLogin",
  ARGON2_OPTIONS,
);

function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function saveSession(req) {
  return new Promise((resolve, reject) => {
    req.session.save((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

export async function registerUser(req, res) {
  const { name, email, password } = req.body;
  const normalizedEmail = email.toLowerCase();

  try {
    const passwordHash = await argon2.hash(password, ARGON2_OPTIONS);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`,
      [name, normalizedEmail, passwordHash],
    );

    const user = result.rows[0];

    await regenerateSession(req);

    req.session.userId = user.id;

    await saveSession(req);

    return res.status(201).json({
      message: "User registered and authenticated successfully.",
      user,
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        message: "An account with that email already exists.",
      });
    }

    console.error("User registration failed:", error);

    return res.status(500).json({
      message: "Unable to register user.",
    });
  }
}

export async function loginUser(req, res) {
  const { email, password } = req.body;
  const normalizedEmail = email.toLowerCase();

  try {
    const result = await pool.query(
      `SELECT id, name, email, password_hash, created_at
       FROM users
       WHERE LOWER(email) = $1`,
      [normalizedEmail],
    );

    const user = result.rows[0];

    const hashToVerify = user ? user.password_hash : DUMMY_PASSWORD_HASH;

    const passwordMatches = await argon2.verify(hashToVerify, password);

    if (!user || !passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    await regenerateSession(req);

    req.session.userId = user.id;

    await saveSession(req);

    return res.status(200).json({
      message: "Login successful.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error("User login failed:", error);

    return res.status(500).json({
      message: "Unable to log in.",
    });
  }
}

export async function getCurrentUser(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, name, email, created_at
       FROM users
       WHERE id = $1`,
      [req.session.userId],
    );

    if (result.rows.length === 0) {
      req.session.destroy(() => {});

      return res.status(401).json({
        message: "Authentication required.",
      });
    }

    return res.status(200).json({
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Unable to retrieve current user:", error);

    return res.status(500).json({
      message: "Unable to retrieve current user.",
    });
  }
}
