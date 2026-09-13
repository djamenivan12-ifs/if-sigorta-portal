# Mise en service de la comptabilité reconstruite

## Prérequis obligatoire

Le code appelle la fonction PostgreSQL accounting_write. Appliquer la migration supabase/migrations/202609130001_accounting_integrity.sql avant de publier cette version. En son absence, les lectures fonctionnent mais les écritures renvoient 503 avec conservation de la saisie. Aucun ancien chemin non transactionnel n'est utilisé en secours.

La migration a été testée avec PostgreSQL embarqué et les types de colonnes lus via l'API du projet. Les politiques, déclencheurs et contraintes réels doivent encore être contrôlés sur une copie de test. La lecture OpenAPI ne donne pas une vue complète de ces objets.

1. Sauvegarder la base et travailler d'abord sur une copie de test.
2. Exécuter supabase/preflight/accounting.sql (lecture seule) et docs/verification-supabase.sql. Vérifier notamment les déclencheurs déjà chargés d'historiser les tarifs : ne pas installer deux mécanismes d'historisation identiques.
3. Examiner les chevauchements, noms dupliqués et valeurs invalides. La migration refuse ces incohérences et revient en arrière intégralement ; elle ne réécrit ni ne supprime les lignes historiques.
4. Appliquer une fois la migration avec les droits nécessaires à btree_gist, aux contraintes et aux fonctions. L'outil de migrations Supabase doit en enregistrer la version.
5. Vérifier avec des comptes de test les autorisations administrateur/agent, un dépôt répété, un tarif chevauchant, une activation, un conflit de version et une lecture après modification.
6. Déployer le code seulement après succès de cette recette. Aucun envoi de message ou changement de dossier n'est nécessaire pour ces vérifications.

## Contrôles reproductibles

- npm run check : ESLint, TypeScript, tests applicatifs et tests de la migration.
- npm run test:accounting-db : PostgreSQL isolé en mémoire ; aucune variable Supabase ni connexion externe utilisée.
- npm run build : compilation du site.

Le fichier tests/fixtures/accounting-schema.json contient uniquement des noms/types de colonnes, sans données ni identifiants de clients. Cette fixture ne prétend pas reproduire les règles de sécurité ou déclencheurs déjà présents dans le projet distant.

## Comportements conservés et précisions

- Paiements : montant attendu des paiements confirmés. Les dossiers annulés payés sont signalés pour rapprochement ; aucun remboursement n'est supposé.
- Rentabilité : polices actuellement disponibles et payées dans la période, avec le coût réel copié dans le dossier. Un coût inconnu rend la marge incomplète.
- Avances : cumul jusqu'à la borne de fin (ou aujourd'hui), indépendant de la borne de début. Les coûts sont rattachés à la date de sélection de l'assureur. Cet indicateur est un solde estimatif sur l'état actuel des dossiers, pas un arrêté historique.
- Tarifs : un état par durée ; tranches exclues uniquement lorsqu'elles se chevauchent pour le même assureur, la même durée et la même date. Les versions de dates différentes restent possibles.
- Âges : catégories d'analyse fixes de dix ans. Les tarifs modifiables ne déplacent plus les dossiers entre catégories.

## Retour arrière

Conserver une sauvegarde avant migration et une version du code. Ne pas réinstaller l'ancienne route d'historisation sur une base qui possède le nouveau déclencheur : cela créerait des traces en double. Privilégier une correction en avant après examen des données ; ne pas supprimer automatiquement le journal des opérations ni les contraintes ajoutées.

Les remboursements, contre-écritures de dépôt et frais généraux restent des extensions métier à définir. L'interface ne les comptabilise pas silencieusement.
