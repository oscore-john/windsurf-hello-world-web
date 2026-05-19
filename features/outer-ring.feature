Feature: Outer Ring Penalty Zone

  The target button is surrounded by a concentric outer ring.
  Clicking the outer ring deducts 1 point from the player's score,
  adding a precision-based risk/reward mechanic.

  Scenario: Clicking the outer ring deducts 1 point
    Given the user is signed in and on the game screen
    And the current score is 0
    When the user clicks the outer ring
    Then the score display shows -1

  Scenario: Clicking the inner button still awards 1 point
    Given the user is signed in and on the game screen
    And the current score is 0
    When the user clicks the target button
    Then the score display shows 1

  Scenario: Score can go negative via repeated ring clicks
    Given the user is signed in and on the game screen
    And the current score is 0
    When the user clicks the outer ring 3 times
    Then the score display shows -3

  Scenario: Best score is not reduced by outer ring clicks
    Given the user is signed in and on the game screen
    And the user clicks the target button 5 times
    And the best score display shows 5
    When the user clicks the outer ring 3 times
    Then the score display shows 2
    And the best score display shows 5

  Scenario: Outer ring moves with the target button
    Given the user is signed in and on the game screen
    When 2 seconds elapse
    Then the outer ring has moved with the target button

  Scenario: Button label shows negative score
    Given the user is signed in and on the game screen
    And the current score is 0
    When the user clicks the outer ring 2 times
    Then the target button label shows -2
