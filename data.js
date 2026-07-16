/* =====================================================================
   DATA.JS — C'est le SEUL fichier que tu dois modifier pour mettre
   à jour le planning. Pas besoin de toucher au reste.

   Après modification, commit + push sur GitHub (ou édite directement
   sur github.com avec le crayon ✏️), et le site se met à jour tout seul.
   ===================================================================== */

window.SCHEDULE_DATA = {

  // Titre affiché en haut de la page
  eventTitle: "Planning de la soirée",

  /* -------------------------------------------------------------------
     PERSONNES
     Comme tous les créneaux durent 1h pile, tu listes juste les heures
     où la personne passe, avec l'heure de DÉBUT de chaque créneau :

       "20"  = Entre 20h00 et 21h00
       "21"  = Entre 21h00 et 22h00
       "22"  = Entre 22h00 et 23h00
       "23"  = Entre 23h00 et 00h00
       "00"  = Entre 00h00 et 01h00

     Champs :
       pseudo   : son pseudo
       hours    : liste des heures où elle passe (voir ci-dessus)
       priority : (optionnel) sous-liste des heures de "hours" où
                  cette personne doit PASSER EN PREMIER s'il y a
                  plusieurs personnes prévues sur la même heure.
                  Ex: priority: ["22"] → à 22h, cette personne est
                  proposée avant les autres qui sont aussi sur 22h.
       comment  : (optionnel) note libre affichée sous son pseudo
     ------------------------------------------------------------------- */
  people: [
    { pseudo: "Fred4555",           hours: ["20","21","22","23","00"], priority: [], comment: "" },
    { pseudo: "ZackShrek2",         hours: ["20","21"],                priority: [], comment: "" },
    { pseudo: "pikanimes",          hours: ["21","22","23","00"],      priority: [], comment: "" },
    { pseudo: "Ac3_R4v3n",          hours: ["20","21","22"],           priority: [], comment: "" },
    { pseudo: "pikachugraga",       hours: ["20","21","22"],           priority: [], comment: "" },
    { pseudo: "honeythehivezsilk",  hours: ["20"],                     priority: [], comment: "" },
    { pseudo: "Hubbie_21",          hours: ["22","23","00"],           priority: [], comment: "" },
    { pseudo: "Billyboby23",        hours: ["20"],                     priority: [], comment: "" },
    { pseudo: "Mabielle_fx",        hours: ["20","21"],                priority: [], comment: "" },
    { pseudo: "uergap",             hours: ["20"],                     priority: [], comment: "" },
    { pseudo: "Tdwhinybitch",       hours: ["20"],                     priority: [], comment: "" },
    { pseudo: "trenchant0419",      hours: ["23","00"],                priority: [], comment: "" },
    { pseudo: "Blong_NCS",          hours: ["20"],                     priority: [], comment: "" },
    { pseudo: "im_kinoa22",         hours: ["21","22","23"],           priority: [], comment: "" },
    { pseudo: "seniorpuel12345",    hours: ["20"],                     priority: [], comment: "Ajoute ton commentaire ici" }
  ],

  /* -------------------------------------------------------------------
     PRIORITÉS GÉNÉRALES (bande rouge sur toute la timeline)
     Pour signaler une heure importante indépendamment des personnes,
     avec un commentaire visible directement sur la timeline.
       time     : heure de début de la bande, ex "22:00"
       duration : durée en minutes (souvent 60 puisque les créneaux
                  font 1h)
       comment  : texte affiché sur la bande
     ------------------------------------------------------------------- */
  hourNotes: [
    // Exemple (décommente et adapte si besoin) :
    // { time: "22:00", duration: 60, comment: "Créneau critique — rush attendu" }
  ]

};
