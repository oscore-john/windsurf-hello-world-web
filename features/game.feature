Feature: Multiple Target Buttons with Variable Sizes

  The game displays multiple target buttons simultaneously.
  Each button appears at a random size with smaller buttons
  awarding more points.

  Background:
    Given the user is signed in and on the game screen

  Scenario: Multiple buttons are visible on game start
    Then 3 target buttons are visible in the game area

  Scenario: Clicking any target button increments the score
    And the current score is 0
    When the user clicks any target button
    Then the score display shows a value greater than 0

  Scenario: Each button click contributes to the total score
    And the current score is 0
    When the user clicks target button 1
    And the user clicks target button 2
    And the user clicks target button 3
    Then the score display shows a value greater than 0

  Scenario: Buttons move independently over time
    When 2 seconds elapse
    Then at least one target button has moved from its initial position

  Scenario: Best score updates when current score exceeds it
    And the current score is 0
    When the user clicks any target button
    Then the best score display is greater than 0

  Scenario: Button displays current point value before click
    Then at least one button label matches a point value format

  Scenario: Button size varies between repositions
    When the buttons reposition multiple times
    Then at least one button should appear at more than one distinct size

  Scenario: Smaller button awards more points than larger button
    Given a target button is showing +5
    And the current score is 0
    When the user clicks that target button
    Then the score display shows 5

  Scenario: Largest button awards base points
    Given a target button is showing +1
    And the current score is 0
    When the user clicks that target button
    Then the score display shows 1

  Scenario: Score display updates by correct increment
    And the current score is 0
    When the user clicks any target button
    Then the score display shows a valid point increment

  Scenario: Buttons stay within game area at all sizes
    When the buttons reposition multiple times
    Then all buttons are fully visible within the game area
