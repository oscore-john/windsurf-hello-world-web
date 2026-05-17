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

  function moveButton() {
    var pos = getRandomPosition();
    btn.style.left = pos.x + "px";
    btn.style.top = pos.y + "px";
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
