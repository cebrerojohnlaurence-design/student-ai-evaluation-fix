<?php
// Activity 3: Simple PHP REST API with CRUD (No JWT yet)

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");

// 1. Connect to the database we just made
$host = "localhost";
$db_name = "school_api_db";
$username = "root"; // Default XAMPP username
$password = "";     // Default XAMPP password is blank

try {
    $conn = new PDO("mysql:host=" . $host . ";dbname=" . $db_name, $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $exception) {
    echo json_encode(["error" => "Database Connection error: " . $exception->getMessage()]);
    exit();
}

// --- NEW CODE FOR ACTIVITY 4: JWT AUTHENTICATION ---
$secret_key = "jayanne_super_secret_key"; // Your custom secret key!

// Function to create a digital token (VIP Pass)
function create_jwt($payload, $secret) {
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
    $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode(json_encode($payload)));
    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $secret, true);
    $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
}

// Function to check if a token is valid
function verify_jwt($jwt, $secret) {
    $tokenParts = explode('.', $jwt);
    if(count($tokenParts) != 3) return false;
    $header = $tokenParts[0];
    $payload = $tokenParts[1];
    $signature_provided = $tokenParts[2];
    
    $signature = hash_hmac('sha256', $header . "." . $payload, $secret, true);
    $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    
    return ($base64UrlSignature === $signature_provided);
}

// 1. LOGIN ENDPOINT (Run this first in Postman to get your token!)
if (isset($_GET['login'])) {
    $payload = [
        "user" => "jay-anne",
        "exp" => time() + 3600 // Token expires in 1 hour
    ];
    $jwt = create_jwt($payload, $secret_key);
    echo json_encode(["message" => "Login successful!", "token" => $jwt]);
    exit();
}

// 2. CHECK FOR TOKEN BEFORE ALLOWING ANYONE TO SEE THE DATA
$headers = apache_request_headers();
if (!isset($headers['Authorization'])) {
    http_response_code(401);
    echo json_encode(["error" => "Access denied. You need a JWT token!"]);
    exit();
}

$authHeader = $headers['Authorization'];
$jwt = str_replace("Bearer ", "", $authHeader);

if (!verify_jwt($jwt, $secret_key)) {
    http_response_code(401);
    echo json_encode(["error" => "Access denied. Invalid or expired token."]);
    exit();
}
// --- END OF NEW ACTIVITY 4 CODE ---

// 2. Find out what kind of request is being sent (GET, POST, PUT, DELETE)
$method = $_SERVER['REQUEST_METHOD'];
$data = json_decode(file_get_contents("php://input"));

// 3. Perform the CRUD operations
switch($method) {
    case 'GET': // READ data
        $stmt = $conn->prepare("SELECT * FROM users");
        $stmt->execute();
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($users);
        break;

    case 'POST': // CREATE new data
        if(!empty($data->name) && !empty($data->email)) {
            $stmt = $conn->prepare("INSERT INTO users (name, email) VALUES (:name, :email)");
            $stmt->bindParam(":name", $data->name);
            $stmt->bindParam(":email", $data->email);
            if($stmt->execute()) {
                echo json_encode(["message" => "User created successfully!"]);
            }
        } else {
            echo json_encode(["error" => "Please provide a name and email."]);
        }
        break;

    case 'PUT': // UPDATE existing data
        if(!empty($data->id) && !empty($data->name) && !empty($data->email)) {
            $stmt = $conn->prepare("UPDATE users SET name = :name, email = :email WHERE id = :id");
            $stmt->bindParam(":name", $data->name);
            $stmt->bindParam(":email", $data->email);
            $stmt->bindParam(":id", $data->id);
            if($stmt->execute()) {
                echo json_encode(["message" => "User updated successfully!"]);
            }
        }
        break;

    case 'DELETE': // DELETE data
        if(!empty($data->id)) {
            $stmt = $conn->prepare("DELETE FROM users WHERE id = :id");
            $stmt->bindParam(":id", $data->id);
            if($stmt->execute()) {
                echo json_encode(["message" => "User deleted successfully!"]);
            }
        }
        break;
}
?>