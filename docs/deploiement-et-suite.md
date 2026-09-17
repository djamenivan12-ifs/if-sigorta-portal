# IF Sigorta — clôture des corrections fonctionnelles

État du 17 septembre 2026. Travail préparé dans le projet local, sans refonte visuelle. Les pages client de demande et de suivi n'ont pas été modifiées. Les protections des services de paiement ont été corrigées côté serveur.

## Corrections livrées

- Droits admin, agent et partenaire : exports limités au périmètre autorisé, contrôle des réattributions, téléchargement des polices autorisé au moment du clic, formulaires de création réservés aux administrateurs.
- Paiements : validation/refus transactionnels, contrôle de la version du justificatif et répétition sans double écriture. Adoption du justificatif avec dossier, paiement, historique et notification dans une même transaction.
- Polices : adoption transactionnelle, contrôle des années et de la version du dossier, maintien du suivi de renouvellement lors d'un remplacement. Une réponse réseau incertaine ne déclenche plus la suppression d'un fichier potentiellement adopté.
- Assureurs et tarifs : grilles ordinaires atomiques, conflits de version et chevauchements protégés en base ; Skyline identifié par un code stable. API de préparation des futures grilles nationales sans nouvel écran.
- Comptabilité : lecture complète des données, distinction entre absence et indisponibilité, instantanés des changements de dossier pour les soldes historiques. Aucune reconstitution fictive des périodes antérieures au début de capture.
- Paramètres bancaires : IBAN validé, banque active unique, concurrence contrôlée et historique avec auteur.
- Partenaires : clé de soumission persistante, reprise après réponse perdue, brouillons privés enregistrés côté serveur avec contrôle de version ; coordonnées et noms de lieux figés par dossier sans écrasement du client partagé. Fichiers à sélectionner de nouveau après rechargement du navigateur.
- Listes : pagination et recherche en base pour les dossiers admin/agent et partenaire ; liens des compteurs partenaire corrigés. Historiques agents chargés par lots de 100 identifiants. Indexation des dossiers par client et résolution ciblée des auteurs comptables.
- Notifications : file persistante pour justificatifs, polices et e-mails d'attribution. Attribution, journal et mise en file adoptés ensemble. Traitement protégé et relance manuelle après vérification du fournisseur ; aucun renvoi automatique lorsque la livraison est incertaine.
- Documents : préparation tracée, adoption verrouillée et nettoyage protégé des objets expirés sans référence. Les fichiers anciens non suivis par ce mécanisme ne sont pas supprimés automatiquement.
- Navigation : page profil, erreurs/chargement partenaire explicites, navigation clavier et Échap dans les menus mobiles et fenêtres concernées, libellés accessibles sans modification de l'apparence.

## Activation sur l'environnement réel

Les migrations 202609170002 à 202609170010 sont prêtes et testées en base PostgreSQL isolée. Elles ne sont pas appliquées à Supabase dans cette livraison. Le projet ne doit pas être publié seul avant les migrations : plusieurs opérations dépendent des nouvelles fonctions SQL.

1. Sauvegarder la base et vérifier les migrations déjà appliquées. Les migrations comptables du 13 septembre et 202609170001 constituent les prérequis ; ne pas les rejouer sans consulter l'historique.
2. Exécuter les vérifications de données et les migrations sur une copie de test, dans l'ordre croissant. Les contraintes doivent refuser les données incohérentes plutôt que les corriger silencieusement.
3. Tester les trois rôles avec des PDF/images de test, doubles clics, réponses perdues, deux administrateurs simultanés et réattribution d'un dossier.
4. Appliquer les migrations manquantes, puis publier le code correspondant. Vérifier le secret du webhook, les buckets privés, la limitation de requêtes et les paramètres des fournisseurs de notifications.
5. Organiser le traitement périodique de la file et la maintenance des documents via les routes protégées. Aucun traitement périodique n'est installé par ce lot. Sans ce traitement, les événements restant en attente nécessitent une intervention administrative.

## Limites et décisions métier

- La capture historique commence à l'application de la migration 006 ; les soldes détaillés antérieurs ne deviennent pas exacts rétroactivement.
- Les règles de remboursement, d'annulation financière et de montant réellement encaissé ne sont pas inventées. Les estimations existantes gardent leur sens actuel.
- Le découpage contractuel des dates/numéros par année nécessite la règle assureur exacte. Les contrôles actuels de dates et de complétude annuelle sont conservés.
- La vue unifiée de tarifs, de nouveaux filtres visibles, les changements éditoriaux et la refonte des pages sont exclus conformément à la consigne de conserver l'interface.
- Les principaux problèmes de listes sont corrigés ; certains tableaux statistiques gardent leurs agrégats en mémoire. La performance sur les volumes réels et la recette mobile/clavier complète restent à mesurer sur l'environnement de test.

Ce document remplace les listes techniques devenues obsolètes des précédents comptes rendus de lots. Aucun déploiement, migration réelle, message à un client ou nettoyage de stockage réel n'a été exécuté.
