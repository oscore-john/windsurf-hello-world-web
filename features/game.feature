Feature: Click-the-Button Game

  After signing in, users play a game where they click a moving button
  to increment their score.

  Scenario: Score increments on button click
    Given the user is signed in and on the game screen
    And the current score is 0
    When the user clicks the target button
    Then the score display shows 1

  Scenario: Button moves to a new position periodically
    Given the user is signed in and on the game screen
    When 2 seconds elapse
    Then the target button has moved from its initial position

  Scenario: Score is displayed on the target button
    Given the user is signed in and on the game screen
    When the user clicks the target button 3 times
    Then the target button label shows 3
