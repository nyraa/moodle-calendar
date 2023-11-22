function parseSetCookieHeader(setCookieArray)
{
  if(setCookieArray == null)
  {
    return null;
  }
  if(typeof(setCookieArray) === "string")
  {
    setCookieArray = new Array(setCookieArray);
  }
  // Logger.log(setCookieArray);
    const parsedCookies = {};

    for (let header of setCookieArray)
    {
        let segments = header.split(';').map(s => s.trim());

        // 取得主要的 cookie key 和 value
        let [cookieKey, ...cookieValue] = segments[0].split('=');
        cookieValue = cookieValue.join('=');

        parsedCookies[cookieKey] = {
            value: cookieValue
        };

        // 處理其他的屬性
        for (let i = 1; i < segments.length; i++)
        {
            let [key, value] = segments[i].split('=').map(s => s.trim());
            
            // 有些屬性可能沒有值，例如 "HttpOnly"
            if (value === undefined)
            {
                parsedCookies[cookieKey][key] = true;
            }
            else
            {
                parsedCookies[cookieKey][key] = value;
            }
        }
    }

    return parsedCookies;
}