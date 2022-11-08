interface _sendResponse {
  sent: boolean;
  response?: string;
  error?: string;
}

export function send(data: Document | XMLHttpRequestBodyInit, url: string, callback: (sr: _sendResponse) => void){
  let xmlhttp: XMLHttpRequest;
  if (window.XMLHttpRequest)
  {// code for IE7+, Firefox, Chrome, Opera, Safari
    xmlhttp = new XMLHttpRequest();
  }
  else
  {// code for IE6, IE5
    xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
  }

  xmlhttp.onreadystatechange = function()
  {
    if (xmlhttp.readyState === 4)
    {

      if (xmlhttp.status === 200)
      {
        let response = xmlhttp.responseText;
        callback({sent:true, response: response});
      }
      else if (xmlhttp.status >= 300)
      {
        // HTTP error
        callback({sent:false, error: 'HTTP error ' + xmlhttp.status});
      }
    }
  }

  xmlhttp.open("POST",url,true);
  xmlhttp.setRequestHeader("Content-type","application/text-plain");
  xmlhttp.send(data);
}
