<?php

// GTD Todo App API Entry Point
// This is a minimal entry point for testing the Docker infrastructure

header('Content-Type: application/json');

// Simple health check endpoint
if ($_SERVER['REQUEST_URI'] === '/api/health') {
    http_response_code(200);
    echo json_encode([
        'status' => 'healthy',
        'timestamp' => date('c'),
        'environment' => getenv('APP_ENV') ?: 'unknown'
    ]);
    exit;
}

// Default response
http_response_code(200);
echo json_encode([
    'message' => 'GTD Todo App API',
    'version' => '0.1.0',
    'status' => 'infrastructure-test'
]);
