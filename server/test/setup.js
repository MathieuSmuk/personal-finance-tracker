process.env.NODE_ENV = "test";

process.env.CLIENT_URL ||= "http://localhost:5173";
process.env.SESSION_SECRET ||= "test-session-secret-not-for-production";

process.env.DB_USER ||= "postgres";
process.env.DB_HOST ||= "localhost";
process.env.DB_NAME ||= "personal_finance_tracker";
process.env.DB_PASSWORD ||= "test-placeholder";
process.env.DB_PORT ||= "5432";
