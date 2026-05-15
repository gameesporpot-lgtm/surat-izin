<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET');
header('Access-Control-Allow-Headers: Content-Type');

$action = $_GET['action'] ?? $_POST['action'] ?? 'submit';

// Simple database menggunakan JSON file
$dbFile = 'izins.json';
if (!file_exists($dbFile)) {
    file_put_contents($dbFile, json_encode([]));
}

function getIzins() {
    global $dbFile;
    return json_decode(file_get_contents($dbFile), true) ?: [];
}

function saveIzins($izins) {
    global $dbFile;
    file_put_contents($dbFile, json_encode($izins, JSON_PRETTY_PRINT));
}

if ($action === 'list') {
    // Ambil semua izins untuk admin
    $izins = getIzins();
    echo json_encode($izins);
    exit;
}

if ($action === 'update') {
    // Update status izin oleh admin
    $input = json_decode(file_get_contents('php://input'), true);
    $izins = getIzins();
    
    if (isset($input['id']) && isset($input['status'])) {
        foreach ($izins as &$izin) {
            if ($izin['id'] == $input['id']) {
                $izin['status'] = $input['status'];
                $izin['updated_at'] = date('Y-m-d H:i:s');
                break;
            }
        }
        saveIzins($izins);
        
        // Kirim notifikasi ke Discord
        sendDiscordNotification($izins[array_search($input['id'], array_column($izins, 'id'))]);
        
        echo json_encode(['success' => true]);
    } else {
        http_response_code(400);
        echo json_encode(['message' => 'ID atau status tidak valid']);
    }
    exit;
}

// Submit izin baru
$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['nama']) || !isset($data['nip']) || !isset($data['jenisIzin'])) {
    http_response_code(400);
    echo json_encode(['message' => 'Data tidak lengkap']);
    exit;
}

// Generate ID unik
$izins = getIzins();
$newId = count($izins) + 1;
$data['id'] = $newId;
$data['status'] = 'pending';
$data['created_at'] = date('Y-m-d H:i:s');
$data['updated_at'] = date('Y-m-d H:i:s');

$izins[] = $data;
saveIzins($izins);

// Kirim ke Discord
sendDiscordNotification($data);

echo json_encode(['success' => true, 'message' => 'Izin berhasil dikirim ke Discord', 'id' => $newId]);

function sendDiscordNotification($izin) {
    $webhookUrl = 'https://discord.com/api/webhooks/1504860497084678286/u4hOdEPHaM5DPV0-uHcEwKPogJ3V1_yMX2P8IXVPHZMpsg4M-gY7TUAHA8DlBcu7YY-d'; // GANTI INI!
    
    $izinTypes = [
        'sakit' => '🩺 **IZIN SAKIT BARU**',
        'acara' => '🎉 **IZIN ACARA BARU**'
    ];
    
    $statusColors = [
        'pending' => 16776960, // Kuning
        'approved' => 65280,   // Hijau
        'rejected' => 16711680 // Merah
    ];
    
    $embed = [
        'title' => $izinTypes[$izin['jenisIzin']] ?? '**PERMINTAAN IZIN BARU**',
        'description' => "**👤 Nama:** " . htmlspecialchars($izin['nama']) . "\n" .
                        "**🆔 NIP/NIS:** " . htmlspecialchars($izin['nip']) . "\n" .
                        ($izin['kelas'] ? "**🎓 Kelas/Jabatan:** " . htmlspecialchars($izin['kelas']) . "\n" : '') .
                        "**📅 Tanggal:** " . date('d/m/Y', strtotime($izin['tanggal'])) . "\n" .
                        "**📝 Keterangan:** " . htmlspecialchars($izin['alasan']) . "\n" .
                        "**📊 Status:** " . strtoupper($izin['status']),
        'color' => $statusColors[$izin['status']] ?? 3447003,
        'fields' => [
            [
                'name' => 'ID Izin',
                'value' => $izin['id'],
                'inline' => true
            ],
            [
                'name' => 'Waktu Pengajuan',
                'value' => date('d/m/Y H:i', strtotime($izin['created_at'])),
                'inline' => true
            ]
        ],
        'timestamp' => date('c'),
        'footer' => [
            'text' => 'Sistem Izin Online | faction2'
        ]
    ];

    $payload = ['embeds' => [$embed]];
    
    $ch = curl_init($webhookUrl);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_exec($ch);
    curl_close($ch);
}
?>