(function () {
  var score = 0;
  var btn = document.getElementById("target-btn");
  var area = document.getElementById("game-area");
  var moveInterval = null;
  var MOVE_DELAY_MS = 1000;

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
  });

  moveButton();
  moveInterval = setInterval(moveButton, MOVE_DELAY_MS);
})();
