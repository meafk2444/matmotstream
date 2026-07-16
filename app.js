(function () {
  "use strict";

  var DATA = window.SCHEDULE_DATA || { people: [], hourNotes: [], eventTitle: "Planning" };
  var RANGE_START_HOUR = 20; // 20:00
  var RANGE_END_HOUR = 25;   // 01:00 le lendemain (25 = 24 + 1)
  var PX_PER_MIN = 2;        // échelle verticale de la timeline
  var TOTAL_MIN = (RANGE_END_HOUR - RANGE_START_HOUR) * 60; // 300
  var TRACK_HEIGHT = TOTAL_MIN * PX_PER_MIN;

  var doneSet = {}; // pseudo -> true si coché "passé"

  // ---------- Utils temps ----------
  function parseTimeToMinutes(hhmm) {
    var parts = hhmm.split(":");
    var h = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10);
    if (h < RANGE_START_HOUR) h += 24; // heures après minuit
    return (h - RANGE_START_HOUR) * 60 + m;
  }

  function minutesToY(min) {
    return min * PX_PER_MIN;
  }

  function nowInRangeMinutes() {
    var now = new Date();
    var h = now.getHours();
    var m = now.getMinutes();
    if (h < RANGE_START_HOUR) h += 24;
    var min = (h - RANGE_START_HOUR) * 60 + m;
    return min; // peut être négatif ou > TOTAL_MIN si hors plage
  }

  function fmtRange(start, end) {
    return start + " – " + end;
  }

  // ---------- Construction des instances (personne x créneau) ----------
  function buildInstances() {
    var list = [];
    DATA.people.forEach(function (person, pIdx) {
      (person.slots || []).forEach(function (slot, sIdx) {
        list.push({
          personIdx: pIdx,
          pseudo: person.pseudo,
          comment: person.comment || "",
          start: parseTimeToMinutes(slot.start),
          end: parseTimeToMinutes(slot.end),
          startLabel: slot.start,
          endLabel: slot.end
        });
      });
    });
    list.sort(function (a, b) { return a.start - b.start; });
    return list;
  }

  // ---------- Regroupement en clusters + attribution de "lanes" ----------
  function assignLanes(instances) {
    var clusters = [];
    var current = null;
    var clusterEnd = -Infinity;

    instances.forEach(function (inst) {
      if (!current || inst.start >= clusterEnd) {
        current = [];
        clusters.push(current);
        clusterEnd = inst.end;
      } else {
        clusterEnd = Math.max(clusterEnd, inst.end);
      }
      current.push(inst);
    });

    clusters.forEach(function (cluster) {
      var laneEnds = []; // fin du dernier créneau posé dans chaque lane
      cluster.forEach(function (inst) {
        var laneIdx = -1;
        for (var i = 0; i < laneEnds.length; i++) {
          if (laneEnds[i] <= inst.start) { laneIdx = i; break; }
        }
        if (laneIdx === -1) {
          laneIdx = laneEnds.length;
          laneEnds.push(inst.end);
        } else {
          laneEnds[laneIdx] = inst.end;
        }
        inst.lane = laneIdx;
      });
      var laneCount = laneEnds.length;
      cluster.forEach(function (inst) { inst.laneCount = laneCount; });
    });

    return instances;
  }

  // ---------- Détermination du "prochain" ----------
  function computeNext(instances) {
    var now = nowInRangeMinutes();
    var candidates = {}; // pseudo -> earliest start not done
    instances.forEach(function (inst) {
      if (doneSet[inst.pseudo]) return;
      if (!(inst.pseudo in candidates) || inst.start < candidates[inst.pseudo].start) {
        candidates[inst.pseudo] = inst;
      }
    });
    var arr = Object.keys(candidates).map(function (k) { return candidates[k]; });
    if (arr.length === 0) return null;

    var upcoming = arr.filter(function (i) { return i.start >= now; });
    upcoming.sort(function (a, b) { return a.start - b.start; });
    if (upcoming.length > 0) return upcoming[0];

    arr.sort(function (a, b) { return a.start - b.start; });
    return arr[0];
  }

  // ---------- Rendu ----------
  function render() {
    var instances = assignLanes(buildInstances());
    var nextInst = computeNext(instances);
    var totalPeople = DATA.people.length;
    var doneCount = Object.keys(doneSet).filter(function (k) { return doneSet[k]; }).length;

    document.title = DATA.eventTitle || "Planning de la soirée";
    document.getElementById("event-title").textContent = DATA.eventTitle || "Planning de la soirée";
    document.getElementById("counter").innerHTML =
      "<b>" + doneCount + "</b> / " + totalPeople + " passés";

    renderNextPanel(nextInst);
    renderTimeline(instances);
  }

  function renderNextPanel(nextInst) {
    var panel = document.getElementById("next-panel");
    if (!nextInst) {
      panel.classList.add("all-done");
      panel.innerHTML =
        '<div>' +
        '<p class="next-label">Statut</p>' +
        '<p class="next-name">Tout le monde est passé ✓</p>' +
        '</div>';
      return;
    }
    panel.classList.remove("all-done");
    panel.innerHTML =
      '<div>' +
      '<p class="next-label">Prochain</p>' +
      '<p class="next-name">' + escapeHtml(nextInst.pseudo) + '</p>' +
      '<p class="next-time">Entre ' + escapeHtml(nextInst.startLabel) + ' et ' + escapeHtml(nextInst.endLabel) + '</p>' +
      (nextInst.comment ? '<p class="next-comment">' + escapeHtml(nextInst.comment) + '</p>' : '') +
      '</div>' +
      '<button class="next-check" type="button" data-pseudo="' + escapeAttr(nextInst.pseudo) + '">Marquer passé ✓</button>';

    panel.querySelector(".next-check").addEventListener("click", function () {
      doneSet[nextInst.pseudo] = true;
      render();
    });
  }

  function renderTimeline(instances) {
    var axis = document.getElementById("hour-axis");
    var tracks = document.getElementById("tracks");
    axis.innerHTML = "";
    tracks.innerHTML = "";
    axis.style.height = TRACK_HEIGHT + "px";
    tracks.style.height = TRACK_HEIGHT + "px";

    // Repères d'heures + lignes de grille (toutes les 30 min)
    for (var h = RANGE_START_HOUR; h <= RANGE_END_HOUR; h++) {
      var min = (h - RANGE_START_HOUR) * 60;
      var label = (h % 24).toString().padStart(2, "0") + ":00";
      var mark = document.createElement("div");
      mark.className = "hour-mark";
      mark.style.top = minutesToY(min) + "px";
      mark.textContent = label;
      axis.appendChild(mark);

      var gline = document.createElement("div");
      gline.className = "gridline hour";
      gline.style.top = minutesToY(min) + "px";
      tracks.appendChild(gline);

      if (h < RANGE_END_HOUR) {
        var half = document.createElement("div");
        half.className = "gridline";
        half.style.top = minutesToY(min + 30) + "px";
        tracks.appendChild(half);
      }
    }

    // Bandes de priorité horaire
    (DATA.hourNotes || []).forEach(function (note) {
      var start = parseTimeToMinutes(note.time);
      var dur = note.duration || 30;
      var band = document.createElement("div");
      band.className = "priority-band";
      band.style.top = minutesToY(start) + "px";
      band.style.height = (dur * PX_PER_MIN) + "px";
      var lbl = document.createElement("div");
      lbl.className = "pb-label";
      lbl.textContent = note.comment || "";
      band.appendChild(lbl);
      tracks.appendChild(band);
    });

    // Ligne "maintenant"
    var now = nowInRangeMinutes();
    if (now >= 0 && now <= TOTAL_MIN) {
      var nowLine = document.createElement("div");
      nowLine.className = "now-line";
      nowLine.style.top = minutesToY(now) + "px";
      tracks.appendChild(nowLine);
    }

    // Lignes personnes
    var nextInst = computeNext(instances);
    instances.forEach(function (inst) {
      var top = minutesToY(inst.start);
      var height = Math.max(minutesToY(inst.end - inst.start), 44);
      var widthRatio = 1 / inst.laneCount;
      var leftRatio = inst.lane * widthRatio;

      var row = document.createElement("div");
      row.className = "person-row";
      if (doneSet[inst.pseudo]) row.classList.add("is-done");
      if (nextInst && nextInst.pseudo === inst.pseudo && nextInst.start === inst.start) {
        row.classList.add("is-next");
      }
      row.style.top = top + "px";
      row.style.height = height + "px";
      row.style.left = "calc(56px + " + leftRatio + " * (100% - 64px))";
      row.style.width = "calc(" + widthRatio + " * (100% - 64px) - 6px)";

      var chk = document.createElement("button");
      chk.className = "chk";
      chk.type = "button";
      chk.setAttribute("aria-label", "Marquer " + inst.pseudo + " comme passé");
      chk.textContent = doneSet[inst.pseudo] ? "✓" : "";
      chk.addEventListener("click", function () {
        doneSet[inst.pseudo] = !doneSet[inst.pseudo];
        render();
      });

      var info = document.createElement("div");
      info.className = "person-info";
      info.innerHTML =
        '<div class="person-pseudo">' + escapeHtml(inst.pseudo) + '</div>' +
        '<div class="person-time">Entre ' + escapeHtml(inst.startLabel) + ' et ' + escapeHtml(inst.endLabel) + '</div>' +
        (inst.comment ? '<div class="person-comment">' + escapeHtml(inst.comment) + '</div>' : '');

      row.appendChild(chk);
      row.appendChild(info);
      tracks.appendChild(row);
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  function escapeAttr(str) {
    return escapeHtml(str).replace(/"/g, "&quot;");
  }

  // ---------- Init ----------
  document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("reset-btn").addEventListener("click", function () {
      doneSet = {};
      render();
    });
    render();
    setInterval(render, 30000); // rafraîchit la ligne "maintenant" toutes les 30s
  });
})();
