@error-handling
Feature: When something goes wrong
  As a candidate
  I want a clear message and to keep what I typed
  So that a technical problem never costs me my application

  Background:
    Given I am on the application form

  @ERR-01 @P1 @smoke @negative
  Scenario: A server error shows a clear message and allows a retry
    Given the server fails with status 500
    When I submit a valid application
    Then the form shows the message "Something went wrong on our side"
    And no confirmation is shown
    And the Submit button is enabled
    And my typed details are still in the form
    And the server stores exactly 0 applications
    When the server recovers
    And I submit the application again
    Then I see a confirmation
    And the error message is gone
    And the server stores exactly 1 application

  @ERR-02 @P1 @negative
  Scenario: A network failure stops the loading and keeps the details
    Given the network connection drops
    When I submit a valid application
    Then the form shows the message "Could not reach the server"
    And the Submit button is enabled and reads "Submit application"
    And no confirmation is shown
    And my typed details are still in the form
    And the server stores exactly 0 applications

  @ERR-03 @P2 @boundary
  Scenario: A slow response shows a loading state until the answer arrives
    Given the server takes 3000 ms to answer
    When I fill in the form with valid details
    And I click the Submit button
    Then the Submit button is disabled and reads "Submitting…"
    And the form is marked as busy
    And I see a confirmation
    And the server stores exactly 1 application

  @ERR-04 @P2 @negative
  Scenario: A field error from the server appears next to that field
    Given the server rejects the email with "This email address is not accepted."
    When I submit a valid application
    Then the "email" field shows the error "This email address is not accepted."
    And the email field is flagged and has the focus
    And the full name field is not flagged
    And the Submit button is enabled
    And my typed details are still in the form
