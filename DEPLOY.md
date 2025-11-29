# 🚀 Guide de déploiement Vercel (CLI)

## Étape 1 : Se connecter à Vercel

```bash
vercel login
```

Ça va ouvrir ton navigateur pour te connecter avec ton compte Vercel (ou GitHub/Email).

## Étape 2 : Déployer

```bash
vercel
```

Le CLI va te poser quelques questions :
- **Set up and deploy?** → `Y` (Oui)
- **Which scope?** → Choisis ton compte
- **Link to existing project?** → `N` (Non, nouveau projet)
- **Project name?** → `prophecies-raid-analyzer` (ou ce que tu veux)
- **Directory?** → `.` (point = dossier actuel)
- **Override settings?** → `N` (Non, les settings dans vercel.json sont OK)

## Étape 3 : Ajouter les variables d'environnement

```bash
vercel env add WARCRAFTLOGS_CLIENT_ID
# Quand demandé, entre: a075fc07-fb1f-4968-a77e-c5195830b684
# Pour quel environnement? → Production, Preview, Development (les 3)

vercel env add WARCRAFTLOGS_CLIENT_SECRET
# Quand demandé, entre: osZ4qWiimy8Tn5vQH5wTDNSnf7eJ66JU2bAgBY4l
# Pour quel environnement? → Production, Preview, Development (les 3)
```

## Étape 4 : Redéployer avec les variables

```bash
vercel --prod
```

## Commandes utiles

- `vercel` - Déploie en preview (URL temporaire)
- `vercel --prod` - Déploie en production (URL permanente)
- `vercel env ls` - Liste les variables d'environnement
- `vercel logs` - Voir les logs du déploiement

## URL de ton app

Après le déploiement, tu auras une URL comme :
`https://prophecies-raid-analyzer.vercel.app`

Tu peux aussi voir toutes tes URLs avec :
```bash
vercel ls
```

