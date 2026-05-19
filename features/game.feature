Feature: Multiple Target Buttons

  The game displays multiple target buttons simultaneously.
  Clicking any button increments the shared score.

  Scenario: Multiple buttons are visible on game start
    Given the user is signed in and on the game screen
    Then 3 target buttons are visible in the game area

  Scenario: Clicking any target button increments the score
    Given the user is signed in and on the game screen
    And the current score is 0
    When the user clicks any target button
    Then the score display shows 1

  Scenario: Each button click contributes to the total score
    Given the user is signed in and on the game screen
    And the current score is 0
    When the user clicks target button 1
    And the user clicks target button 2
    And the user clicks target button 3
    Then the score display shows 3

  Scenario: Buttons move independently over time
    Given the user is signed in and on the game screen
    When 2 seconds elapse
    Then at least one target button has moved from its initial position

  Scenario: Best score updates when current score exceeds it
    Given the user is signed in and on the game screen
    And the current score is 0
    When the user clicks any target button
    Then the best score display shows 1
