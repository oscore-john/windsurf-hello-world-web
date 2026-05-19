var Game = (function () {
  var BUTTON_COUNT = 3;
  var MOVE_DELAY_MS = 1000;
  var TOTAL_SIZE = 160;

  var SIZE_TIERS = [
    { size: 80, points: 1, fontSize: "1.5rem" },
    { size: 52, points: 2, fontSize: "1rem" },
    { size: 32, points: 5, fontSize: "0.75rem" }
  ];

  var score = 0;
  var area = document.getElementById("game-area");
  var buttons = [];
  var rings = [];
  var buttonTiers = [];
  var moveIntervals = [];
  var onScoreChange = null;

  var COLORS = [
    { r: 8, g: 145, b: 178 },
    { r: 126, g: 34, b: 206 },
    { r: 220, g: 38, b: 38 },
    { r: 234, g: 179, b: 8 },
    { r: 22, g: 163, b: 74 },
    { r: 219, g: 39, b: 119 },
    { r: 249, g: 115, b: 22 }
  ];

  function selectRandomTier() {
    return SIZE_TIERS[Math.floor(Math.random() * SIZE_TIERS.length)];
  }

  function applySize(btn, tier) {
    btn.style.width = tier.size + "px";
    btn.style.height = tier.size + "px";
    btn.style.fontSize = tier.fontSize;
  }

  function getRandomPosition(existingPositions) {
    var maxX = area.clientWidth - TOTAL_SIZE;
    var maxY = area.clientHeight - TOTAL_SIZE;
    var attempts = 0;
    var pos;

    do {
      pos = {
        x: Math.max(0, Math.floor(Math.random() * maxX)),
        y: Math.max(0, Math.floor(Math.random() * maxY))
      };
      attempts++;
    } while (attempts < 50 && overlapsAny(pos, existingPositions));

    return pos;
  }

  function overlapsAny(pos, existingPositions) {
    for (var i = 0; i < existingPositions.length; i++) {
      var other = existingPositions[i];
      if (
        Math.abs(pos.x - other.x) < TOTAL_SIZE &&
        Math.abs(pos.y - other.y) < TOTAL_SIZE
      ) {
        return true;
      }
    }
    return false;
  }

  function applyRandomColour(btn, ring) {
    var c = COLORS[Math.floor(Math.random() * COLORS.length)];
    btn.style.borderColor = "rgba(" + c.r + "," + c.g + "," + c.b + ",0.6)";
    btn.style.background = "rgba(" + c.r + "," + c.g + "," + c.b + ",0.45)";
    btn.style.boxShadow = "0 0 1.5rem rgba(" + c.r + "," + c.g + "," + c.b + ",0.4)";
    ring.style.borderColor = "rgba(" + c.r + "," + c.g + "," + c.b + ",0.3)";
    ring.style.background = "rgba(" + c.r + "," + c.g + "," + c.b + ",0.12)";
    ring.style.boxShadow = "0 0 1.5rem rgba(" + c.r + "," + c.g + "," + c.b + ",0.2)";
  }

  function getCurrentPositions(excludeIndex) {
    var positions = [];
    for (var i = 0; i < rings.length; i++) {
      if (i === excludeIndex) continue;
      positions.push({
        x: parseInt(rings[i].style.left, 10) || 0,
        y: parseInt(rings[i].style.top, 10) || 0
      });
    }
    return positions;
  }

  function moveButton(index) {
    var ring = rings[index];
    var btn = buttons[index];
    var tier = selectRandomTier();
    buttonTiers[index] = tier;
    applySize(btn, tier);
    var existing = getCurrentPositions(index);
    var pos = getRandomPosition(existing);
    ring.style.left = pos.x + "px";
    ring.style.top = pos.y + "px";
    btn.textContent = "+" + tier.points;
    applyRandomColour(btn, ring);
  }

  function createButton() {
    var ring = document.createElement("div");
    ring.className = "outer-ring";

    var btn = document.createElement("button");
    btn.className = "target-btn";

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var idx = buttons.indexOf(btn);
      score += buttonTiers[idx].points;
      moveButton(idx);
      if (onScoreChange) {
        onScoreChange(score);
      }
    });

    ring.addEventListener("click", function () {
      score--;
      moveButton(rings.indexOf(ring));
      if (onScoreChange) {
        onScoreChange(score);
      }
    });

    ring.appendChild(btn);
    area.appendChild(ring);
    return { btn: btn, ring: ring };
  }

  function removeAllButtons() {
    for (var i = 0; i < rings.length; i++) {
      if (rings[i].parentNode) {
        rings[i].parentNode.removeChild(rings[i]);
      }
    }
    buttons = [];
    rings = [];
    buttonTiers = [];
  }

  function clearAllIntervals() {
    for (var i = 0; i < moveIntervals.length; i++) {
      clearInterval(moveIntervals[i]);
    }
    moveIntervals = [];
  }

  return {
    start: function (initialScore, callback) {
      score = initialScore || 0;
      onScoreChange = callback || null;

      removeAllButtons();
      clearAllIntervals();

      for (var i = 0; i < BUTTON_COUNT; i++) {
        var pair = createButton();
        buttons.push(pair.btn);
        rings.push(pair.ring);
        buttonTiers.push(SIZE_TIERS[0]);
      }

      for (var j = 0; j < buttons.length; j++) {
        moveButton(j);
      }

      for (var k = 0; k < buttons.length; k++) {
        (function (index) {
          var interval = setInterval(function () {
            moveButton(index);
          }, MOVE_DELAY_MS);
          moveIntervals.push(interval);
        })(k);
      }
    },
    stop: function () {
      clearAllIntervals();
      removeAllButtons();
    },
    getScore: function () {
      return score;
    }
  };
})();
