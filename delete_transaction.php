<?php
header('Content-Type: application/json');

// Récupérer les données POST
$data = json_decode(file_get_contents("php://input"));

// Vérification des données
if (!isset($data->token) || !isset($data->oldTransaction)) {
    echo json_encode(array("status" => "error", "message" => "Données invalides"));
    exit;
}

// Charger le fichier JSON existant
$transactions = json_decode(file_get_contents("datas/transactions_crypto.json"), true);

// Parcourir les transactions et trouver la transaction correspondante
$transactionRemoved = false;
foreach ($transactions as &$transaction) {
    if ($transaction['token'] === $data->token) {
        foreach ($transaction['transactions'] as $key => $trans) {
            // Convertir l'objet oldTransaction en tableau
            $oldTransactionArray = (array) $data->oldTransaction;

            // Supprimer le champ index
            unset($oldTransactionArray['index']);

            // Comparez avec l'ancienne transaction pour trouver la bonne
            if ($trans == $oldTransactionArray) {
                // Supprimez la transaction
                unset($transaction['transactions'][$key]);
                $transactionRemoved = true;
                break; // Sortez de la boucle interne
            }
        }
        // Réindexez le tableau pour éviter que les indices ne deviennent des clés
        $transaction['transactions'] = array_values($transaction['transactions']);
        if ($transactionRemoved) {
            break; // Sortez de la boucle externe
        }
    }
}

if (!$transactionRemoved) {
    echo json_encode(array("status" => "error", "message" => "Transaction non trouvée"));
    exit;
}

// Sauvegarder les transactions mises à jour dans le fichier
file_put_contents("datas/transactions_crypto.json", json_encode($transactions, JSON_PRETTY_PRINT));

echo json_encode(array("status" => "success"));
?>
