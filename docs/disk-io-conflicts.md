# Correction Disk IO du 9 octobre 2026

Les conflits métier des fonctions SQL utilisaient `40001`, réservé aux échecs de sérialisation. PostgREST 14.5 réessayait ces opérations indéfiniment. Les journaux de production identifiaient `decide_payment` et `save_partner_draft` ; la base cumulait plus de 1,8 milliard de transactions annulées.

La correction remplace les 25 codes métier par `PT409` dans 15 fonctions. Les contrôles de version, les autorisations, les verrous et les écritures atomiques restent identiques. Les routes de l’application acceptent `PT409` et l’ancien `40001` pour renvoyer un conflit HTTP 409 avec le message existant.

## État de la base

La correction des fonctions a été appliquée directement au projet existant le 9 octobre 2026 vers 14 h 41, heure de Turquie. La migration `20261009115343_business_conflicts_no_retry.sql` conserve cette correction dans le dépôt ; elle est idempotente si les fonctions sont déjà corrigées. Elle ne remplace aucune fonction absente et conserve la définition installée, ses propriétaires et ses droits. Les migrations historiques restent inchangées.

Les deux connexions en boucle ont disparu. Entre 14 h 42 et 14 h 56, les compteurs observés des transactions annulées et de la requête de préparation PostgREST sont restés stables. Le budget Disk IO doit encore être suivi dans Observability / Database Health ; cette mesure n’a pas été obtenue directement.

## Validation

- 163 tests applicatifs réussis, dont les réponses HTTP 409 pour paiements, brouillons et remboursements.
- Suites SQL existantes réussies ; tests de paiement exécutés avec la nouvelle migration.
- Nouveau test SQL du brouillon : version périmée refusée avec PT409, écritures valides réussies, droits conservés, migration rejouable et fonction de sérialisation étrangère à la correction inchangée.
- ESLint, TypeScript et compilation de production réussis avec les paramètres fictifs utilisés par la CI.
- Tests SQL sur la base existante annulés après vérification des erreurs : aucune décision de paiement de test enregistrée.

## Retour arrière

Le code reste compatible avec les deux codes SQL. Un retour à une version antérieure de l’application ne doit pas restaurer les erreurs SQL `40001`, ce qui réintroduirait les boucles. Aucun changement d’abonnement n’est nécessaire pour cette correction.

Références : [diagnostic Supabase](https://supabase.com/docs/guides/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions-77326b), [codes HTTP personnalisés PostgREST](https://docs.postgrest.org/en/v14/references/errors.html#raise-errors-with-http-status-codes).
