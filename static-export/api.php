<?php
/**
 * SyncTimer API — armazena e retorna o estado do timer
 * O estado é salvo em timer_state.json na mesma pasta
 */
$file = __DIR__ . '/timer_state.json';

$default = [
    'mode'           => 'countdown',
    'status'         => 'idle',
    'initialSeconds' => 0,
    'currentSeconds' => 0,
    'overtime'       => false,
    'soundPreset'    => 'nenhum',
    'ts'             => 0,
];

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = file_get_contents('php://input');
    $data = json_decode($body, true);

    if (!$data || !isset($data['status'])) {
        http_response_code(400);
        echo json_encode(['error' => 'dados invalidos']);
        exit;
    }

    $data['ts'] = time();

    $fp = fopen($file, 'c');
    if ($fp && flock($fp, LOCK_EX)) {
        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, json_encode($data));
        fflush($fp);
        flock($fp, LOCK_UN);
        fclose($fp);
        echo json_encode(['ok' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'falha ao salvar']);
    }
    exit;
}

// GET
if (file_exists($file)) {
    $content = file_get_contents($file);
    $data    = json_decode($content, true);
    if ($data) {
        echo $content;
    } else {
        echo json_encode($default);
    }
} else {
    echo json_encode($default);
}
