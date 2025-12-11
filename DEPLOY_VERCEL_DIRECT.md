# 🚀 Déploiement Vercel Direct (sans GitHub)

## Solution : Utiliser un Token d'Accès Personnel

### Étape 1 : Créer un token sur Vercel

1. Va sur https://vercel.com/account/tokens
2. Clique sur "Create Token"
3. Donne-lui un nom (ex: "CLI Deployment")
4. Copie le token généré

### Étape 2 : Se connecter avec le token

```bash
vercel login
# Choisis "Email" ou "GitHub" selon ton compte
# OU utilise directement le token :
vercel login --token TON_TOKEN_ICI
```

### Étape 3 : Déployer

```bash
vercel --prod
```

## Alternative : Déployer via l'interface web

Si le CLI continue de poser problème :

1. Va sur https://vercel.com/dashboard
2. Clique sur "Add New..." → "Project"
3. Clique sur "Deploy" (sans GitHub)
4. Upload ton dossier ou utilise le drag & drop
5. Configure les variables d'environnement dans les settings

## Variables d'environnement à configurer

Dans Vercel Dashboard → Settings → Environment Variables :

- `WARCRAFTLOGS_CLIENT_ID` = `a075fc07-fb1f-4968-a77e-c5195830b684`
- `WARCRAFTLOGS_CLIENT_SECRET` = `osZ4qWiimy8Tn5vQH5wTDNSnf7eJ66JU2bAgBY4l`

## Note importante

Vercel vérifie l'auteur Git même pour les déploiements CLI. Si tu continues d'avoir des erreurs de permissions, utilise l'interface web qui ne vérifie pas Git.

