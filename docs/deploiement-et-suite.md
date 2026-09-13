# Livraison et travaux dépendant de l’environnement

Les corrections applicatives ont été préparées localement. Aucune migration, publication, notification réelle ni modification des dossiers existants n’a été exécutée.

## Avant publication

1. Exécuter les vérifications du README. Vérifier les rôles réels dans une copie de test.
2. Configurer le secret Meta pour le webhook signé, puis tester événement authentique, événement altéré et secret absent.
3. Confirmer que la fonction de limitation existante est disponible et que le proxy d’hébergement nettoie les en-têtes d’adresse IP. Vérifier aussi les limites de taille de requête au niveau de l’hébergement.
4. Vérifier les buckets privés et l’absence d’accès public aux documents. Tester de vrais petits PDF/JPEG/PNG de test, un fichier vide, un fichier de plus de 10 Mo et un HTML renommé en PDF.
5. Vérifier renouvellement des cookies et Realtime, génération des documents à la demande et droits après réaffectation.

## Base de données : préparation nécessaire

Exécuter le fichier SQL de lecture `verification-supabase.sql` et exporter le schéma depuis Supabase. Il ne change aucune donnée. Versionner ensuite les définitions nécessaires, sans données clients ni secrets.

Les opérations suivantes ne doivent pas être présentées comme corrigées par une simple modification JavaScript :

- **Transactions de paiement et de polices** : regrouper les écritures liées dans une fonction SQL transactionnelle avec contrôle du statut attendu. Préparer les objets de stockage avant validation métier, puis les adopter dans la transaction ; ne pas essayer de rendre un appel de stockage atomique avec PostgreSQL. Nettoyer séparément les objets orphelins.
- **Grilles tarifaires** : remplacer une grille dans une transaction et imposer les contraintes d’intervalle dans la base. Le contrôle applicatif de chevauchement existe désormais, mais ne verrouille pas deux administrateurs simultanés.
- **Soumissions répétées** : créer une clé de soumission persistante et unique, liée au contexte autorisé. Retourner le résultat existant après nouvelle tentative ; ne jamais utiliser le seul téléphone pour autoriser une réutilisation.
- **Coordonnées clients** : définir la procédure de vérification d’un nouveau téléphone et les instantanés par dossier avant de modifier les clients partagés. Ne pas écraser les coordonnées historiques sans cette règle.
- **Notifications** : une file transactionnelle persistante doit enregistrer événement, destinataire, modèle, identifiant unique, tentatives et résultat. Prévoir reprise et relance autorisée. Les délais réseau et noms d’événements ont été améliorés, mais la file n’existe pas encore.
- **Polices annuelles** : vérifier les champs et déclencheurs réels avant d’aligner numéros/dates par année. Tester un an, deux ans, remplacement et couverture partielle.
- **Comptabilité et remboursements** : confirmer les définitions de montant encaissé, montant attendu, annulation et remboursement avant de changer les totaux ou d’ajouter des états financiers.
- **Volumes** : remplacer les agrégats en mémoire par des requêtes SQL et les listes par une pagination complète en base. La liste des dossiers ne tronque plus silencieusement les lignes récupérées, mais conserve le filtrage en mémoire pour ne pas changer les résultats de recherche existants. Les autres agrégats nécessitent encore ce travail.

## Recette de non-régression sur une base de test

- Agent A : dossier personnel et dossier non attribué accessibles ; dossier de B et document de B refusés. Administrateur : accès conservé. Partenaire : uniquement ses dossiers.
- Note client : création, validation de longueur, édition et suppression selon l’auteur et le rôle.
- Paiement : double clic, réponse perdue, document invalide et arrêt réseau ; aucun succès ne doit être affiché pour une opération incomplète. Tester séparément les opérations de base une fois les transactions créées.
- Prix : changement rapide un/deux ans et naissance, retour d’étape, changement administratif de tarif entre devis et création.
- Renouvellement : ne pas régresser depuis intéressé/terminé ; le remplacement d’un PDF ne remet pas le suivi en attente.
- Navigateur : français/anglais/turc, mobile, clavier, session expirée, retour/rechargement et stockage navigateur désactivé.

## Améliorations éditoriales et ergonomiques restantes

Les textes de confidentialité, les informations de société, les conditions, la stratégie de référencement multilingue, les délais d’alerte métier et la reprise complète des brouillons nécessitent des choix de contenu ou de fonctionnement. Le présent lot n’invente pas ces informations. Les fenêtres modales restantes et les alertes de formulaire doivent encore faire l’objet d’une recette d’accessibilité complète.

Référence pour la gestion des sessions : [documentation Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client). La documentation Next.js livrée dans `node_modules/next/dist/docs` est la référence de version du projet.
