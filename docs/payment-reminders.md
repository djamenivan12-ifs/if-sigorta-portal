# Relances de paiement après 15 minutes

## Déploiement

1. Appliquer `supabase/migrations/20261101154112_payment_reminders.sql` avant le code (ajout de la langue partenaire et de la file dédiée).
2. Déployer le code. Les relances restent désactivées sans `PAYMENT_REMINDERS_ENABLED_FROM`.
3. Faire approuver les six modèles WhatsApp ci-dessous sur le compte Meta associé au numéro existant. Corps avec exactement trois variables texte, dans l’ordre : nom du destinataire, référence du dossier, URL. Pas de bouton dynamique dans cette version.
4. Configurer `PAYMENT_REMINDER_CRON_SECRET` avec un secret aléatoire long côté hébergeur et planificateur. Conserver les variables WhatsApp existantes. Ne jamais mettre les secrets dans Git.
5. Programmer un POST authentifié toutes les minutes vers `https://ifsigorta.com/api/cron/payment-reminders`, en-tête `Authorization: Bearer <secret>`. Utiliser Supabase Cron + pg_net + Vault ou un planificateur équivalent. Un appel traite trois dossiers maximum ; surveiller le volume et le retard si le trafic augmente.
6. Après approbation des modèles et vérification de la configuration, définir `PAYMENT_REMINDERS_ENABLED_FROM` à l’heure UTC d’activation (ISO 8601). Seuls les dossiers créés depuis cet instant sont éligibles. Ne pas modifier cette date lors des redéploiements.

Le premier passage après 15 minutes traite le dossier, normalement entre 15 et 16 minutes sous faible charge. Une relance ne constitue pas une vérification bancaire : aucun paiement ni justificatif ne doit être enregistré.

## Modèles à soumettre

- `payment_reminder_fr` (fr) : Bonjour {{1}}, votre demande d’assurance IF Sigorta n° {{2}} est en attente de paiement. Vous pouvez la reprendre ici : {{3}}. Besoin d’aide ? Répondez à ce message.
- `payment_reminder_en` (en) : Hello {{1}}, your IF Sigorta insurance application {{2}} is awaiting payment. Resume your application here: {{3}}. Need help? Reply to this message.
- `payment_reminder_tr` (tr) : Merhaba {{1}}, {{2}} numaralı IF Sigorta sigorta başvurunuz ödeme bekliyor. Başvurunuza buradan devam edebilirsiniz: {{3}}. Yardıma ihtiyacınız varsa bu mesajı yanıtlayabilirsiniz.
- `partner_payment_reminder_fr` (fr) : Bonjour {{1}}, le dossier IF Sigorta n° {{2}} créé depuis votre espace partenaire est en attente de paiement. Consultez le dossier ici : {{3}}. Besoin d’aide ? Répondez à ce message.
- `partner_payment_reminder_en` (en) : Hello {{1}}, IF Sigorta application {{2}}, created from your partner account, is awaiting payment. Open the application here: {{3}}. Need help? Reply to this message.
- `partner_payment_reminder_tr` (tr) : Merhaba {{1}}, iş ortağı hesabınızdan oluşturulan {{2}} numaralı IF Sigorta başvurusu ödeme bekliyor. Başvuruyu buradan açabilirsiniz: {{3}}. Yardıma ihtiyacınız varsa bu mesajı yanıtlayabilirsiniz.

Les clients directs doivent saisir leur téléphone sur la page de suivi ; le lien ne contient aucune donnée d’authentification. Les partenaires se connectent à leur espace. La langue client vient du dossier ; la langue partenaire est réglable dans sa fiche admin (français par défaut).

## Fiabilité et suivi

`payment_reminders` conserve un enregistrement unique par dossier. Plusieurs passages simultanés ne peuvent pas réserver le même dossier. L’état du dossier est relu juste avant l’appel Meta. Il subsiste l’inévitable courte fenêtre entre cette lecture et l’envoi externe : un paiement reçu exactement pendant l’appel peut croiser la notification.

`sent` signifie accepté par Meta, pas livré au téléphone. Le message fournisseur est enregistré. `skipped` signifie que le dossier n’était plus éligible. `failed` ou `processing` ancien nécessite une vérification fournisseur ; aucun nouvel envoi automatique n’est tenté après un résultat incertain pour éviter les doublons. Ne pas supprimer les lignes pour relancer.

Désactivation immédiate : vider `PAYMENT_REMINDERS_ENABLED_FROM` et arrêter le planificateur. Ne pas réutiliser l’endpoint des notifications admin : la file des relances est indépendante.

## Validation

`npm run test:payment-reminders` exécute les contrôles SQL sur une base locale jetable, sans client réel et sans message. `npm test` couvre les régressions existantes. La compilation et les tests ne valident pas l’approbation des modèles, les secrets hébergeur ni la planification réelle.
