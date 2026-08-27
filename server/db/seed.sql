BEGIN;

-- =========================================================
-- RESET DEVELOPMENT DATA
-- =========================================================
-- WARNING: This removes every existing user, session,
-- account, category, and transaction in the current database.

TRUNCATE TABLE
    user_sessions,
    transactions,
    categories,
    accounts,
    users
RESTART IDENTITY
CASCADE;

-- =========================================================
-- DEMO USER
-- =========================================================
-- Login:
-- Email: demo@example.com
-- Password: FinanceDemo2026!

INSERT INTO users (
    name,
    email,
    password_hash
)
VALUES (
    'Demo User',
    'demo@example.com',
    '$argon2id$v=19$m=19456,p=1,t=2$RGXG5/x4S/Xi5jcINYfVLg$BtV6YXacMu+SLeUVt+HfzWrjArv/YZen/5+Wa7tLadQ'
);

-- =========================================================
-- ACCOUNTS
-- =========================================================

INSERT INTO accounts (
    user_id,
    name,
    account_type,
    opening_balance,
    is_archived
)
SELECT
    users.id,
    account_data.name,
    account_data.account_type,
    account_data.opening_balance,
    account_data.is_archived
FROM users
CROSS JOIN (
    VALUES
        ('Everyday Chequing', 'chequing', 2450.00, FALSE),
        ('Emergency Savings', 'savings', 8500.00, FALSE),
        ('Wallet Cash', 'cash', 120.00, FALSE),
        ('Old Chequing', 'chequing', 500.00, TRUE)
) AS account_data (
    name,
    account_type,
    opening_balance,
    is_archived
)
WHERE LOWER(users.email) = LOWER('demo@example.com');

-- =========================================================
-- INCOME CATEGORIES
-- =========================================================

INSERT INTO categories (
    user_id,
    name,
    transaction_type,
    color,
    is_archived
)
SELECT
    users.id,
    category_data.name,
    category_data.transaction_type,
    category_data.color,
    category_data.is_archived
FROM users
CROSS JOIN (
    VALUES
        ('Employment', 'income', '#16A34A', FALSE),
        ('Freelance', 'income', '#2563EB', FALSE),
        ('Interest', 'income', '#0891B2', FALSE),
        ('Gifts', 'income', '#9333EA', FALSE)
) AS category_data (
    name,
    transaction_type,
    color,
    is_archived
)
WHERE LOWER(users.email) = LOWER('demo@example.com');

-- =========================================================
-- EXPENSE CATEGORIES
-- =========================================================

INSERT INTO categories (
    user_id,
    name,
    transaction_type,
    color,
    is_archived
)
SELECT
    users.id,
    category_data.name,
    category_data.transaction_type,
    category_data.color,
    category_data.is_archived
FROM users
CROSS JOIN (
    VALUES
        ('Housing', 'expense', '#DC2626', FALSE),
        ('Groceries', 'expense', '#EA580C', FALSE),
        ('Dining', 'expense', '#D97706', FALSE),
        ('Transportation', 'expense', '#CA8A04', FALSE),
        ('Utilities', 'expense', '#4F46E5', FALSE),
        ('Entertainment', 'expense', '#7C3AED', FALSE),
        ('Health', 'expense', '#DB2777', FALSE),
        ('Shopping', 'expense', '#64748B', FALSE),
        ('Travel', 'expense', '#0D9488', TRUE)
) AS category_data (
    name,
    transaction_type,
    color,
    is_archived
)
WHERE LOWER(users.email) = LOWER('demo@example.com');

-- =========================================================
-- TRANSACTIONS
-- =========================================================

INSERT INTO transactions (
    user_id,
    account_id,
    category_id,
    transaction_type,
    amount,
    description,
    transaction_date,
    notes
)
SELECT
    users.id,
    accounts.id,
    categories.id,
    transaction_data.transaction_type,
    transaction_data.amount,
    transaction_data.description,
    transaction_data.transaction_date,
    transaction_data.notes
FROM (
    VALUES
        -- January
        (
            'Everyday Chequing',
            'Employment',
            'income',
            3200.00,
            'January salary',
            DATE '2026-01-02',
            'Monthly employment income'
        ),
        (
            'Everyday Chequing',
            'Housing',
            'expense',
            1450.00,
            'January rent',
            DATE '2026-01-03',
            'Monthly apartment rent'
        ),
        (
            'Everyday Chequing',
            'Groceries',
            'expense',
            126.45,
            'Weekly groceries',
            DATE '2026-01-07',
            'Produce, pantry items, and household supplies'
        ),
        (
            'Everyday Chequing',
            'Utilities',
            'expense',
            92.18,
            'Internet bill',
            DATE '2026-01-12',
            'Monthly home internet'
        ),
        (
            'Wallet Cash',
            'Dining',
            'expense',
            18.75,
            'Lunch with a friend',
            DATE '2026-01-18',
            NULL
        ),

        -- February
        (
            'Everyday Chequing',
            'Employment',
            'income',
            3200.00,
            'February salary',
            DATE '2026-02-02',
            'Monthly employment income'
        ),
        (
            'Everyday Chequing',
            'Housing',
            'expense',
            1450.00,
            'February rent',
            DATE '2026-02-03',
            'Monthly apartment rent'
        ),
        (
            'Everyday Chequing',
            'Groceries',
            'expense',
            98.32,
            'Weekly groceries',
            DATE '2026-02-08',
            'Groceries for meal preparation'
        ),
        (
            'Everyday Chequing',
            'Transportation',
            'expense',
            112.00,
            'Monthly transit pass',
            DATE '2026-02-10',
            'Public transportation'
        ),
        (
            'Everyday Chequing',
            'Entertainment',
            'expense',
            54.99,
            'Video game purchase',
            DATE '2026-02-21',
            'Weekend entertainment'
        ),

        -- March
        (
            'Everyday Chequing',
            'Employment',
            'income',
            3200.00,
            'March salary',
            DATE '2026-03-02',
            'Monthly employment income'
        ),
        (
            'Everyday Chequing',
            'Housing',
            'expense',
            1450.00,
            'March rent',
            DATE '2026-03-03',
            'Monthly apartment rent'
        ),
        (
            'Everyday Chequing',
            'Freelance',
            'income',
            675.00,
            'Website design project',
            DATE '2026-03-09',
            'Freelance development payment'
        ),
        (
            'Wallet Cash',
            'Groceries',
            'expense',
            42.67,
            'Neighbourhood market',
            DATE '2026-03-14',
            'Fresh groceries and bakery items'
        ),
        (
            'Everyday Chequing',
            'Health',
            'expense',
            86.40,
            'Prescription refill',
            DATE '2026-03-22',
            'Pharmacy purchase'
        ),

        -- April
        (
            'Everyday Chequing',
            'Employment',
            'income',
            3200.00,
            'April salary',
            DATE '2026-04-02',
            'Monthly employment income'
        ),
        (
            'Everyday Chequing',
            'Housing',
            'expense',
            1450.00,
            'April rent',
            DATE '2026-04-03',
            'Monthly apartment rent'
        ),
        (
            'Everyday Chequing',
            'Groceries',
            'expense',
            138.91,
            'Weekly groceries',
            DATE '2026-04-09',
            'Groceries and cleaning supplies'
        ),
        (
            'Everyday Chequing',
            'Utilities',
            'expense',
            74.26,
            'Electricity bill',
            DATE '2026-04-15',
            'Monthly electricity payment'
        ),
        (
            'Everyday Chequing',
            'Shopping',
            'expense',
            129.99,
            'New office chair',
            DATE '2026-04-24',
            'Home office improvement'
        ),

        -- May
        (
            'Everyday Chequing',
            'Employment',
            'income',
            3200.00,
            'May salary',
            DATE '2026-05-01',
            'Monthly employment income'
        ),
        (
            'Everyday Chequing',
            'Housing',
            'expense',
            1450.00,
            'May rent',
            DATE '2026-05-03',
            'Monthly apartment rent'
        ),
        (
            'Everyday Chequing',
            'Groceries',
            'expense',
            115.72,
            'Weekly groceries',
            DATE '2026-05-10',
            'Groceries for the week'
        ),
        (
            'Emergency Savings',
            'Interest',
            'income',
            34.28,
            'Savings interest',
            DATE '2026-05-15',
            'Quarterly interest payment'
        ),
        (
            'Everyday Chequing',
            'Dining',
            'expense',
            76.55,
            'Birthday dinner',
            DATE '2026-05-23',
            'Dinner at a local restaurant'
        ),

        -- June
        (
            'Everyday Chequing',
            'Employment',
            'income',
            3200.00,
            'June salary',
            DATE '2026-06-02',
            'Monthly employment income'
        ),
        (
            'Everyday Chequing',
            'Housing',
            'expense',
            1450.00,
            'June rent',
            DATE '2026-06-03',
            'Monthly apartment rent'
        ),
        (
            'Everyday Chequing',
            'Freelance',
            'income',
            950.00,
            'React consulting work',
            DATE '2026-06-11',
            'Freelance frontend development'
        ),
        (
            'Everyday Chequing',
            'Transportation',
            'expense',
            68.34,
            'Fuel purchase',
            DATE '2026-06-17',
            'Transportation expense'
        ),
        (
            'Wallet Cash',
            'Entertainment',
            'expense',
            32.00,
            'Cinema tickets',
            DATE '2026-06-25',
            'Evening movie'
        ),

        -- July
        (
            'Everyday Chequing',
            'Employment',
            'income',
            3200.00,
            'July salary',
            DATE '2026-07-02',
            'Monthly employment income'
        ),
        (
            'Everyday Chequing',
            'Housing',
            'expense',
            1450.00,
            'July rent',
            DATE '2026-07-03',
            'Monthly apartment rent'
        ),
        (
            'Everyday Chequing',
            'Groceries',
            'expense',
            143.08,
            'Weekly groceries',
            DATE '2026-07-09',
            'Groceries and household supplies'
        ),
        (
            'Everyday Chequing',
            'Gifts',
            'income',
            200.00,
            'Birthday gift',
            DATE '2026-07-16',
            'Gift from family'
        ),
        (
            'Everyday Chequing',
            'Utilities',
            'expense',
            118.63,
            'Mobile and internet bills',
            DATE '2026-07-22',
            'Monthly communication services'
        ),

        -- August
        (
            'Everyday Chequing',
            'Employment',
            'income',
            3200.00,
            'August salary',
            DATE '2026-08-04',
            'Monthly employment income'
        ),
        (
            'Everyday Chequing',
            'Housing',
            'expense',
            1450.00,
            'August rent',
            DATE '2026-08-05',
            'Monthly apartment rent'
        ),
        (
            'Everyday Chequing',
            'Groceries',
            'expense',
            121.36,
            'Weekly groceries',
            DATE '2026-08-11',
            'Groceries for meal preparation'
        ),
        (
            'Everyday Chequing',
            'Health',
            'expense',
            64.50,
            'Dental cleaning',
            DATE '2026-08-18',
            'Routine health appointment'
        ),
        (
            'Everyday Chequing',
            'Dining',
            'expense',
            48.90,
            'Weekend dinner',
            DATE '2026-08-23',
            'Dinner with friends'
        ),

        -- Historical archived records
        (
            'Old Chequing',
            'Employment',
            'income',
            2750.00,
            'Final deposit to old account',
            DATE '2025-11-28',
            'Historical transaction from archived account'
        ),
        (
            'Old Chequing',
            'Travel',
            'expense',
            640.00,
            'Hotel reservation',
            DATE '2025-12-05',
            'Historical transaction in archived travel category'
        ),
        (
            'Old Chequing',
            'Travel',
            'expense',
            315.80,
            'Train tickets',
            DATE '2025-12-06',
            'Historical holiday travel'
        )
) AS transaction_data (
    account_name,
    category_name,
    transaction_type,
    amount,
    description,
    transaction_date,
    notes
)
JOIN users
    ON LOWER(users.email) = LOWER('demo@example.com')
JOIN accounts
    ON accounts.user_id = users.id
    AND accounts.name = transaction_data.account_name
JOIN categories
    ON categories.user_id = users.id
    AND categories.name = transaction_data.category_name
    AND categories.transaction_type =
        transaction_data.transaction_type;

COMMIT;
