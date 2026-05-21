Feature: Points Indicator Rotation

  The points indicator text on each target button is randomly rotated
  by a multiple of 90 degrees on every reposition, adding visual variety.

  Background:
    Given the user is signed in and on the game screen

  Scenario: Points indicator displays at a rotated angle
    Then at least one target button has a rotated points indicator

  Scenario: Rotation changes between repositions
    When the buttons reposition multiple times
    Then at least one button should display its points indicator at more than one distinct rotation

  Scenario: All four rotations are used across buttons
    When the buttons reposition 20 times
    Then points indicators have appeared at rotations 0, 90, 180, and 270 degrees

  Scenario: Rotation does not affect point value text
    Then every target button displays a valid point value label

  Scenario: Rotated text remains within button bounds
    When the buttons reposition multiple times
    Then the points indicator text does not overflow its button
