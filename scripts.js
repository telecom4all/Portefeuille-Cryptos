// Cache pour stocker les prix
const priceCache = {};
let totalPortfolioChart;
let cryptoChart;


// Lors du chargement de la page, générer le graphique du portefeuille total
window.onload = async function() {

    // Sélectionnez les éléments nécessaires
    const container = document.querySelector('.container_encodage');
    const container_add_crypto = document.querySelector('#crypto-management-section');
    const container_add_trans = document.querySelector('#transaction-section');

    // Définissez les styles pour que l'accordéon soit replié au chargement de la page
    container.style.height = '30px'; // ou la hauteur de votre choix pour montrer seulement l'icône
    container_add_crypto.style.display = 'none';
    container_add_trans.style.display = 'none';

    // Sélectionnez le bouton
    const addButton = document.getElementById('add-crypto');

    // Ajoutez un événement 'click' au bouton
    addButton.addEventListener('click', function() {
        // Code à exécuter lorsque le bouton est cliqué
        add_crypto();

    });

    /* Remplir la liste des cryptos disponible */
    const cryptosData = await loadCryptos()
    populateSelectCryptos(cryptosData)

    /* remplir le tableau avec toute les cryptos possédées */
    const transactionsData = await loadTransactions();
    const cryptos = await populateTableListCrypto(transactionsData);
    /* Création du graphique evolution portefeuilles */
    generateTotalPortfolioChart(cryptos);

};


// Fonction pour charger la liste des cryptos depuis un fichier JSON et retourner les options
async function loadCryptos() {
    try {
        const response = await fetch('datas/cryptos.json');

        // Vérifiez si la réponse est OK (statut 200-299)
        if (!response.ok) {
            showError(`Erreur lors de la récupération des données : ${response.statusText}`);
            throw new Error(`Erreur lors de la récupération des données : ${response.statusText}`);
        }

        const responseData = await response.text();

        let cryptos;
        try {
            cryptos = JSON.parse(responseData);
        } catch (jsonError) {
            showError('Erreur lors de la conversion des données en JSON.');
            throw new Error('Erreur lors de la conversion des données en JSON.');
        }

        return cryptos;
    } catch (error) {
        showError(`Erreur : ${error.message}`);
        return []; // Retournez un tableau vide en cas d'erreur
    }
}


// remplir le select pour la liste es cryptos dispo
function populateSelectCryptos(cryptos){
    const cryptoListElement = document.getElementById('crypto-list');
    cryptos.forEach(crypto => {
        const option = document.createElement('option');
        option.value = crypto.id;
        option.textContent = crypto.name;
        cryptoListElement.appendChild(option);
    });
}

async function loadTransactions() {
    try {
        const response = await fetch('datas/transactions_crypto.json');
      
        // Vérifiez si la réponse est OK (statut 200-299)
        if (!response.ok) {
            showError(`Erreur lors de la récupération des données : ${response.statusText}`);
            throw new Error(`Erreur lors de la récupération des transactions : ${response.statusText}`);
        }

        const responseData = await response.text();

        let transactions;
        try {
            transactions = JSON.parse(responseData);
        } catch (jsonError) {
            showError('Erreur lors de la conversion des données en JSON.');
            throw new Error('Erreur lors de la conversion des transactions en JSON.');
        }

        return transactions;
    } catch (error) {
        showError(`Une erreur est survenue : ${error.message}`);
        return []; // Retournez un tableau vide en cas d'erreur
    }
}



function findCryptoByToken(cryptos, token) {

    return cryptos.find(crypto => crypto.token === token);
}

async function refresh_transaction(tokenName, tokenId){
    
    const transactionsData = await loadTransactions();
    const cryptos = await populateTableListCrypto(transactionsData);

    //let cryptoSelect = findCryptoByToken(cryptos, tokenId);
    const cryptoSelect = findCryptoByToken(transactionsData, tokenName);
    
    /* Création du graphique evolution portefeuilles */
    updateTableAndChart();
    showTransactionPopup(cryptoSelect, tokenName, tokenId);
  
}

// remplir la liste des crypto sur et leur evolution dans le tableau
async function populateTableListCrypto(transactionsData){
    
    const cryptos = await Promise.all(transactionsData.map(async crypto => {
        let totalSupply = 0;
        let totalInvest = 0;
        
        
        crypto.transactions.forEach(transaction => {
            
            if(transaction.transactionType == "achat"){
                totalSupply += transaction.supply;
                totalInvest += transaction.Invest;
            }
            if(transaction.transactionType == "vente"){
                totalSupply -= transaction.supply;
                totalInvest -= transaction.Invest;
            }
            
        });
        const currentPrice = await getCurrentPrice(crypto.tokenId);
        const plDollar = (currentPrice * totalSupply) - totalInvest;
        const plPercent = (plDollar / totalInvest) * 100;
        
        return {
            name: crypto.token, // Utiliser l'identifiant en minuscules
            id: crypto.tokenId, // Utiliser l'identifiant en minuscules
            supply: totalSupply,
            invest: totalInvest,
            costPrice: totalInvest / totalSupply,
            currentPrice: currentPrice,
            plDollar: plDollar,
            plPercent: plPercent,
            transactions: crypto.transactions
        };
    }));
    generateTable(cryptos);
    return cryptos;
}

// généré le tableau des cryptos possédées
async function generateTable(cryptos) {
    const tableBody = document.getElementById('crypto-table').querySelector('tbody');
    tableBody.innerHTML = ''; // Vider le tableau
    const cryptosData = await loadCryptos()
    cryptos.forEach(crypto => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = crypto.name; 
        row.insertCell().textContent = crypto.supply;
        row.insertCell().textContent = crypto.invest;
        row.insertCell().textContent = crypto.costPrice;
        row.insertCell().textContent = crypto.currentPrice;
        row.insertCell().textContent = crypto.plDollar;
        row.insertCell().textContent = crypto.plPercent;

        
        let tokenName = getNameById(crypto.id, cryptosData)
        // Ajout du bouton "Détails"
        
        const detailsCell = row.insertCell();
        const detailsButton = document.createElement('button');
        detailsButton.textContent = 'Détails';
        detailsButton.addEventListener('click', () => showTransactionPopup(crypto, tokenName, crypto.id ));
        detailsCell.appendChild(detailsButton);

        if (crypto.plDollar > 0) {
            row.classList.add('positive');
        } else if (crypto.plDollar < 0) {
            row.classList.add('negative');
        } else {
            row.classList.add('neutral');
        }

        
    });
}

async function updateTableAndChart() {
    const transactionsData = await loadTransactions();
    const cryptos = await Promise.all(transactionsData.map(async crypto => {
        let totalSupply = 0;
        let totalInvest = 0;
        crypto.transactions.forEach(transaction => {
            if(transaction.transactionType == "achat"){
                totalSupply += transaction.supply;
                totalInvest += transaction.Invest;
            }
            if(transaction.transactionType == "vente"){
                totalSupply -= transaction.supply;
                totalInvest -= transaction.Invest;
            }
        });
        const currentPrice = await getCurrentPrice(crypto.tokenId);
        const plDollar = (currentPrice * totalSupply) - totalInvest;
        const plPercent = (plDollar / totalInvest) * 100;

        return {
            id: crypto.tokenId, // Utiliser l'identifiant en minuscules
            name: crypto.token, // Utiliser l'identifiant en minuscules
            supply: totalSupply,
            invest: totalInvest,
            costPrice: totalInvest / totalSupply,
            currentPrice: currentPrice,
            plDollar: plDollar,
            plPercent: plPercent,
            transactions: crypto.transactions
        };
    }));

    generateTable(cryptos);
    generateTotalPortfolioChart(cryptos);
   

}

// function pour crée le graphique evolution portefeuille
async function generateTotalPortfolioChart(cryptos) {
    const ctx = document.getElementById('total-portfolio-chart').getContext('2d');

    // Si un graphique existe déjà, le détruire
    if (totalPortfolioChart) {
        totalPortfolioChart.destroy();
    }
    
    // Récupérer toutes les dates uniques des transactions
    const allDates = [];
    cryptos.forEach(crypto => {
        crypto.transactions.forEach(transaction => {
            if (!allDates.includes(transaction.date)) {
                allDates.push(transaction.date);
            }
        });
    });

    const uniqueDates = allDates.sort((a, b) => new Date(a.split('/').reverse().join('-')) - new Date(b.split('/').reverse().join('-')));
    const today = moment().format('DD/MM/YYYY');
    uniqueDates.push(today);

    console.log(cryptos)
    const tokens = cryptos.map(crypto => crypto.id);
    const fromDate = moment(uniqueDates[0], "DD/MM/YYYY").unix();
    const toDate = moment(today, "DD/MM/YYYY").unix();

    const historicalPrices = await getHistoricalPrices(tokens, fromDate, toDate);

    const totalValues = uniqueDates.map(date => {
        let totalValueForDate = 0;
        cryptos.forEach(crypto => {
            let totalSupplyForDate = 0;
            crypto.transactions.forEach(transaction => {
                if (new Date(transaction.date.split('/').reverse().join('-')) <= new Date(date.split('/').reverse().join('-'))) {
                    if(transaction.transactionType == "achat"){
                        totalSupplyForDate += transaction.supply;
                    }
                    if(transaction.transactionType == "vente"){
                        totalSupplyForDate -= transaction.supply;
                    }
                    
                }
            });
    
            const priceIndex = Math.floor((moment(date, "DD/MM/YYYY").unix() - fromDate) / (24 * 60 * 60));
            const price = historicalPrices[crypto.id][priceIndex];
            totalValueForDate += totalSupplyForDate * price;
        });
        return totalValueForDate;
    });

    const canvas = document.getElementById('total-portfolio-chart');
    canvas.removeAttribute('width');
    canvas.removeAttribute('height');

    console.log(uniqueDates)
    console.log(totalValues)
    totalPortfolioChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: uniqueDates, // Utilisez uniquement uniqueDates comme étiquettes
            datasets: [{
                label: 'Valeur totale du portefeuille',
                data: totalValues,
                borderColor: 'red',
                fill: false
            }]
        },
        options: {
            maintainAspectRatio: false,
            responsive: true,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        parser: 'DD/MM/YYYY',
                        unit: 'day',
                        displayFormats: {
                            day: 'DD/MM/YYYY'
                        }
                    }
                }
            }
        }
    });
}



// Fonction pour afficher le popup avec l'historique des transactions
async function showTransactionPopup(crypto, tokenName, tokenId) {
    const popup = document.getElementById('transaction-popup');
    const popupCryptoName = document.getElementById('popup-crypto-name');
    const tableBody = document.getElementById('transaction-history-table').querySelector('tbody');

    const cryptosData = await loadCryptos()
   
    //let tokenName = getNameById(crypto.id, cryptosData)
    //let tokenId = crypto.id;
    popupCryptoName.textContent = tokenName;
    tableBody.innerHTML = ''; // Vider le tableau

    // Vérification de l'existence de la propriété transactions
    if (crypto.transactions && crypto.transactions.length > 0) {
        crypto.transactions.forEach(transaction => {
            
            const row = tableBody.insertRow();
            row.insertCell().textContent = transaction.date;
            row.insertCell().textContent = transaction.Invest;
            row.insertCell().textContent = transaction.supply;
            row.insertCell().textContent = transaction.purchasePrice;
            row.insertCell().textContent = transaction.transactionType;
            
            const actionCell = row.insertCell();

            // Créer un conteneur pour les boutons
            const buttonContainer = document.createElement('div');
            buttonContainer.style.display = 'flex';
            buttonContainer.style.justifyContent = 'space-between'; // Pour espacer les boutons, si nécessaire
            buttonContainer.className = 'buttonContainer'; // Ajoutez cette ligne

            // Créer le bouton "Modifier"
            
            // Créer le bouton "Effacer"
            const deleteIcon = document.createElement('i');
            deleteIcon.className = 'fas fa-trash-alt';
            deleteIcon.title = 'Effacer';
            const deleteButton = document.createElement('button');
            deleteButton.appendChild(deleteIcon);
            buttonContainer.appendChild(deleteButton); // Ajoutez le bouton au conteneur
           
            deleteButton.className = 'del_red'; // Ajoutez cette ligne

            deleteButton.addEventListener('click', () => {
                const confirmation = confirm("Êtes-vous sûr de vouloir supprimer cette transaction?");
                if (confirmation) {

                    const index = crypto.transactions.indexOf(transaction);
                    let dataEditTransaction = {
                        token: tokenName, // Vous devez avoir une variable ou une manière de récupérer le token actuel
                        oldTransaction: {
                            //index: index,
                            date: transaction.date,
                            Invest: transaction.Invest,
                            supply: transaction.supply,
                            purchasePrice: transaction.purchasePrice,
                            transactionType: transaction.transactionType
                        }
                    };

                    // Envoyez les données au fichier PHP pour mise à jour
                    fetch('delete_transaction.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(dataEditTransaction)
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.status === 'success') {
                            // Mettez à jour l'affichage ou la base de données comme nécessaire
                            refresh_transaction(tokenName, tokenId);
                            
                        } else {
                            console.error('Erreur lors de la mise à jour de la transaction:', data.message);
                        }
                        dataEditTransaction = {};

                        
                    })
                    .catch(error => {
                        console.error('Erreur lors de l envoi des données:', error);
                    });
                    
                }
            });


            // Ajoutez le conteneur à la cellule
            actionCell.appendChild(buttonContainer);

        });
    } else {
        const row = tableBody.insertRow();
        row.insertCell().textContent = "Aucune transaction trouvée pour cette crypto.";
        row.setAttribute('colspan', '5');
    }

    // Afficher le popup
    popup.style.display = 'block';

    generateCryptoChart(crypto, tokenName, tokenId);
}

/* aller chercher le prix actuel pour plusieurs cryptos */
async function getCurrentPrices(tokens) {
    const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${tokens.join(',')}&vs_currencies=usd`);
    const data = await response.json();
    return data;
}

async function getHistoricalPrices(tokens, fromDate, toDate) {
    const prices = {};
    for (const token of tokens) {
        const response = await fetch(`https://api.coingecko.com/api/v3/coins/${token}/market_chart/range?vs_currency=usd&from=${fromDate}&to=${toDate}`);
        const data = await response.json();
        if (data && data.prices) {
            prices[token] = data.prices.map(priceData => priceData[1]);
        } else {
            prices[token] = [];
        }
        await delay(10); // Attendre 0.1 seconde entre chaque requête pour éviter d'être bloqué
    }
    return prices;
}

/* aller chercher le prix actuel  */
function getCurrentPrice(token) {
    return fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${token}&vs_currencies=usd`)
        .then(response => response.json())
        .then(data => {
            return data[token].usd;
        });
}


function showError(message) {
    const modal = document.getElementById("confirmationModal");
    const modalContent = modal.querySelector(".modal-content");
    const modalMessage = document.getElementById("modalMessage"); 

    modalMessage.textContent = message;
    modalContent.classList.add("error");
    modalContent.classList.remove("success");
    
    modal.style.display = "block";
    const closeButton = modal.querySelector(".close");
    // Fermer le modal lorsque l'utilisateur clique sur le bouton "x"
    closeButton.onclick = function() {
        modal.style.display = "none";
    }

    // Fermer le modal lorsque l'utilisateur clique en dehors du contenu du modal
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}




/* evenements */
// Fermer le popup
document.querySelector('.close-popup').addEventListener('click', () => {
    document.getElementById('transaction-popup').style.display = 'none';
});

// reactualisé les donnée au resize de la page
window.addEventListener('resize', async function() {
    const cryptosData = await loadCryptos()
    const transactionsData = await loadTransactions();
    const cryptos = await populateTableListCrypto(transactionsData);
    generateTotalPortfolioChart(cryptos);
});


// Ajouter un écouteur d'événement pour le bouton de soumission
document.getElementById('submit-transaction').addEventListener('click', async () => {
    // Récupérer les valeurs des champs
    const selectedCrypto = document.getElementById('crypto-list').value;
    const quantity = document.getElementById('crypto-quantity').value;
    const amount = document.getElementById('amount').value;
    const transactionType = document.getElementById('transaction-type').value;
    const transactionDate = document.getElementById('transaction-date').value;
    
    if (isNaN(quantity) || quantity <= 0) {
        showError("Quantité invalide.");
        return;
    }
    
    if (isNaN(amount) || amount <= 0) {
        showError("Montant invalide.");
        return;
    }

    if (!transactionDate) {
        showError("Veuillez sélectionner une date.");
        return;
    }

    const purchasePrice = amount / quantity;

    const cryptosData = await loadCryptos()
    let tokenName = getNameById(selectedCrypto, cryptosData)
    const newTransaction = {
        tokenId: selectedCrypto.toLowerCase(),
        token: tokenName.toUpperCase(),
        transaction: {
            date: transactionDate,
            Invest: amount,
            supply: quantity,
            purchasePrice: purchasePrice,
            transactionType: transactionType
        }
    };

    
    // Envoyer la nouvelle transaction au serveur pour la sauvegarder
    const response = await fetch('transactions.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(newTransaction)
    });

    const result = await response.json();
   
    const modal = document.getElementById("confirmationModal");
    const modalContent = modal.querySelector(".modal-content");
    const closeButton = modal.querySelector(".close"); // Sélectionnez le bouton de fermeture ici
    const modalMessage = document.getElementById("modalMessage"); 

    if (result.status === 'success') {
        // Mettre à jour le tableau et le graphique
        updateTableAndChart();

        // Réinitialiser les champs du formulaire
        document.getElementById('crypto-list').selectedIndex = 0;
        document.getElementById('crypto-quantity').value = '';
        document.getElementById('amount').value = '';
        document.getElementById('transaction-type').selectedIndex = 0;
        document.getElementById('transaction-date').value = '';

        // Configuration du modal pour le succès
        modalMessage.textContent = "Transaction ajoutée avec succès!";
        modalContent.classList.add("success");
        modalContent.classList.remove("error");
        
        // Afficher le modal
        modal.style.display = "block";

       
    } else {
        console.error("Erreur lors de la sauvegarde de la transaction.");
        // Configuration du modal pour l'erreur
        modalMessage.textContent = "Erreur lors de la sauvegarde de la transaction.";
        modalContent.classList.add("error");
        modalContent.classList.remove("success");
        
        // Afficher le modal
        modal.style.display = "block";
    }

    // Fermer le modal lorsque l'utilisateur clique sur le bouton "x"
    closeButton.onclick = function() {
        modal.style.display = "none";
    }

    // Fermer le modal lorsque l'utilisateur clique en dehors du contenu du modal
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }


});



function convertDateFormat(inputDate) {
    // Divisez la date en un tableau [DD, MM, YYYY]
    const parts = inputDate.split('/');

    // Réorganisez et rejoignez pour obtenir le format YYYY-MM-DD
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

function convertDateFormatDDMMAAA(inputDate) {
    const parts = inputDate.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function updatePrice() {
    // Récupérez les valeurs de editInvest et editSupply
    const invest = parseFloat(document.getElementById('editInvest').value);
    const supply = parseFloat(document.getElementById('editSupply').value);

    // Vérifiez si les deux valeurs sont des nombres valides
    if (!isNaN(invest) && !isNaN(supply) && supply !== 0) {
        // Calculez le prix
        const price = invest / supply;

        // Mettez à jour la valeur de editprix
        document.getElementById('editprix').value = price.toFixed(2); // Utilisez toFixed(2) pour arrondir à 2 décimales
    } else {
        // Si l'une des valeurs n'est pas valide, vous pouvez réinitialiser editprix ou le laisser tel quel
        document.getElementById('editprix').value = '';
    }
}


function getNameById(id, cryptoData) {
    // Utilisez la méthode find pour rechercher l'objet avec l'ID correspondant
    const crypto = cryptoData.find(c => c.id === id);
    
    // Si un objet correspondant est trouvé, retournez le nom, sinon retournez null
    return crypto ? crypto.name : null;
}


async function generateCryptoChart(crypto, tokenName, tokenId) {
    const ctx = document.getElementById('crypto-chart').getContext('2d');
 
    const cryptosData = await loadCryptos()
    const tokens = cryptosData.map(crypto => crypto.id);

    // Si un graphique existe déjà, le détruire
    if (cryptoChart) {
        cryptoChart.destroy();
    }

    const allDates = [];
    
    crypto.transactions.forEach(transaction => {
        if (!allDates.includes(transaction.date)) {
            allDates.push(transaction.date);
        }
    });
   
    const uniqueDates = allDates.sort((a, b) => new Date(a.split('/').reverse().join('-')) - new Date(b.split('/').reverse().join('-')));
    const today = moment().format('DD/MM/YYYY');
    uniqueDates.push(today);

    const fromDate = moment(uniqueDates[0], "DD/MM/YYYY").unix();
    const toDate = moment(today, "DD/MM/YYYY").unix();


    const historicalPrices = await getHistoricalPrices(tokens, fromDate, toDate);

    let totalSupplyForDate = 0;
    const totalSupplies = [];
    let totalValues = [];

    crypto.transactions.forEach((transaction, index) => {
        if (transaction.transactionType === "achat") {
            totalSupplyForDate += transaction.supply;
        } else if (transaction.transactionType === "vente") {
            totalSupplyForDate -= transaction.supply;
        }
        
        totalSupplies.push(totalSupplyForDate);
        const priceIndex = Math.floor((moment(transaction.date, "DD/MM/YYYY").unix() - fromDate) / (24 * 60 * 60));
        
        const price = historicalPrices[crypto.id][priceIndex];
        
        totalValues.push(totalSupplyForDate * price);
        
    });
    totalSupplies.push(totalSupplyForDate);
    let actualPrice = await getCurrentPrice(crypto.id)
    totalValues.push(totalSupplyForDate * actualPrice);

    console.log(totalSupplies)
    console.log(uniqueDates)
    console.log(totalValues)
    // Créer le graphique
    cryptoChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: uniqueDates,
            datasets: [{
                label: 'Quantité de crypto',
                data: totalSupplies,
                borderColor: 'blue',
                fill: false,
                yAxisID: 'y-axis-1'
            }, {
                label: 'Valeur de l\'actif',
                data: totalValues,
                borderColor: 'red',
                fill: false,
                yAxisID: 'y-axis-2'
            }]
        },
        options: {
            maintainAspectRatio: true,
            responsive: true,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        parser: 'DD/MM/YYYY',
                        unit: 'day',
                        displayFormats: {
                            day: 'DD/MM/YYYY'
                        }
                    }
                },
                y: {
                    'y-axis-1': {
                        type: 'linear',
                        position: 'left',
                        ticks: {
                            beginAtZero: true
                        },
                        scaleLabel: {
                            display: true,
                            labelString: 'Quantité de crypto',
                            fontColor: 'blue'
                        }
                    },
                    'y-axis-2': {
                        type: 'linear',
                        position: 'right',
                        ticks: {
                            beginAtZero: true
                        },
                        scaleLabel: {
                            display: true,
                            labelString: 'Valeur de l\'actif',
                            fontColor: 'red'
                        }
                    }
                }
            }
        }
    });
}




document.querySelector('.toggle-accordion').addEventListener('click', function() {
    const container = document.querySelector('.container_encodage');
    const container_add_crypto = document.querySelector('#crypto-management-section');
    const container_add_trans = document.querySelector('#transaction-section');
    if (container.style.height === 'auto' || container.style.height === '') {
        container_add_crypto.style.display = 'none';
        container_add_trans.style.display = 'none';

        container.style.height = '30px'; // ou la hauteur de votre choix pour montrer seulement l'icône
    } else {
        container.style.height = 'auto';
        container_add_crypto.style.display = 'block';
        container_add_trans.style.display = 'block';
    }
});



async function add_crypto() {
    // 1. Récupérez les valeurs des champs d'entrée
    const cryptoId = document.getElementById('crypto-id-add').value;
    const cryptoName = document.getElementById('crypto-name-add').value;

    // Vérifiez si les champs ne sont pas vides
    if (!cryptoId || !cryptoName) {
        showError("Veuillez remplir tous les champs.");
        return;
    }

    const info_new_crypto = {
        cryptoId: cryptoId.toLowerCase(),
        cryptoName: cryptoName.toUpperCase()
    }

    // Envoyer la nouvelle transaction au serveur pour la sauvegarder
    const response = await fetch('add_crypto.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(info_new_crypto)
    });

    const result = await response.json();
    const modal = document.getElementById("confirmationModal");
    const modalContent = modal.querySelector(".modal-content");
    const closeButton = modal.querySelector(".close"); // Sélectionnez le bouton de fermeture ici
    const modalMessage = document.getElementById("modalMessage"); 

    if (result.status === 'success') {
        // Mettre à jour le tableau et le graphique
        updateTableAndChart();

        // Réinitialiser les champs du formulaire
        document.getElementById('crypto-id-add').value = '';
        document.getElementById('crypto-name-add').value = '';

        // Configuration du modal pour le succès
        modalMessage.textContent = "Crypto ajoutée avec succès!";
        modalContent.classList.add("success");
        modalContent.classList.remove("error");
        
        // Afficher le modal
        modal.style.display = "block";

        /* Remplir la liste des cryptos disponible */
        const cryptosData = await loadCryptos()
        populateSelectCryptos(cryptosData)

       
    } else {
        console.error("Erreur lors de l'ajout de la crypto.");
        // Configuration du modal pour l'erreur
        modalMessage.textContent = "Erreur lors de l'ajout de la crypto";
        modalContent.classList.add("error");
        modalContent.classList.remove("success");
        
        // Afficher le modal
        modal.style.display = "block";
    }

     // Fermer le modal lorsque l'utilisateur clique sur le bouton "x"
     closeButton.onclick = function() {
        modal.style.display = "none";
    }

    // Fermer le modal lorsque l'utilisateur clique en dehors du contenu du modal
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }
}




