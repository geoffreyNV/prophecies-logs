# 📦 Push sur GitHub

## Étape 1 : Créer un repository sur GitHub

1. Va sur [github.com](https://github.com) et connecte-toi
2. Clique sur le **"+"** en haut à droite → **"New repository"**
3. Configure :
   - **Repository name** : `prophecies-raid-analyzer` (ou autre nom)
   - **Description** : `Application d'analyse de raids WoW via WarcraftLogs API`
   - **Visibility** : Public ou Private (ton choix)
   - **NE PAS** cocher "Initialize with README" (on a déjà un README)
4. Clique **"Create repository"**

## Étape 2 : Connecter le repo local à GitHub

GitHub va te donner une URL. Utilise-la dans cette commande :

```bash
git remote add origin https://github.com/TON_USERNAME/prophecies-raid-analyzer.git
```

Remplace `TON_USERNAME` par ton nom d'utilisateur GitHub.

## Étape 3 : Renommer la branche en "main"

```bash
git branch -M main
```

## Étape 4 : Pousser le code

```bash
git push -u origin main
```

Tu devras peut-être t'authentifier (token GitHub ou credentials).

## ✅ C'est fait !

Ton code est maintenant sur GitHub à :
`https://github.com/TON_USERNAME/prophecies-raid-analyzer`

## 🔄 Commandes utiles pour la suite

```bash
# Voir l'état
git status

# Ajouter des changements
git add .
git commit -m "Description des changements"

# Pousser les changements
git push

# Voir l'historique
git log
```


