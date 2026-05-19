Feature: Account Deletion

  Authenticated users can permanently delete their own account.
  Deletion removes the auth record and all associated data.

  Scenario: Delete account button is visible on game screen
    Given the user is signed in and on the game screen
    Then a delete-account button is visible

  Scenario: Confirming account deletion removes the account
    Given the user is signed in and on the game screen
    When the user clicks the delete-account button
    And confirms the deletion in the dialog
    Then the auth screen is displayed
    And the user cannot sign in with the deleted credentials

  Scenario: Cancelling account deletion has no effect
    Given the user is signed in and on the game screen
    When the user clicks the delete-account button
    And dismisses the confirmation dialog
    Then the game screen remains displayed
    And the user's score is unchanged

  Scenario: Deleted user's score data is removed
    Given the user is signed in and has a saved score
    When the user deletes their account
    And a new account is created with the same email
    Then the new account has no saved score
