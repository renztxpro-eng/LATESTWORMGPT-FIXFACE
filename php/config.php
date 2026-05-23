<?php
/**
 * WormGPT Cloud Sync - Configuration File with Secure Biometrics Sync
 * Domain: my-angge.x10.mx
 * Database: cjjpipvp_angge123
 */

// Error reporting
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/error.log');

// Headers for CORS
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, User-Agent');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Your database credentials
define('DB_HOST', 'localhost');
define('DB_USER', 'cjjpipvp_angge123');
define('DB_PASS', 'angge123');
define('DB_NAME', 'cjjpipvp_angge123');

// Upload settings - INCREASED TO 1GB
define('MAX_FILE_SIZE', 1073741824); // 1GB in bytes
define('UPLOAD_DIR', __DIR__ . '/../uploads/avatars/');
define('AVATAR_BASE_URL', 'https://my-angge.x10.mx/uploads/avatars/');

// Biometric Face ID Photos Directory
define('PHOTOS_DIR', __DIR__ . '/../uploads/photos/');
define('PHOTOS_BASE_URL', 'https://my-angge.x10.mx/uploads/photos/');

define('TOKEN_EXPIRY_DAYS', 30);

function getDB() {
    $conn = @new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    if ($conn->connect_error) {
        http_response_code(500);
        die(json_encode(['success' => false, 'message' => 'DB connection failed']));
    }
    $conn->set_charset("utf8mb4");
    return $conn;
}

function hashPassword($password) {
    return password_hash($password, PASSWORD_DEFAULT);
}

function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}

function generateToken($length = 32) {
    if (function_exists('random_bytes')) {
        return bin2hex(random_bytes($length));
    }
    return bin2hex(openssl_random_pseudo_bytes($length));
}

function sanitizeInput($data) {
    if (is_array($data)) return array_map('sanitizeInput', $data);
    return htmlspecialchars(strip_tags((string)$data), ENT_QUOTES, 'UTF-8');
}

function validateToken($conn, $userId, $token) {
    $stmt = $conn->prepare("SELECT id FROM worm_auth_tokens WHERE user_id = ? AND token = ? AND is_active = TRUE AND expires_at > NOW()");
    if (!$stmt) return false;
    $stmt->bind_param("is", $userId, $token);
    $stmt->execute();
    return $stmt->get_result()->num_rows > 0;
}

function isAdmin($conn, $userId) {
    $stmt = $conn->prepare("SELECT admin_level FROM worm_users WHERE id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($row = $result->fetch_assoc()) {
        return $row['admin_level'] == 1;
    }
    return false;
}

function createTablesIfNeeded() {
    $conn = getDB();
    
    // Users table with avatar_url and admin fields
    $conn->query("CREATE TABLE IF NOT EXISTS worm_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        fullname VARCHAR(100) DEFAULT '',
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE DEFAULT NULL,
        avatar_url VARCHAR(500) DEFAULT NULL,
        password_hash VARCHAR(255) NOT NULL,
        admin_level INT DEFAULT 0,
        last_ip VARCHAR(45) DEFAULT NULL,
        device_id VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP NULL,
        INDEX idx_username (username),
        INDEX idx_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    
    // Add admin_level column if missing
    $result = $conn->query("SHOW COLUMNS FROM worm_users LIKE 'admin_level'");
    if ($result->num_rows == 0) {
        $conn->query("ALTER TABLE worm_users ADD COLUMN admin_level INT DEFAULT 0 AFTER password_hash");
    }
    
    // Add last_ip column if missing
    $result = $conn->query("SHOW COLUMNS FROM worm_users LIKE 'last_ip'");
    if ($result->num_rows == 0) {
        $conn->query("ALTER TABLE worm_users ADD COLUMN last_ip VARCHAR(45) DEFAULT NULL AFTER admin_level");
    }
    
    // Add device_id column if missing
    $result = $conn->query("SHOW COLUMNS FROM worm_users LIKE 'device_id'");
    if ($result->num_rows == 0) {
        $conn->query("ALTER TABLE worm_users ADD COLUMN device_id VARCHAR(255) DEFAULT NULL AFTER last_ip");
    }
    
    // Add columns if missing
    $result = $conn->query("SHOW COLUMNS FROM worm_users LIKE 'email'");
    if ($result->num_rows == 0) {
        $conn->query("ALTER TABLE worm_users ADD COLUMN email VARCHAR(100) UNIQUE DEFAULT NULL AFTER username");
    }
    
    $result = $conn->query("SHOW COLUMNS FROM worm_users LIKE 'fullname'");
    if ($result->num_rows == 0) {
        $conn->query("ALTER TABLE worm_users ADD COLUMN fullname VARCHAR(100) DEFAULT '' AFTER id");
    }
    
    $result = $conn->query("SHOW COLUMNS FROM worm_users LIKE 'avatar_url'");
    if ($result->num_rows == 0) {
        $conn->query("ALTER TABLE worm_users ADD COLUMN avatar_url VARCHAR(500) DEFAULT NULL AFTER email");
    }
    
    // ========== ADD MISSING VIP AND MESSAGE LIMIT COLUMNS ==========
    
    // Add VIP status column
    $result = $conn->query("SHOW COLUMNS FROM worm_users LIKE 'vip_status'");
    if ($result->num_rows == 0) {
        $conn->query("ALTER TABLE worm_users ADD COLUMN vip_status ENUM('free', 'premium') DEFAULT 'free' AFTER avatar_url");
    }
    
    // Add messages_sent column
    $result = $conn->query("SHOW COLUMNS FROM worm_users LIKE 'messages_sent'");
    if ($result->num_rows == 0) {
        $conn->query("ALTER TABLE worm_users ADD COLUMN messages_sent INT DEFAULT 0 AFTER vip_status");
    }
    
    // Add message_limit column
    $result = $conn->query("SHOW COLUMNS FROM worm_users LIKE 'message_limit'");
    if ($result->num_rows == 0) {
        $conn->query("ALTER TABLE worm_users ADD COLUMN message_limit INT DEFAULT 0 AFTER messages_sent");
    }
    
    // Add last_message_reset column
    $result = $conn->query("SHOW COLUMNS FROM worm_users LIKE 'last_message_reset'");
    if ($result->num_rows == 0) {
        $conn->query("ALTER TABLE worm_users ADD COLUMN last_message_reset DATE DEFAULT NULL AFTER message_limit");
    }
    
    // ========== ADD BIOMETRICS COLUMNS (FINGERPRINT & FACE ID) ==========
    
    // Add biometric_key_index column if missing
    $result = $conn->query("SHOW COLUMNS FROM worm_users LIKE 'biometric_key_index'");
    if ($result->num_rows == 0) {
        $conn->query("ALTER TABLE worm_users ADD COLUMN biometric_key_index INT DEFAULT 0 AFTER last_message_reset");
    }
    
    // Add device_pin column if missing
    $result = $conn->query("SHOW COLUMNS FROM worm_users LIKE 'device_pin'");
    if ($result->num_rows == 0) {
        $conn->query("ALTER TABLE worm_users ADD COLUMN device_pin VARCHAR(255) DEFAULT '' AFTER biometric_key_index");
    }
    
    // Add cred_id column if missing
    $result = $conn->query("SHOW COLUMNS FROM worm_users LIKE 'cred_id'");
    if ($result->num_rows == 0) {
        $conn->query("ALTER TABLE worm_users ADD COLUMN cred_id TEXT DEFAULT NULL AFTER device_pin");
    }
    
    // Add face_image column if missing
    $result = $conn->query("SHOW COLUMNS FROM worm_users LIKE 'face_image'");
    if ($result->num_rows == 0) {
        $conn->query("ALTER TABLE worm_users ADD COLUMN face_image TEXT DEFAULT NULL AFTER cred_id");
    }

    // Auth tokens table
    $conn->query("CREATE TABLE IF NOT EXISTS worm_auth_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        device_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NULL,
        is_active BOOLEAN DEFAULT TRUE,
        FOREIGN KEY (user_id) REFERENCES worm_users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    
    // Chat sessions table
    $conn->query("CREATE TABLE IF NOT EXISTS worm_chat_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        device_id VARCHAR(255),
        session_data LONGTEXT NOT NULL,
        last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES worm_users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    
    // Password resets table
    $conn->query("CREATE TABLE IF NOT EXISTS worm_password_resets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        reset_token VARCHAR(64) NOT NULL,
        expires_at TIMESTAMP NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES worm_users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    
    // Admin logs table
    $conn->query("CREATE TABLE IF NOT EXISTS worm_admin_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        admin_id INT,
        admin_email VARCHAR(255),
        action TEXT,
        target_user_id INT DEFAULT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_admin_id (admin_id),
        INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    
    // Banned users table
    $conn->query("CREATE TABLE IF NOT EXISTS worm_banned_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        banned_by INT NOT NULL,
        reason TEXT,
        duration_type VARCHAR(50),
        duration_value INT,
        banned_until DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES worm_users(id) ON DELETE CASCADE,
        FOREIGN KEY (banned_by) REFERENCES worm_users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    
    // Settings table
    $conn->query("CREATE TABLE IF NOT EXISTS worm_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    
    // Insert default settings if missing
    $default_settings = [
        'free_api_key' => '',
        'free_message_limit' => '20',
        'free_max_tokens' => '2048',
        'free_models' => '["deepseek/deepseek-chat","openai/gpt-5.4-mini"]',
        'premium_api_key' => '',
        'premium_message_limit' => '0',
        'premium_max_tokens' => '4096',
        'premium_models' => '["deepseek/deepseek-chat","deepseek/deepseek-v3.2","openai/gpt-5.4-mini","google/gemini-2.0-flash","meta-llama/llama-4","mistralai/mistral-large"]'
    ];
    
    foreach ($default_settings as $key => $value) {
        $stmt = $conn->prepare("INSERT IGNORE INTO worm_settings (setting_key, setting_value) VALUES (?, ?)");
        $stmt->bind_param("ss", $key, $value);
        $stmt->execute();
        $stmt->close();
    }
    
    // Subscription plans table
    $conn->query("CREATE TABLE IF NOT EXISTS worm_subscription_plans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        daily_message_limit INT NOT NULL DEFAULT 0,
        duration_days INT NOT NULL DEFAULT 0,
        is_active TINYINT DEFAULT 1,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    
    // User subscriptions table
    $conn->query("CREATE TABLE IF NOT EXISTS worm_user_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        plan_id INT NOT NULL,
        daily_message_limit INT NOT NULL,
        messages_used_today INT DEFAULT 0,
        start_date DATETIME NOT NULL,
        expiry_date DATETIME NOT NULL,
        is_active TINYINT DEFAULT 1,
        payment_status ENUM('pending', 'completed', 'expired') DEFAULT 'pending',
        payment_method VARCHAR(50),
        payment_proof TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES worm_users(id) ON DELETE CASCADE,
        FOREIGN KEY (plan_id) REFERENCES worm_subscription_plans(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    
    // Payment methods table
    $conn->query("CREATE TABLE IF NOT EXISTS worm_payment_methods (
        id INT AUTO_INCREMENT PRIMARY KEY,
        method_type ENUM('qr', 'link') NOT NULL,
        title VARCHAR(100) NOT NULL,
        description TEXT,
        qr_code_url TEXT,
        payment_link TEXT,
        account_details TEXT,
        is_active TINYINT DEFAULT 1,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    
    // Payment requests table
    $conn->query("CREATE TABLE IF NOT EXISTS worm_payment_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        plan_id INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        payment_method_id INT,
        reference_number VARCHAR(100),
        proof_image TEXT,
        status ENUM('pending', 'approved', 'rejected', 'expired') DEFAULT 'pending',
        admin_notes TEXT,
        approved_by INT,
        approved_at DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES worm_users(id) ON DELETE CASCADE,
        FOREIGN KEY (plan_id) REFERENCES worm_subscription_plans(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    
    // ========== CREATE API KEYS TABLE FOR MULTIPLE API KEYS ==========
    $conn->query("CREATE TABLE IF NOT EXISTS worm_api_keys (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tier ENUM('free', 'premium') NOT NULL,
        api_key TEXT NOT NULL,
        is_active TINYINT DEFAULT 1,
        priority INT DEFAULT 0,
        usage_count INT DEFAULT 0,
        failure_count INT DEFAULT 0,
        last_used DATETIME,
        last_failed DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX(tier, is_active, priority)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    
    // Insert default subscription plans if table is empty
    $checkPlans = $conn->query("SELECT COUNT(*) as count FROM worm_subscription_plans");
    $planCount = $checkPlans->fetch_assoc()['count'];
    if ($planCount == 0) {
        $conn->query("INSERT INTO worm_subscription_plans (name, price, daily_message_limit, duration_days, sort_order) VALUES
            ('Basic 3 Days', 100.00, 50, 3, 1),
            ('Standard 7 Days', 150.00, 100, 7, 2),
            ('Premium 15 Days', 200.00, 150, 15, 3),
            ('Pro 30 Days', 250.00, 200, 30, 4),
            ('Elite 60 Days', 300.00, 250, 60, 5),
            ('Ultra 90 Days', 350.00, 300, 90, 6),
            ('Extreme 120 Days', 400.00, 350, 120, 7),
            ('Unlimited 30 Days', 500.00, 0, 30, 8),
            ('Unlimited 60 Days', 600.00, 0, 60, 9),
            ('Lifetime Unlimited', 700.00, 0, 0, 10)");
    }
    
    // Set guaranteed admin
    $adminEmail = 'terencesimbre075@gmail.com';
    $conn->query("UPDATE worm_users SET admin_level = 1 WHERE email = '$adminEmail'");
    
    // Create folders automatically if missing
    if (!file_exists(UPLOAD_DIR)) {
        mkdir(UPLOAD_DIR, 0755, true);
    }
    if (!file_exists(PHOTOS_DIR)) {
        mkdir(PHOTOS_DIR, 0755, true);
    }
    
    $conn->close();
}

// Run table creation
createTablesIfNeeded();

// API KEY HELPER FUNCTIONS (for multiple API keys)
function getApiKey($conn, $tier) {
    $result = $conn->query("
        SELECT id, api_key FROM worm_api_keys 
        WHERE tier = '$tier' AND is_active = 1 
        ORDER BY priority ASC, usage_count ASC 
        LIMIT 1
    ");
    
    if ($result && $row = $result->fetch_assoc()) {
        $conn->query("UPDATE worm_api_keys SET usage_count = usage_count + 1, last_used = NOW() WHERE id = {$row['id']}");
        return $row['api_key'];
    }
    
    return null;
}

function getAllApiKeys($conn, $tier) {
    $keys = [];
    $result = $conn->query("
        SELECT id, api_key FROM worm_api_keys 
        WHERE tier = '$tier' AND is_active = 1 
        ORDER BY priority ASC, id ASC
    ");
    
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $keys[] = $row;
        }
    }
    
    return $keys;
}

function markApiKeyFailed($conn, $id) {
    $conn->query("UPDATE worm_api_keys SET failure_count = failure_count + 1, last_failed = NOW() WHERE id = $id");
    
    $check = $conn->query("SELECT failure_count FROM worm_api_keys WHERE id = $id");
    if ($check && $row = $check->fetch_assoc()) {
        if ($row['failure_count'] >= 5) {
            $conn->query("UPDATE worm_api_keys SET is_active = 0 WHERE id = $id");
            return true;
        }
    }
    return false;
}

function resetApiKeyFailure($conn, $id) {
    $conn->query("UPDATE worm_api_keys SET failure_count = 0, last_failed = NULL WHERE id = $id");
}

function migrateApiKeysToNewTable() {
    $conn = getDB();
    $result = $conn->query("SELECT setting_key, setting_value FROM worm_settings WHERE setting_key IN ('free_api_key', 'premium_api_key') AND setting_value != ''");
    while ($row = $result->fetch_assoc()) {
        $tier = str_replace('_api_key', '', $row['setting_key']);
        $api_key = $row['setting_value'];
        $check = $conn->query("SELECT id FROM worm_api_keys WHERE tier = '$tier' AND api_key = '$api_key'");
        if ($check->num_rows == 0 && !empty($api_key)) {
            $conn->query("INSERT INTO worm_api_keys (tier, api_key, priority, is_active) VALUES ('$tier', '$api_key', 10, 1)");
        }
    }
    $conn->close();
}
?>
