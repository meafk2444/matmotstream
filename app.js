(function () {
  "use strict";

  var DATA = window.SCHEDULE_DATA || { people: [], hourNotes: [], eventTitle: "Planning" };
  var RANGE_START_HOUR = 20; // 20:00
  var RANGE_END_HOUR = 25;   // 01:00 le lendemain (25 = 24 + 1)
  var PX_PER_MIN = 2;        // échelle verticale de la timeline
  var TOTAL_MIN = (RANGE_END_HOUR - RANGE_START_HOUR) * 60; // 300
  var TRACK_HEIGHT = TOTAL_MIN * PX_PER_MIN;

  // Heure (label) -> { start, end } en "HH:MM"
  var HOUR_TIME_MAP = {
    "20": { start: "20:00", end: "21:00" },
    "21": { start: "21:00", end: "22:00" },
    "22": { start: "22:00", end: "23:00" },
    "23": { start: "23:00", end: "00:00" },
    "00": { start: "00:00", end: "01:00" }
  };

  // Couleur associée à chaque heure, pour repérer d'un coup d'œil le
  // créneau sur la timeline (dégradé crépuscule -> nuit profonde).
  var HOUR_COLORS = {
    "20": "#FFD166",
    "21": "#FF9F5A",
    "22": "#F2637A",
    "23": "#B968D9",
    "00": "#6C8CFF"
  };

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
    return (h - RANGE_START_HOUR) * 60 + m;
  }

  // ---------- Construction des instances (personne x heure) ----------
  function buildInstances() {
    var list = [];
    DATA.people.forEach(function (person, pIdx) {
      (person.hours || []).forEach(function (hourLabel) {
        var t = HOUR_TIME_MAP[hourLabel];
        if (!t) return;
        var isPriority = (person.priority || []).indexOf(hourLabel) !== -1;
        list.push({
          personIdx: pIdx,
          pseudo: person.pseudo,
          comment: person.comment || "",
          hourLabel: hourLabel,
          isPriority: isPriority,
          start: parseTimeToMinutes(t.start),
          end: parseTimeToMinutes(t.end),
          startLabel: t.start,
          endLabel: t.end
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
      var laneEnds = [];
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
  // Priorité : parmi les personnes non cochées dont l'heure est la plus
  // proche, celles marquées "priority" pour cette heure passent avant.
  function computeNext(instances) {
    var now = nowInRangeMinutes();
    var candidates = {}; // pseudo -> instance la plus proche non cochée
    instances.forEach(function (inst) {
      if (doneSet[inst.pseudo]) return;
      if (!(inst.pseudo in candidates) || inst.start < candidates[inst.pseudo].start) {
        candidates[inst.pseudo] = inst;
      }
    });
    var arr = Object.keys(candidates).map(function (k) { return candidates[k]; });
    if (arr.length === 0) return null;

    function pickBest(list) {
      list.sort(function (a, b) {
        if (a.start !== b.start) return a.start - b.start;
        if (a.isPriority !== b.isPriority) return a.isPriority ? -1 : 1;
        return 0;
      });
      return list[0];
    }

    var upcoming = arr.filter(function (i) { return i.start >= now; });
    if (upcoming.length > 0) return pickBest(upcoming);
    return pickBest(arr);
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
      '<p class="next-label">' + (nextInst.isPriority ? "★ Prochain (prioritaire)" : "Prochain") + '</p>' +
      '<p class="next-name">' + escapeHtml(nextInst.pseudo) + '</p>' +
      '<p class="next-time">Entre ' + escapeHtml(nextInst.startLabel) + ' et ' + escapeHtml(nextInst.endLabel) + '</p>' +
      (nextInst.comment ? '<p class="next-comment">' + escapeHtml(nextInst.comment) + '</p>' : '') +
      '</div>' +
      '<button class="next-check" type="button">Marquer passé ✓</button>';

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

    var now = nowInRangeMinutes();
    if (now >= 0 && now <= TOTAL_MIN) {
      var nowLine = document.createElement("div");
      nowLine.className = "now-line";
      nowLine.style.top = minutesToY(now) + "px";
      tracks.appendChild(nowLine);
    }

    var nextInst = computeNext(instances);
    instances.forEach(function (inst) {
      var top = minutesToY(inst.start);
      var height = Math.max(minutesToY(inst.end - inst.start), 44);
      var widthRatio = 1 / inst.laneCount;
      var leftRatio = inst.lane * widthRatio;
      var hourColor = HOUR_COLORS[inst.hourLabel] || "#7C8896";

      var row = document.createElement("div");
      row.className = "person-row";
      row.style.setProperty("--hour-color", hourColor);
      if (doneSet[inst.pseudo]) row.classList.add("is-done");
      if (inst.isPriority) row.classList.add("is-priority");
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

      var chip = document.createElement("span");
      chip.className = "hour-chip";
      chip.textContent = inst.hourLabel + "h";

      var info = document.createElement("div");
      info.className = "person-info";
      info.innerHTML =
        '<div class="person-pseudo">' + escapeHtml(inst.pseudo) + (inst.isPriority ? ' <span class="star">★</span>' : '') + '</div>' +
        '<div class="person-time">Entre ' + escapeHtml(inst.startLabel) + ' et ' + escapeHtml(inst.endLabel) + '</div>' +
        (inst.comment ? '<div class="person-comment">' + escapeHtml(inst.comment) + '</div>' : '');

      row.appendChild(chip);
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

  document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("reset-btn").addEventListener("click", function () {
      doneSet = {};
      render();
    });
    render();
    setInterval(render, 30000);
  });
})();
