import argon2 from "argon2";

import pool from "../db/index.js";

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

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

    return res.status(201).json({
      message: "User registered successfully.",
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
