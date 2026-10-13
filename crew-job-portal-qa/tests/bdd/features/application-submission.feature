@submission
Feature: Submitting an application
  As a candidate
  I want my application to be saved exactly once
  So that I am never counted twice or lose my application

  Background:
    Given I am on the application form

  @SUB-01 @P1 @smoke @positive
  Scenario: A valid application shows a confirmation and saves one record
    When I submit a valid application
    Then I see a confirmation with my name and a reference number
    And the form is hidden
    And the server stores exactly 1 application
    And the stored application has my typed details

  @SUB-02 @P1 @smoke @negative
  Scenario: Double-clicking Submit sends only one request
    Given the server takes 800 ms to answer
    When I fill in the form with valid details
    And I double-click the Submit button
    Then the Submit button is disabled and reads "Submitting…"
    And I see a confirmation
    And the server received exactly 1 request
    And the server stores exactly 1 application

  @SUB-02 @P1 @negative @edge
  Scenario: A second submit event while the first is pending is ignored
    Given the server takes 800 ms to answer
    When I fill in the form with valid details
    And two submit events fire back to back without a click
    Then I see a confirmation
    And the server received exactly 1 request
    And the server stores exactly 1 application

  @SUB-03 @P1 @negative
  Scenario: Applying twice with the same email is rejected
    Given I have already submitted a valid application
    When I apply again with the same email in capital letters
    Then the form shows the message "already applied"
    And no confirmation is shown
    And my typed details are still in the form
    And the server stores exactly 1 application

  @SUB-04 @P2 @negative
  Scenario: Refreshing after success does not create a second record
    Given I have already submitted a valid application
    When I refresh the page
    Then I see an empty application form
    And the server stores exactly 1 application

  @SUB-05 @P3 @positive
  Scenario: Pressing Enter in a field submits once
    When I fill in the form with valid details
    And I press Enter in the email field
    Then I see a confirmation
    And the server received exactly 1 request
    And the server stores exactly 1 application
