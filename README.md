# Moodle Calendar

A daemon to crawl NCKU Moodle calendar events(assignment) and sync them to Google Calendar, also send email notifications for new assignment.

## Features
- Sync assignment events to Google Calendar automatically
- Submissions status mark as color
- Send email notifications for new assignment
- Send email notifications for assignment deadline updated

## Security
- This project is standalone and totally under your own Google account, no data will be sent to any other server.
- If you are still worried about your Moodle account and password, you can delete them after initialization. (But you need to refill them if session expired unexpectedly)

## Setup
1. Login your Google account (school Google Workspace account recommanded) in browser.
2. Visit GAS project [Moodle Calendar Prototype](https://script.google.com/d/1Vyr0Ov7SeWvpx4irqbXSq2cUYPJI6RSeZ7oLxzqpQmtadFMxhaFy0X8X/edit) and make a copy under your Google account.
3. Open the copied project, go to `Project Settings` to add properties `moodleid` and `moodlekey` and fill in your Moodle account and password.
4. Go to `Editor` and select `Inititalize.gs` then click `Run` to initialize the project. Script will create a calendar called `Moodle Calendar` under executor's account and sync existed event. (You may need to authorize the project to access your Google account)
5. You can delete the `moodleid` and `moodlekey` after initialization if you don't want leave your Moodle account and password in GAS project. (But you need to refill them if session expired unexpectedly)
6. Go to `Triggers` and add a trigger to `main`, set `event source` to `Time-driven`, `type` to `Hour timer`, `interval` to `4~6 hours` and click `Save`. (Don't set too short interval to avoid make overload to Moodle server)
7. Add another trigger to `touchSession` and interval to 1 hour. (This trigger is used to keep session alive)

## Apperance
### Google Calendar
| Color | Meaning     |
|:------|:-------------|
| Green | Submitted   |
| Yellow| Not submitted|
| Red   | Overdue     |
| Gray  | Not open yet |

## Settings about notification
Under `Main.gs` function main, there are some settings about notification, you can modify them to fit your needs.
| Settings | Default  | Feature |
|----------|----------|----------|
|   `enableNewEventNotify`  |   `true`  |   Send notification if new assignment available.  |
|   `enableEditEventNotify`  |   `true`  |   Send notification if assignment deadline updated.  |
