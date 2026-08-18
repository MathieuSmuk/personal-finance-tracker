CREATE TABLE users (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_name_not_blank
        CHECK (LENGTH(TRIM(name)) >= 2)
);

CREATE UNIQUE INDEX users_email_unique
ON users (LOWER(email));

CREATE TABLE accounts (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    account_type VARCHAR(20) NOT NULL,
    opening_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT accounts_user_fk
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT accounts_type_valid
        CHECK (account_type IN ('chequing', 'savings', 'cash')),

    CONSTRAINT accounts_name_not_blank
        CHECK (LENGTH(TRIM(name)) >= 1),

    CONSTRAINT accounts_user_name_unique
        UNIQUE (user_id, name),

    CONSTRAINT accounts_user_id_id_unique
        UNIQUE (user_id, id)
);

CREATE TABLE categories (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    transaction_type VARCHAR(10) NOT NULL,
    color VARCHAR(7),
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT categories_user_fk
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT categories_type_valid
        CHECK (transaction_type IN ('income', 'expense')),

    CONSTRAINT categories_name_not_blank
        CHECK (LENGTH(TRIM(name)) >= 1),

    CONSTRAINT categories_color_valid
        CHECK (
            color IS NULL
            OR color ~ '^#[0-9A-Fa-f]{6}$'
        ),

    CONSTRAINT categories_user_name_type_unique
        UNIQUE (user_id, name, transaction_type),

    CONSTRAINT categories_user_id_id_unique
        UNIQUE (user_id, id)
);

CREATE INDEX categories_user_archive_type_name_idx
ON categories (
    user_id,
    is_archived,
    transaction_type,
    name
);

CREATE TABLE transactions (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER NOT NULL,
    account_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    transaction_type VARCHAR(10) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    description VARCHAR(255) NOT NULL,
    transaction_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT transactions_type_valid
        CHECK (transaction_type IN ('income', 'expense')),

    CONSTRAINT transactions_amount_positive
        CHECK (amount > 0),

    CONSTRAINT transactions_description_not_blank
        CHECK (LENGTH(TRIM(description)) >= 1),

    CONSTRAINT transactions_user_fk
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT transactions_account_owner_fk
        FOREIGN KEY (user_id, account_id)
        REFERENCES accounts(user_id, id)
        ON DELETE CASCADE,

    CONSTRAINT transactions_category_owner_fk
        FOREIGN KEY (user_id, category_id)
        REFERENCES categories(user_id, id)
        ON DELETE RESTRICT
);

CREATE INDEX transactions_user_date_idx
ON transactions (user_id, transaction_date DESC);

CREATE INDEX transactions_account_idx
ON transactions (account_id);

CREATE INDEX transactions_category_idx
ON transactions (category_id);

CREATE INDEX transactions_user_type_date_idx
ON transactions (user_id, transaction_type, transaction_date DESC);

CREATE TABLE user_sessions (
    sid VARCHAR NOT NULL PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL
);

CREATE INDEX user_sessions_expire_idx
ON user_sessions (expire);
