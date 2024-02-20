# Moodle Calendar

A daemon made in Google App Script (GAS) to crawl NCKU Moodle calendar events(assignment) and sync them to Google Calendar, also send email notifications for assignment updates.

中文版的 README 請參考 [這裡](README.zh.md)

## Features
- Sync assignment events to Google Calendar automatically
- Present assignment submission status with color in Google Calendar
- Send email notifications for new assignment
- Send email notifications for assignment deadline updated
- Store token, insteadof storing account and password

## Security
- This GAS project is standalone, open source and totally under your own Google account, no data will be sent to any other server.
- If you are still worried about your Moodle account and password, you can remove them from GAS project after initialization. (But you need to refill them if token revoked unexpectedly)

## Setup
Make sure you read [Reminder Notice](#reminder-notice) carefully before actually operate setup.
1. Login your Google account (must be school Google Workspace account) in browser.
2. Visit [GAS project: Moodle Calendar Prototype](https://script.google.com/d/1xTOFyXwG29KlCkZwG-cZkHT3_bvQwJ7Z1epCd0n0BsQwIr7WIPnFIXLt/edit) and go to `Overview` to make a copy under your Google account.
3. Open the copied project, go to `Project Settings` to add properties `moodleid` and `moodlekey` and fill in your Moodle account and password.
4. Go to `Editor` and select `Inititalize.gs` then click `Run` to initialize the project. Script will create a calendar called `Moodle Calendar` under executor's account and sync existed event. (You may need to authorize the project to access your Google account)
5. (Optional) You can delete the `moodleid` and `moodlekey` after initialization if you don't want leave your Moodle account and password in GAS project. (But you need to refill them if token revoked unexpectedly)
6. Go to `Triggers` and add a trigger to `main`, set `event source` to `Time-driven`, `type` to `Hour timer`, `interval` to 6 hours and click `Save`. (The interval presents the sync frequency. Don't set too short interval to avoid making overload to Moodle server)

## Reminder Notice
- Don't make too short interval in trigger settings, it may cause overload to Moodle server.
- Don't add event to `Moodle Calendar` manually, it will be removed by script.
- Please use school Google Workspace account or you can't view and clone Protoype Project.
- The Google account you set the trigger and grant premission will be the **executor** of this project.
- Calendar events will be created under **executor's** account.
- Notification email will be sent to **executor's** email.

## Apperance
### Google Calendar
| Event Color     | Status        |
|-----------------|---------------|
| &#128994; Green | Submitted     |
| &#128993; Yellow| Not submitted |
| &#128308; Red   | Overdue       |
| &#128280; Gray  | Not open yet / No submission required |

Evnet time is from 00:00 to submission deadline.

## Premission
This project need following premissions:
| Premission | Feature |
|------------|---------|
| `See, edit, share, and permanently delete all the calendars you can access using Google Calendar` |   Sync assignment events to Google Calendar.  |
| `Connect to an external service` | Fetch data from Moodle. |
| `Send email as you` | Send email notifications. |

## Settings about notification
Under `Main.gs` function main, there are some settings about notification, you can modify them to enable or disable notification.
| Settings | Default  | Feature |
|----------|----------|----------|
|   `enableNewEventNotify`  |   `true`  |   Send notification if new assignment available.  |
|   `enableEditEventNotify`  |   `true`  |   Send notification if assignment deadline updated.  |

## Troubleshooting
You can set interval of error notification sent to your email in trigger settings. GAS will send error notification to your email if any error occured.

## Summary of failures for Google Apps Script: Moodle Calendar
This error may be sent to your email if any error occured.

### Exception: Address unavailable...
### Exception: Request failed returned code 503...
- Excpetion occured when fetching data from Moodle, may be caused by Moodle exception or connection issue. Ignore if not occured continuously.

### Login failed
- Check your Moodle account and password in properties is correct.
- If your account and password is removed after initialization, refill them and run `main` to gain new token.
- If all of them is not working, maybe Moodle is under bad condition, try again later.

## Change Log
- 2023/12/6 (0494aeb): Use batch call in `core_calendar_get_calendar_monthly_view` to reduce request count.
- 2023/12/12 (7c17937): Use REST API to reduce request count.
- 2023/12/13 (eea0db4): Fix submission type `teamsubmission` not handled.
- 2024/1/31 (f41649a): Fix google calendar event duplicate due to date range generating bug.
