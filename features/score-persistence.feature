Feature: Score Persistence

  Scores are saved to a Supabase database so they persist across sessions.
  Users see their best score when they sign back in.

  Scenario: Score persists after sign-out and sign-in
    Given the user is signed in and scores 5 points
    When the user signs out
    And signs back in with the same credentials
    Then the score display reflects the previously saved score
