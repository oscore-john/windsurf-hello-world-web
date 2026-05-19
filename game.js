var Game = (function () {
  var score = 0;
  var btn = document.getElementById("target-btn");
  var area = document.getElementById("game-area");
  var moveInterval = null;
  var MOVE_DELAY_MS = 1000;
  var onScoreChange = null;

  function getRandomPosition() {
    var btnSize = 80;
    var maxX = area.clientWidth - btnSize;
    var maxY = area.clientHeight - btnSize;
    return {
      x: Math.max(0, Math.floor(Math.random() * maxX)),
      y: Math.max(0, Math.floor(Math.random() * maxY))
    };
  }

  var COLORS = [
    { r: 8, g: 145, b: 178 },
    { r: 126, g: 34, b: 206 },
    { r: 220, g: 38, b: 38 },
    { r: 234, g: 179, b: 8 },
    { r: 22, g: 163, b: 74 },
    { r: 219, g: 39, b: 119 },
    { r: 249, g: 115, b: 22 }
  ];

  function applyRandomColour() {
    var c = COLORS[Math.floor(Math.random() * COLORS.length)];
    btn.style.borderColor = "rgba(" + c.r + "," + c.g + "," + c.b + ",0.6)";
    btn.style.background = "rgba(" + c.r + "," + c.g + "," + c.b + ",0.45)";
    btn.style.boxShadow = "0 0 1.5rem rgba(" + c.r + "," + c.g + "," + c.b + ",0.4)";
  }

  function moveButton() {
    var pos = getRandomPosition();
    btn.style.left = pos.x + "px";
    btn.style.top = pos.y + "px";
    applyRandomColour();
  }

  btn.addEventListener("click", function () {
    score++;
    btn.textContent = score;
    moveButton();
    if (onScoreChange) {
      onScoreChange(score);
    }
  });

  return {
    start: function (initialScore, callback) {
      score = initialScore || 0;
      btn.textContent = score;
      onScoreChange = callback || null;
      moveButton();
      if (moveInterval) clearInterval(moveInterval);
      moveInterval = setInterval(moveButton, MOVE_DELAY_MS);
    },
    stop: function () {
      if (moveInterval) {
        clearInterval(moveInterval);
        moveInterval = null;
      }
    },
    getScore: function () {
      return score;
    }
  };
})();
