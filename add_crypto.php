<?php
// Récupérer les données envoyées par le client
$data = json_decode(file_get_contents("php://input"), true);
$cryptoId = strtolower($data['cryptoId']);
$cryptoName = strtoupper($data['cryptoName']);

// Vérifier si les données sont valides
if (!$cryptoId || !$cryptoName) {
    echo json_encode(['status' => 'error', 'message' => 'Données invalides']);
    exit;
}

// Chemin vers le fichier cryptos.json
$file_path = 'datas/cryptos.json';

// Lire le contenu du fichier
if (file_exists($file_path)) {
    $cryptos = json_decode(file_get_contents($file_path), true);
} else {
    $cryptos = [];
}

// Vérifier si la crypto existe déjà
foreach ($cryptos as $crypto) {
    if ($crypto['id'] === $cryptoId) {
        echo json_encode(['status' => 'error', 'message' => 'La crypto existe déjà']);
        exit;
    }
}

// Ajouter la nouvelle crypto
$cryptos[] = ['id' => $cryptoId, 'name' => strtoupper($cryptoName)];

// Sauvegarder les modifications dans le fichier
file_put_contents($file_path, json_encode($cryptos, JSON_PRETTY_PRINT));

// Renvoyer une réponse de succès
echo json_encode(['status' => 'success', 'message' => 'Crypto ajoutée avec succès']);
?>
