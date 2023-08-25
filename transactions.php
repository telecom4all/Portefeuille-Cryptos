<?php
header('Content-Type: application/json');

// Récupérer les données POST
$data = json_decode(file_get_contents("php://input"));

// Vérification des données
if (!isset($data->token) || !isset($data->tokenId) || !isset($data->transaction) || !isset($data->transaction->Invest) || !isset($data->transaction->supply) || !isset($data->transaction->purchasePrice)) {
    echo json_encode(array("status" => "error", "message" => "Données invalides"));
    exit;
}

// Convertir les chaînes en nombres
$data->transaction->Invest = floatval($data->transaction->Invest);
$data->transaction->supply = floatval($data->transaction->supply);
$data->transaction->purchasePrice = floatval($data->transaction->purchasePrice);

// Uniformiser le format de date
$data->transaction->date = date("d/m/Y", strtotime($data->transaction->date));

// Charger le fichier JSON existant
$transactions = json_decode(file_get_contents("datas/transactions_crypto.json"), true);

// Vérifier si la crypto existe déjà dans le fichier
$found = false;
foreach ($transactions as &$transaction) {
    if ($transaction['token'] === $data->token) {
        $transaction['transactions'][] = $data->transaction;
        $found = true;
        break;
    }
}

// Si la crypto n'existe pas, ajoutez-la
if (!$found) {
    $transactions[] = array(    
        "token" => strtoupper($data->token),
        "tokenId" => strtolower($data->tokenId),
        "transactions" => array($data->transaction)
    );
}

// Sauvegarder les transactions mises à jour dans le fichier
file_put_contents("datas/transactions_crypto.json", json_encode($transactions, JSON_PRETTY_PRINT));

echo json_encode(array("status" => "success"));
?>
