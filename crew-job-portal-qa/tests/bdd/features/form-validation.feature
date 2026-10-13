@validation
Feature: Application form validation
  As a candidate
  I want clear messages when my details are wrong
  So that I can fix them before the application is sent

  Background:
    Given I am on the application form

  @VAL-01 @P1 @smoke @negative
  Scenario: Empty form flags every required field and sends nothing
    When I submit the application
    Then every required field shows an error
    And the first invalid field has the focus
    And the cover note is not flagged
    And no request is sent to the server

  @VAL-02 @P1 @negative
  Scenario Outline: Invalid email formats are rejected
    When I submit a valid application with the email "<email>"
    Then the "email" field shows the error "valid email address"
    And no confirmation is shown
    And no request is sent to the server

    Examples:
      | email     |
      | plain     |
      | a@        |
      | @b.com    |
      | a@b       |
      | a b@c.com |
      | a@@b.com  |

  @VAL-03 @P2 @positive
  Scenario Outline: Valid email formats are accepted
    When I submit a valid application with the email "<email>"
    Then the application is accepted

    Examples:
      | email                          |
      | a@b.co                         |
      | first.last+tag@sub.example.com |

  @VAL-04 @P1 @negative @edge
  Scenario Outline: A name with no visible characters is rejected
    When I submit a valid application with a full name made only of <kind>
    Then the "fullName" field shows the error "Enter your full name."
    And no request is sent to the server

    Examples:
      | kind                |
      | spaces              |
      | tabs                |
      | non-breaking spaces |
      | zero-width spaces   |

  @VAL-04 @P1 @positive @edge
  Scenario: Spaces around a real name are removed before saving
    When I submit a valid application with the full name "   Asha Raman   "
    Then the confirmation shows the name "Asha Raman"
    And the server stored the full name "Asha Raman"

  @VAL-05 @P2 @boundary
  Scenario Outline: Name length limits are 2 to 60 characters
    When I submit a valid application with a full name of <length> characters
    Then the full name is <result>

    Examples:
      | length | result   |
      | 1      | rejected |
      | 2      | accepted |
      | 60     | accepted |
      | 61     | rejected |

  @VAL-06 @P2 @boundary
  Scenario Outline: Years of experience must be a whole number from 0 to 20
    When I submit a valid application with the years of experience "<value>"
    Then the years of experience is <result>

    Examples:
      | value | result   |
      | -1    | rejected |
      | 0     | accepted |
      | 20    | accepted |
      | 21    | rejected |
      | 1.5   | rejected |
      | abc   | rejected |

  @VAL-07 @P2 @boundary
  Scenario Outline: Cover note limit is 500 characters
    When I submit a valid application with a cover note of <length> characters
    Then the cover note is <result>

    Examples:
      | length | result   |
      | 500    | accepted |
      | 501    | rejected |

  @VAL-08 @P2 @negative @security
  Scenario: Script text is shown as plain text and never runs
    When I submit a valid application with the full name "<script>alert(1)</script>"
    Then the confirmation shows the name "<script>alert(1)</script>"
    And no browser dialog opened

  @VAL-08 @P2 @positive @edge
  Scenario: A Tamil name is accepted and shown unchanged
    When I submit a valid application with the full name "ரோஷினி"
    Then the confirmation shows the name "ரோஷினி"
    And the server stored the full name "ரோஷினி"
