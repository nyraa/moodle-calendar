const API_ENTRY = "https://moodle.ncku.edu.tw/webservice/rest/server.php";

// REST version
class Moodle
{
  constructor({username, password, wstoken})
  {
    if(wstoken)
    {
      this.wstoken = wstoken;
      const verify = this.get_site_info();
      if("errorcode" in verify)
      {
        throw new Error(JSON.stringify(verify));
      }
      Logger.log("Login by wstoken successfully.");
    }
    else
    {
      this.login(username, password);
      Logger.log("Login by password successfully.");
    }
  }

  login(username, password)
  {
    const res = UrlFetchApp.fetch(`https://moodle.ncku.edu.tw/login/token.php?username=${username}&password=${password}&service=moodle_mobile_app`);
    const result = JSON.parse(res.getContentText());
    if("errorcode" in result)
    {
      throw new Error(JSON.stringify(result));
    }
    this.wstoken = result.token;
  }

  get_site_info()
  {
    const res = UrlFetchApp.fetch(`${API_ENTRY}?moodlewsrestformat=json&wsfunction=core_webservice_get_site_info&wstoken=${this.wstoken}`, {
      method: "post"
    });
    return JSON.parse(res.getContentText());
  }

  multiple_call(requests)
  {
    // requests [
    //   {
    //     function,
    //     args
    //   },
    //   ...
    // ]

    // generate param string
    const param_str = requests.map((request, index) => {
      return Object.keys(request).map((key) => {
        return encodeURIComponent(`requests[${index}][${key}]`) + "=" + (request[key] instanceof Object ? encodeURIComponent(JSON.stringify(request[key])) : request[key]);
      }).join("&");
    }).join("&");


    const res = UrlFetchApp.fetch(`${API_ENTRY}?moodlewsrestformat=json&wsfunction=tool_mobile_call_external_functions&wstoken=${this.wstoken}`, {
      method: "post",
      payload: param_str
    });

    const result = JSON.parse(res.getContentText());
    result.responses = result.responses.map((response) => {
      response.data = JSON.parse(response.data);
      return response;
    });
    return result;
  }

  getEventBundles(dates)
  {
    // get calendar data
    Logger.log("Fetching calendar data...");
    const calendarData = this.get_clendars_monthly_view(dates);

    // reduce events
    const moodleEvents = calendarData.responses.reduce((eventArray, month) => {
      return eventArray.concat(month.data.weeks.reduce((weekArray, week) => {
        return weekArray.concat(week.days.reduce((dayArray, day) => {
          return dayArray.concat(day.events.filter((event) => event.modulename === "assign"));
        }, []));
      }, []));
    }, []);


    // get courses and assignments from event.course.id
    const courseSet = new Set();
    moodleEvents.forEach((event) => courseSet.add(event.course.id));
    
    Logger.log("Fetching assignment data...");
    const courses = this.get_assignments(Array.from(courseSet));

    // reduce courses to assignments with cmid key
    const assignments = courses.courses.reduce((assignDict, course) => {
      course.assignments.forEach((assign) => {
        assignDict[assign.cmid] = assign;
      });
      return assignDict;
    }, {});

    // get submissions status from course[id == event.course.id].assignments[cmid == event.instance].id
    // reduce to assignment id as key
    Logger.log("Fetching submission status...");
    const submissionsStatus = this.get_submissions_status(moodleEvents.map((event) => {
      return assignments[event.instance].id;
    })).responses.map((res) => res.data).reduce((prev, status) => {
      prev[status.lastattempt.submission.assignment] = status;
      return prev;
    }, {});

    // zip event & assignment info & submission status
    const eventBundle = moodleEvents.map((event) => {
      const assignment = assignments[event.instance];
      return {
        event,
        assignment,
        submission: submissionsStatus[assignment.id]
      };
    });
    return eventBundle;
  }

  get_assignments(courseIds)
  {
    const res = UrlFetchApp.fetch(`${API_ENTRY}?moodlewsrestformat=json&wsfunction=mod_assign_get_assignments&wstoken=${this.wstoken}`, {
      method: "post",
      payload: URLParams({
        courseids: courseIds
      })
    });
    return JSON.parse(res.getContentText());
  }

  get_clendars_monthly_view(dates)
  {
    return this.multiple_call(dates.map((date) => {
      return {
        function: "core_calendar_get_calendar_monthly_view",
        arguments: date
      };
    }));
  }

  get_submissions_status(assignids)
  {
    return this.multiple_call(assignids.map((assignid) => {
      return {
        function: "mod_assign_get_submission_status",
        arguments: {
          assignid: assignid
        }
      };
    }));
  }

  // unused methods

  get_calendar_monthly_view(year, month)
  {
    const res = UrlFetchApp.fetch(`${API_ENTRY}?moodlewsrestformat=json&wsfunction=core_calendar_get_calendar_monthly_view&wstoken=${this.wstoken}`, {
      method: "post",
      payload: URLParams({
        year: year,
        month: month,
      })
    });
    return JSON.parse(res.getContentText());
  }

  get_course_modules(cmids)
  {
    return this.multiple_call(cmids.map((cmid) => {
      return {
        function: "core_course_get_course_module",
        arguments: {
          cmid: cmid
        }
      };
    }));
  }

  get_submission_status(assignid)
  {
    const res = UrlFetchApp.fetch(`${API_ENTRY}?moodlewsrestformat=json&wsfunction=mod_assign_get_submission_status&wstoken=${this.wstoken}`, {
      method: "post",
      payload: URLParams({
        assignid: assignid,
      })
    });
    return JSON.parse(res.getContentText());
  }
}

function test()
{
  const PropertyService = PropertiesService.getScriptProperties();
  const {moodleid: username, moodlekey: password} = PropertyService.getProperties();
  const moodle = new Moodle({username, password});
  // Logger.log(moodle.getEventBundles([{year: 2023, month: 12}]));
  Logger.log(moodle.get_site_info().errorcode);
}