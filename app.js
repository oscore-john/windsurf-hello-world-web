var SUPABASE_URL = "https://vyjswambsfbpebkwbwcx.supabase.co";
var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5anN3YW1ic2ZicGVia3did2N4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMTU1NTMsImV4cCI6MjA5NDU5MTU1M30.9vFxHR9CTfS3DOP0PWOulww1RgDov206tUA4Ofdfqcw";

(function () {
  var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  var authScreen = document.getElementById("auth-screen");
  var gameScreen = document.getElementById("game-screen");
  var signinForm = document.getElementById("signin-form");
  var signupForm = document.getElementById("signup-form");
  var showSignup = document.getElementById("show-signup");
  var showSignin = document.getElementById("show-signin");
  var authError = document.getElementById("auth-error");
  var signOutBtn = document.getElementById("sign-out-btn");
  var displayEmail = document.getElementById("display-email");
  var displayScore = document.getElementById("display-score");
  var displayBest = document.getElementById("display-best");

  var currentUser = null;
  var bestScore = 0;
  var saveTimeout = null;

  function showError(msg) {
    authError.textContent = msg;
  }

  function clearError() {
    authError.textContent = "";
  }

  function showAuth() {
    authScreen.style.display = "";
    gameScreen.style.display = "none";
    currentUser = null;
    Game.stop();
  }

  function showGame(user) {
    currentUser = user;
    authScreen.style.display = "none";
    gameScreen.style.display = "";
    displayEmail.textContent = user.email;
    displayScore.textContent = "0";
    displayBest.textContent = "0";
    bestScore = 0;
    document.getElementById("target-btn").textContent = "0";
    Game.stop();
    loadScore(user.id);
  }

  function loadScore(userId) {
    supabase
      .from("scores")
      .select("score, best")
      .eq("user_id", userId)
      .maybeSingle()
      .then(function (result) {
        var row = result.data;
        var currentScore = 0;
        bestScore = 0;
        if (row) {
          currentScore = row.score || 0;
          bestScore = row.best || 0;
        }
        displayScore.textContent = currentScore;
        displayBest.textContent = bestScore;
        Game.start(currentScore, onScoreChange);
      });
  }

  function onScoreChange(newScore) {
    displayScore.textContent = newScore;
    if (newScore > bestScore) {
      bestScore = newScore;
      displayBest.textContent = bestScore;
    }
    scheduleSave(newScore, bestScore);
  }

  function scheduleSave(score, best) {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(function () {
      saveScore(score, best);
    }, 2000);
  }

  function saveScore(score, best) {
    if (!currentUser) return;
    supabase
      .from("scores")
      .upsert(
        { user_id: currentUser.id, score: score, best: best },
        { onConflict: "user_id" }
      )
      .then(function () {});
  }

  // Auth form toggling
  showSignup.addEventListener("click", function (e) {
    e.preventDefault();
    clearError();
    signinForm.style.display = "none";
    signupForm.style.display = "";
  });

  showSignin.addEventListener("click", function (e) {
    e.preventDefault();
    clearError();
    signupForm.style.display = "none";
    signinForm.style.display = "";
  });

  // Sign in
  signinForm.addEventListener("submit", function (e) {
    e.preventDefault();
    clearError();
    var email = document.getElementById("signin-email").value;
    var password = document.getElementById("signin-password").value;
    var btn = signinForm.querySelector(".auth-btn");
    btn.disabled = true;

    supabase.auth
      .signInWithPassword({ email: email, password: password })
      .then(function (result) {
        btn.disabled = false;
        if (result.error) {
          showError(result.error.message);
          return;
        }
        showGame(result.data.user);
      });
  });

  // Sign up
  signupForm.addEventListener("submit", function (e) {
    e.preventDefault();
    clearError();
    var email = document.getElementById("signup-email").value;
    var password = document.getElementById("signup-password").value;
    var btn = signupForm.querySelector(".auth-btn");
    btn.disabled = true;

    supabase.auth
      .signUp({ email: email, password: password })
      .then(function (result) {
        btn.disabled = false;
        if (result.error) {
          showError(result.error.message);
          return;
        }
        if (result.data.user) {
          showGame(result.data.user);
        }
      });
  });

  // Sign out
  signOutBtn.addEventListener("click", function () {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveScore(Game.getScore(), bestScore);
    supabase.auth.signOut().then(function () {
      showAuth();
    });
  });

  // Save on page unload
  window.addEventListener("beforeunload", function () {
    if (currentUser) {
      saveScore(Game.getScore(), bestScore);
    }
  });

  // Check existing session on load
  supabase.auth.getSession().then(function (result) {
    var session = result.data.session;
    if (session && session.user) {
      showGame(session.user);
    } else {
      showAuth();
    }
  });

  // Listen for auth state changes
  supabase.auth.onAuthStateChange(function (event, session) {
    if (event === "SIGNED_OUT") {
      showAuth();
    }
  });
})();
