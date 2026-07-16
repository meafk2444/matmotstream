/* =====================================================================
   DATA.JS — C'est le SEUL fichier que tu dois modifier pour mettre
   à jour le planning. Pas besoin de toucher au reste.

   Après modification, commit + push sur GitHub, et le site se
   met à jour automatiquement (GitHub Pages).
   ===================================================================== */

window.SCHEDULE_DATA = {

  // Titre affiché en haut de la page
  eventTitle: "Planning de la soirée",

  /* -------------------------------------------------------------------
     PERSONNES
     Pour chaque personne :
       pseudo   : son nom / pseudo (affiché en clair)
       slots    : un ou plusieurs passages, ex. "Entre 22h00 et 23h00"
                  -> { start: "22:00", end: "23:00" }
                  Tu peux mettre plusieurs créneaux si la personne
                  passe à plusieurs moments dans la soirée.
       comment  : (optionnel) une note libre sur cette personne
     Heures entre 20:00 et 01:00 (le lendemain matin).
     ------------------------------------------------------------------- */
  people: [
    {
      pseudo: "Alex",
      slots: [
        { start: "20:00", end: "20:30" }
      ],
      comment: "Arrive en premier, a les clés"
    },
    {
      pseudo: "Marie",
      slots: [
        { start: "21:00", end: "22:00" }
      ],
      comment: ""
    },
    {
      pseudo: "Sam",
      slots: [
        { start: "22:00", end: "23:00" }
      ],
      comment: "Doit repartir tôt après"
    },
    {
      pseudo: "Jules",
      slots: [
        { start: "22:30", end: "23:30" }
      ],
      comment: ""
    },
    {
      pseudo: "Nina",
      slots: [
        { start: "23:30", end: "00:30" }
      ],
      comment: "Apporte le matériel"
    },
    {
      pseudo: "Théo",
      slots: [
        { start: "00:00", end: "01:00" }
      ],
      comment: ""
    }
  ],

  /* -------------------------------------------------------------------
     PRIORITÉS HORAIRES
     Permet de marquer une heure comme importante sur la timeline,
     avec un commentaire. S'affiche comme une bande en surbrillance.
       time     : heure de début de la bande, ex "22:00"
       duration : durée en minutes de la bande (ex: 30 ou 60)
       comment  : texte affiché sur la bande
     ------------------------------------------------------------------- */
  hourNotes: [
    {
      time: "22:00",
      duration: 60,
      comment: "Créneau critique — rush attendu"
    }
  ]

};
