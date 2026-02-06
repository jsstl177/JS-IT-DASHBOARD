/**
 * @fileoverview Default checklist items for new employee onboarding.
 *
 * Based on the "New Employee Setup" process document. Each item represents
 * a task that must be completed when onboarding a new hire, organised by
 * category (Domain, Outlook Email, M365, Dashlane, INFORM, etc.).
 *
 * These items are inserted into the checklist_items table whenever a new
 * employee setup checklist is created.
 */

const defaultChecklistItems = [
  // 1. Domain
  {
    category: 'Domain',
    item_name: 'Setup Domain User',
    description: 'Log into Domain controller (192.168.177.27). Open Users & computers from Server manager. Copy a user that is in the same department. Ensure user is in Entra-Sync OU'
  },

  // 2. Outlook Email
  {
    category: 'Outlook Email',
    item_name: 'Request New Employee Email',
    description: 'Go to IT page->Jen->Forms->Request New Employee Email. Select General, Daily Recap, Marketing and Training for Corp Broadcast Emails. Requester address: it@powerofjs.com'
  },
  {
    category: 'Outlook Email',
    item_name: 'Set Password Reminder',
    description: 'Set reminder that if email password is not sent within 24 hours then reach out to corp. Save temp password for new employee until Day 1 training'
  },

  // 3. M365
  {
    category: 'M365',
    item_name: 'Assign M365 License',
    description: 'Assign appropriate license: F1, Business Basic, or Business Standard based on role'
  },
  {
    category: 'M365',
    item_name: 'Configure License Details',
    description: 'F1=$1.66, Business Basic=$5.67, Business Standard=$11.80. All include F1 base license'
  },

  // 4. Dashlane
  {
    category: 'Dashlane',
    item_name: 'Add User to Dashlane',
    description: 'Log into Dashlane, go to account then admin. Add User. Type in new employees johnstone email'
  },

  // 5. INFORM
  {
    category: 'INFORM',
    item_name: 'Setup INFORM User',
    description: 'File->Company->User Master. Click Edit, Click Add User. Fill out user details. Access level set to 89'
  },
  {
    category: 'INFORM',
    item_name: 'Configure INFORM Branch',
    description: 'Find default branch. Custom Departments: Assign to correct EV and Store (FJ, BJ, ST, etc.). Check Web mail box'
  },
  {
    category: 'INFORM',
    item_name: 'Test INFORM Login',
    description: 'On another computer use the INFORM icon login with newly created credentials but do NOT check remember me'
  },

  // 6. JEN
  {
    category: 'JEN',
    item_name: 'Create JEN UserID',
    description: 'UserID: (first initial, last name, underscore, store number). Go to JXI and hit Update JXI users from JEN at the top right'
  },
  {
    category: 'JEN',
    item_name: 'Configure JEN Display Name',
    description: 'Display Name is First Name(SPACE)LastName. Fill out form. Confidential needs to be selected'
  },

  // 7. JU ONLINE
  {
    category: 'JU ONLINE',
    item_name: 'Setup JU Online Account',
    description: 'Username is johnstone email. Log into JU Online button and select ADMIN, go to Admin on the top right'
  },
  {
    category: 'JU ONLINE',
    item_name: 'Add Person to Directory',
    description: 'Go to Directory then select People->Add Person. Use Johnsonsupply.com email'
  },
  {
    category: 'JU ONLINE',
    item_name: 'Configure JU Online Groups',
    description: 'Assign appropriate groups (list provided in document)'
  },

  // 8. Additional Setup
  {
    category: 'Additional Setup',
    item_name: 'Create AD User for Advantive',
    description: 'Login to INFORM Server and create new AD user for Advantive'
  },
  {
    category: 'Additional Setup',
    item_name: 'Setup Distribution Groups',
    description: 'Email Tony to setup employees in Distribution groups'
  },
  {
    category: 'Additional Setup',
    item_name: 'Setup Vonage VBC',
    description: 'Make user in Vonage VBC system'
  },
  {
    category: 'Additional Setup',
    item_name: 'Send Welcome Email',
    description: 'Email password sheet to employee and Matt D.'
  },

  // 9. Salto's
  {
    category: 'Salto\'s',
    item_name: 'Setup Salto\'s Access',
    description: 'EC - Electronic access system setup'
  },

  // 10. CDA Alarm
  {
    category: 'CDA Alarm',
    item_name: 'Setup CDA Alarm Code',
    description: 'New Employee will give IT their preferred alarm code on Day 1 Training. During training IT will demonstrate how to use panel'
  },

  // UPG Navigator and Goodman
  {
    category: 'UPG Navigator',
    item_name: 'Setup UPG Navigator Account',
    description: 'Account, Manage Account, Add User. Fill out form. Check Goodman Toolkit and Amana Toolkit boxes'
  },
  {
    category: 'UPG Navigator',
    item_name: 'Configure Goodman Credentials',
    description: 'Goodman User: (First name (.) Last name). Goodman Pass: welcome'
  },

  // MITS
  {
    category: 'MITS',
    item_name: 'Setup MITS Account',
    description: 'If sales, log into MITS with "Tony" credentials. If counter, use "Bridgeton" credentials from Dashlane'
  }
];

module.exports = { defaultChecklistItems };
