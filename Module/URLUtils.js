function URLParams(params)
{
  var queryString = Object.keys(params).map(function(key) {
    const value = params[key];
    if(value instanceof Array)
    {
      return value.map((element, index) => encodeURIComponent(`${key}[${index}]`) + "=" + encodeURIComponent(element)).join("&");
    }
    else
    {
      return encodeURIComponent(key) + "=" + encodeURIComponent(value);
    }
  }).join("&");
  return queryString;
}