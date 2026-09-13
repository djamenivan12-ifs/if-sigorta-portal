# IF Sigorta Portal

Portail Next.js / React / TypeScript : demandes publiques, suivi, espace agents/administrateurs et partenaires. Données et stockage dans Supabase ; courriels via Resend et notifications via WhatsApp.

## Installation locale

1. Utiliser Node.js 22 ou une version LTS compatible avec le projet. Installer les dépendances avec `npm ci`.
2. Copier `.env.example` vers `.env.local` et remplir les valeurs d’un environnement de test. La clé privilégiée Supabase reste exclusivement côté serveur.
3. Exécuter `npm run dev`. Pour vérifier une version de production : `npm run build`, puis `npm start`.

## Vérifications avant livraison

- `npm run check` : ESLint, TypeScript et tests de non-régression isolés. Ces tests ne contactent pas les prestataires et ne modifient pas la base.
- `npm run build` : compilation complète et génération des pages.
- Vérifier les comptes administrateur, agent A, agent B et partenaire sur une base de test, ainsi qu’une demande publique avec un et deux ans de couverture.
- La vérification GitHub utilise des valeurs fictives pour compiler, jamais les secrets de production.

## Règles conservées

Le calcul d’âge demeure fondé sur l’année comme auparavant. Les prix sont calculés côté serveur. Les dossiers non attribués restent accessibles dans la file de travail ; un agent ne peut pas ouvrir le dossier attribué à un autre agent. L’administrateur garde sa visibilité globale. Les modifications d’une demande déjà créée conservent le mécanisme existant d’annulation/recréation. Le texte d’accueil « Simple, rapide & sécurisée. » conserve son vert.

## Points d’attention pour le déploiement

Le webhook WhatsApp exige `WHATSAPP_APP_SECRET` (ou `META_APP_SECRET`) et une signature valide. Sans secret, il répond 503 ; aucune signature absente n’est acceptée. La vérification GET utilise toujours `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.

La limitation des envois publics réutilise la fonction existante `consume_api_rate_limit`. Les buckets doivent être privés ; les types/tailles sont aussi contrôlés dans l’application. Le contrôle de signature de fichier ne remplace pas un antivirus.

Le proxy renouvelle les cookies des espaces authentifiés. Vérifier les cookies, le HTTPS, les en-têtes transmis par l’hébergeur et les connexions Realtime dans l’environnement cible.

Consulter `docs/deploiement-et-suite.md` avant toute publication. Ce dépôt ne contient pas encore un export complet du schéma, des politiques et des déclencheurs de la base existante ; ne pas inventer ni appliquer une migration destructive pour le reconstruire.

## Retour arrière

Conserver la version précédemment déployée et un instantané de la base avant toute future migration. Les corrections actuelles n’exécutent pas de migration et ne changent pas les données existantes. Un retour au précédent déploiement de l’application reste possible. Ne pas supprimer les modifications locales de présentation pour revenir en arrière : isoler la version à livrer dans Git après revue.

## Comptabilité

Avant de publier la refonte, appliquer les prérequis décrits dans [la procédure comptabilité](docs/comptabilite-mise-en-service.md). Les écritures nécessitent la migration transactionnelle ; les tests locaux sont inclus dans `npm run check`.
