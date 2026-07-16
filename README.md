# Planning de la soirée

Site statique (HTML/CSS/JS, aucun serveur) pour visualiser en mode timeline
(20h00 → 01h00) les passages de chaque personne, cocher qui est passé,
voir le prochain, et marquer des créneaux prioritaires avec commentaires.

## Mettre à jour le planning

Le seul fichier à modifier est **`data.js`**. Il est commenté en français
avec des exemples. Structure de base :

```js
people: [
  {
    pseudo: "Sam",
    slots: [ { start: "22:00", end: "23:00" } ], // "Entre 22h00 et 23h00"
    comment: "Doit repartir tôt"
  }
]
```

Une personne peut avoir plusieurs `slots` si elle passe à plusieurs moments.

Les priorités horaires (bande rouge sur la timeline) se règlent dans
`hourNotes`.

Les cases cochées ("passé") se remettent à zéro à chaque rechargement de
page — comportement voulu, pas de sauvegarde.

## Héberger sur GitHub Pages

1. Crée un dépôt GitHub (public ou privé avec Pages activé sur un plan
   qui le permet) et pousse ces 5 fichiers à la racine :
   `index.html`, `style.css`, `app.js`, `data.js`, `README.md`.

   ```bash
   git init
   git add .
   git commit -m "Planning de la soirée"
   git branch -M main
   git remote add origin https://github.com/TON-COMPTE/TON-REPO.git
   git push -u origin main
   ```

2. Sur GitHub : **Settings → Pages → Source → Deploy from a branch**,
   choisis la branche `main` et le dossier `/ (root)`, puis **Save**.

3. Après une minute ou deux, le site est disponible à :
   `https://TON-COMPTE.github.io/TON-REPO/`

4. Pour toute mise à jour du planning, modifie `data.js` directement sur
   GitHub (bouton crayon) ou en local + `git push` — le site se
   met à jour automatiquement.

## Tester en local avant de publier

Depuis le dossier du projet :

```bash
python3 -m http.server 8000
```

puis ouvre `http://localhost:8000` dans un navigateur.
