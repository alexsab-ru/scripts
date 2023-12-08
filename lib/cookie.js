export function getCookie(name)
{
    let matches = document.cookie.match(new RegExp(
        "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
        ));
    return matches ? decodeURIComponent(matches[1]) : undefined;
}

export function setCookie(name, value, props)
{
    props = props || {}
    var exp = props.expires
    if (typeof exp == "number" && exp) {
        var d = new Date()
        d.setTime(d.getTime() + exp*1000)
        exp = props.expires = d
    }
    if(exp && exp.toUTCString) { props.expires = exp.toUTCString() }
    value = encodeURIComponent(value)
    var updatedCookie = name + "=" + value
    for(var propName in props){
        updatedCookie += "; " + propName
        var propValue = props[propName]
        if(propValue !== true){ updatedCookie += "=" + propValue }
    }
    document.cookie = updatedCookie
}

export function deleteCookie(name)
{
    setCookie(name, null, { 'domain':settings.domain,'path':'/','expires': -1 })
}

export function cookiecook(days = 90)
{
    let cookiecook = getCookie("cookiecook"),
        cookiewin = document.querySelector('.cookie_notice');

    if (cookiecook != "no") {

        cookiewin.classList.remove("hidden");

        document.getElementById("cookie_close").addEventListener("click", function(e){
            e.preventDefault();
            cookiewin.classList.add("hidden");

            let date = new Date;
            date.setDate(date.getDate() + days);
            document.cookie = "cookiecook=no; path=/; expires=" + date.toUTCString();
        });
    }
}