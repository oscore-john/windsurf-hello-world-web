Feature: User Authentication

  Users must authenticate before playing the click-the-button game.
  The app supports email/password sign-up and sign-in via Supabase Auth.

  Scenario: New user signs up successfully
    Given the user is on the auth screen
    When the user switches to the sign-up form
    And enters a valid email and password
    And submits the sign-up form
    Then the game screen is displayed
    And the user's email is shown in the header

  Scenario: Existing user signs in successfully
    Given a user account exists with known credentials
    And the user is on the auth screen
    When the user enters their email and password
    And submits the sign-in form
    Then the game screen is displayed
    And the user's email is shown in the header

  Scenario: User signs out
    Given the user is signed in and on the game screen
    When the user clicks the sign-out button
    Then the auth screen is displayed

  Scenario: Sign-in with invalid credentials shows error
    Given the user is on the auth screen
    When the user enters an incorrect password
    And submits the sign-in form
    Then an error message is displayed on the auth screen
    And the auth screen remains visible
