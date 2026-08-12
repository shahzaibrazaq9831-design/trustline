-- MySQL 8+ schema, equivalent to the SQLite schema used in dev.
-- Run this against your MySQL instance, then point the backend's DB layer
-- at it (swap src/config/db.js for a mysql2 pool — see README.md).

CREATE DATABASE IF NOT EXISTS trustline_bank
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE trustline_bank;

CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  cnic_encrypted TEXT,
  failed_login_attempts INT NOT NULL DEFAULT 0,
  locked_until DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE accounts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  account_number_encrypted TEXT NOT NULL,
  account_type VARCHAR(30) NOT NULL DEFAULT 'Current',
  balance_cents BIGINT NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'PKR',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_accounts_user (user_id)
) ENGINE=InnoDB;

CREATE TABLE transactions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  from_account_id BIGINT UNSIGNED NULL,
  to_account_id BIGINT UNSIGNED NULL,
  amount_cents BIGINT NOT NULL,
  type VARCHAR(20) NOT NULL,
  description VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (from_account_id) REFERENCES accounts(id),
  FOREIGN KEY (to_account_id) REFERENCES accounts(id),
  INDEX idx_tx_from (from_account_id),
  INDEX idx_tx_to (to_account_id)
) ENGINE=InnoDB;

CREATE TABLE refresh_tokens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  revoked TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_refresh_user (user_id)
) ENGINE=InnoDB;

-- Recommended for production, beyond this file:
--   * A dedicated MySQL user for the app with GRANTs limited to this database only
--     (no DROP/ALTER in production credentials, no access to other schemas).
--   * TLS-enforced connections (require_secure_transport = ON).
--   * Encryption at rest for the whole instance (e.g. RDS/Cloud SQL storage encryption)
--     as a second layer, on top of the app-level AES-256 field encryption.
