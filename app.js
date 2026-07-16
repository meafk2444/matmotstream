(function () {
  "use strict";

  var DATA = window.SCHEDULE_DATA || { people: [], hourNotes: [], eventTitle: "Planning" };
  var RANGE_START_HOUR = 20; // 20:00
  var RANGE_END_HOUR = 25;   // 01:00 le lendemain (25 = 24 + 1)
  var PX_PER_MIN = 2;        // échelle verticale de la timeline
  var TOTAL_MIN = (RANGE_END_HOUR - RANGE_START_HOUR) * 60; // 300
  var TRACK_HEIGHT = TOTAL_MIN * PX_PER_MIN;
  var LANE_WIDTH = 270;      // largeur (px) de chaque colonne / "couloir"
  var LANE_GUTTER = 12;      // espace (px) entre les boîtes
  var TRACKS_LEFT_PAD = 8;   // marge gauche à l'intérieur de .tracks

  // Ordre chronologique des heures (pour tester la contiguïté d'une liste)
  var HOUR_ORDER = ["20", "21", "22", "23", "00"];

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

  var doneSet = {};     // pseudo -> true si coché "passé"
  var currentView = "timeline"; // "timeline" | "list"

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

  function isContiguous(hours) {
    if (hours.length <= 1) return true;
    var idxs = hours.map(function (h) { return HOUR_ORDER.indexOf(h); }).sort(function (a, b) { return a - b; });
    for (var i = 1; i < idxs.length; i++) {
      if (idxs[i] !== idxs[i - 1] + 1) return false;
    }
    return true;
  }

  // Texte d'affichage des créneaux d'une personne : une plage si les
  // heures sont contiguës ("20h–01h"), sinon la liste ("20h · 22h").
  function formatHoursLabel(block) {
    if (isContiguous(block.hours)) {
      return block.startLabel + "–" + block.endLabel;
    }
    return block.hours.map(function (h) { return h + "h"; }).join(" · ");
  }

  // ---------- Construction d'UNE box par personne ----------
  // Chaque personne n'a plus qu'une seule box, qui s'étend de son
  // premier créneau à son dernier (au lieu d'une box par heure).
  function buildPersonBlocks() {
    var list = [];
    DATA.people.forEach(function (person, pIdx) {
      var hours = (person.hours || []).filter(function (h) { return !!HOUR_TIME_MAP[h]; });
      if (!hours.length) return;

      hours = hours.slice().sort(function (a, b) {
        return parseTimeToMinutes(HOUR_TIME_MAP[a].start) - parseTimeToMinutes(HOUR_TIME_MAP[b].start);
      });

      var firstHour = hours[0];
      var lastHour = hours[hours.length - 1];
      var startLabel = HOUR_TIME_MAP[firstHour].start;
      var endLabel = HOUR_TIME_MAP[lastHour].end;
      var priorityHours = person.priority || [];

      list.push({
        personIdx: pIdx,
        pseudo: person.pseudo,
        comment: person.comment || "",
        hours: hours,
        hourLabel: firstHour,
        slotCount: hours.length,
        isPriority: priorityHours.length > 0,
        priorityHours: priorityHours,
        start: parseTimeToMinutes(startLabel),
        end: parseTimeToMinutes(endLabel),
        startLabel: startLabel,
        endLabel: endLabel
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
    });

    return instances;
  }

  function computeMaxLanes(instances) {
    var max = 0;
    instances.forEach(function (inst) {
      if (inst.lane + 1 > max) max = inst.lane + 1;
    });
    return Math.max(max, 1);
  }

  // ---------- Détermination du "prochain" ----------
  // Priorité : parmi les personnes non cochées, celle dont le créneau
  // commence le plus tôt ; en cas d'égalité, celle marquée "priority".
  function computeNext(blocks) {
    var now = nowInRangeMinutes();
    var candidates = blocks.filter(function (b) { return !doneSet[b.pseudo]; });
    if (candidates.length === 0) return null;

    function pickBest(list) {
      list = list.slice().sort(function (a, b) {
        if (a.start !== b.start) return a.start - b.start;
        if (a.isPriority !== b.isPriority) return a.isPriority ? -1 : 1;
        return 0;
      });
      return list[0];
    }

    var upcoming = candidates.filter(function (b) { return b.end >= now; });
    if (upcoming.length > 0) return pickBest(upcoming);
    return pickBest(candidates);
  }

  // ---------- Rendu ----------
  function render() {
    var allBlocks = assignLanes(buildPersonBlocks());
    var nextInst = computeNext(allBlocks);
    var totalPeople = DATA.people.length;
    var doneCount = Object.keys(doneSet).filter(function (k) { return doneSet[k]; }).length;

    document.title = DATA.eventTitle || "Planning de la soirée";
    document.getElementById("event-title").textContent = DATA.eventTitle || "Planning de la soirée";
    document.getElementById("counter").innerHTML =
      "<b>" + doneCount + "</b> / " + totalPeople + " passés";

    renderNextPanel(nextInst);
    renderTimeline(allBlocks, nextInst);
    renderList(allBlocks);
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
      '<button class="next-check" type="button">Done ✓</button>';

    panel.querySelector(".next-check").addEventListener("click", function () {
      doneSet[nextInst.pseudo] = true;
      render();
    });
  }

  function renderTimeline(allBlocks, nextInst) {
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

    // Les personnes "passées" disparaissent complètement de la timeline
    // pour laisser la place aux autres (recalcul des couloirs sans elles).
    var visibleBlocks = assignLanes(allBlocks.filter(function (b) { return !doneSet[b.pseudo]; }));
    var maxLanes = computeMaxLanes(visibleBlocks);
    var tracksWidth = maxLanes * LANE_WIDTH + TRACKS_LEFT_PAD;
    tracks.style.width = tracksWidth + "px";

    visibleBlocks.forEach(function (inst) {
      var top = minutesToY(inst.start);
      var height = Math.max(minutesToY(inst.end - inst.start), 44);
      var hourColor = HOUR_COLORS[inst.hourLabel] || "#7C8896";

      var row = document.createElement("div");
      row.className = "person-row";
      row.style.setProperty("--hour-color", hourColor);
      if (inst.isPriority) row.classList.add("is-priority");
      if (nextInst && nextInst.pseudo === inst.pseudo) {
        row.classList.add("is-next");
      }
      row.style.top = top + "px";
      row.style.height = height + "px";
      row.style.left = (inst.lane * LANE_WIDTH + TRACKS_LEFT_PAD) + "px";
      row.style.width = (LANE_WIDTH - LANE_GUTTER) + "px";

      var chk = document.createElement("button");
      chk.className = "chk";
      chk.type = "button";
      chk.setAttribute("aria-label", "Marquer " + inst.pseudo + " comme passé");
      chk.textContent = "";
      chk.addEventListener("click", function () {
        doneSet[inst.pseudo] = true;
        render();
      });

      var chip = document.createElement("span");
      chip.className = "hour-chip";
      chip.textContent = formatHoursLabel(inst);

      var info = document.createElement("div");
      info.className = "person-info";
      info.innerHTML =
        '<div class="person-pseudo">' + escapeHtml(inst.pseudo) + (inst.isPriority ? ' <span class="star">★</span>' : '') + '</div>' +
        '<div class="person-time">Entre ' + escapeHtml(inst.startLabel) + ' et ' + escapeHtml(inst.endLabel) +
        (inst.slotCount > 1 ? ' · ' + inst.slotCount + ' heures' : '') + '</div>' +
        (inst.comment ? '<div class="person-comment">' + escapeHtml(inst.comment) + '</div>' : '');

      row.appendChild(chip);
      row.appendChild(chk);
      row.appendChild(info);
      tracks.appendChild(row);
    });
  }

  function renderList(allBlocks) {
    var container = document.getElementById("list-items");
    container.innerHTML = "";

    allBlocks.forEach(function (inst) {
      var done = !!doneSet[inst.pseudo];

      var item = document.createElement("div");
      item.className = "list-item" + (done ? " is-done" : "");

      var chk = document.createElement("button");
      chk.className = "chk";
      chk.type = "button";
      chk.setAttribute("aria-label", "Marquer " + inst.pseudo + " comme " + (done ? "non passé" : "passé"));
      chk.textContent = done ? "✓" : "";
      chk.addEventListener("click", function () {
        doneSet[inst.pseudo] = !doneSet[inst.pseudo];
        render();
      });

      var info = document.createElement("div");
      info.className = "list-info";
      info.innerHTML =
        '<div class="list-top-row">' +
        '<span class="person-pseudo">' + escapeHtml(inst.pseudo) + (inst.isPriority ? ' <span class="star">★</span>' : '') + '</span>' +
        '<span class="hour-chip" style="--hour-color:' + (HOUR_COLORS[inst.hourLabel] || '#7C8896') + '">' + formatHoursLabel(inst) + '</span>' +
        '</div>' +
        (inst.comment ? '<div class="person-comment list-comment">' + escapeHtml(inst.comment) + '</div>' : '');

      item.appendChild(chk);
      item.appendChild(info);
      container.appendChild(item);
    });
  }

  function switchView(view) {
    currentView = view;
    var tabs = document.querySelectorAll(".view-tab");
    tabs.forEach(function (tab) {
      var active = tab.getAttribute("data-view") === view;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });
    document.getElementById("view-timeline").hidden = view !== "timeline";
    document.getElementById("view-list").hidden = view !== "list";
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

    document.querySelectorAll(".view-tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        switchView(tab.getAttribute("data-view"));
      });
    });

    render();
    setInterval(render, 30000);
  });
})();
