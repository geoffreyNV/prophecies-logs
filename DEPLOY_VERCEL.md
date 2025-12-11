# 🚀 Déploiement Vercel (sans GitHub)

## Étape 1 : Lier le projet

```bash
vercel link
```

Réponds aux questions :
- **Set up?** → `Y`
- **Which scope?** → Choisis ton compte
- **Link to existing project?** → `Y` (oui, lier au projet existant)
- **What's the name of your existing project?** → `prophecies-logs`

## Étape 2 : Vérifier les variables d'environnement

```bash
vercel env ls
```

Si les variables ne sont pas là, ajoute-les :

```bash
vercel env add WARCRAFTLOGS_CLIENT_ID production
# Entre: a075fc07-fb1f-4968-a77e-c5195830b684

vercel env add WARCRAFTLOGS_CLIENT_SECRET production
# Entre: osZ4qWiimy8Tn5vQH5wTDNSnf7eJ66JU2bAgBY4l
```

## Étape 3 : Déployer

```bash
vercel --prod
```

## Commandes utiles

- `vercel` - Déploie en preview
- `vercel --prod` - Déploie en production
- `vercel env ls` - Liste les variables
- `vercel logs` - Voir les logs
- `vercel ls` - Liste les déploiements

