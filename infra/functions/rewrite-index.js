/*
 * CloudFront Function (viewer-request) that does two things, in order:
 *
 *   1. 301s www.<domain> to the apex, so the site has one address.
 *   2. Maps clean URLs to the prerendered files Angular emits.
 *
 * S3's REST endpoint — which OAC requires — has no concept of a directory
 * index, so a request for /about returns 403, not /about/index.html. The
 * website endpoint would do this for us, but it cannot be private.
 *
 *   www.example.com/about -> 301 https://example.com/about
 *   /about                -> /about/index.html
 *   /projects/            -> /projects/index.html
 *   /main-ABC.js          -> unchanged (has a file extension)
 *
 * Only the apex is stripped from www; no other host is touched. The function
 * is deployed whether or not a custom domain is configured, and rewriting an
 * unrecognised host would break the site on the bare *.cloudfront.net name.
 */
function handler(event) {
  var request = event.request;
  var host = request.headers.host ? request.headers.host.value : '';

  /*
   * Redirect before the index rewrite, so the browser is sent to the clean URL
   * it asked for rather than the internal /index.html form.
   */
  if (host.startsWith('www.')) {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: {
        location: {
          value: 'https://' + host.slice(4) + request.uri + queryString(request.querystring),
        },
        /*
         * Viewer-request functions run ahead of the cache, so this response is
         * never stored by CloudFront. The max-age is what keeps browsers from
         * asking again on every navigation.
         */
        'cache-control': { value: 'max-age=3600' },
      },
    };
  }

  var uri = request.uri;

  if (uri.endsWith('/')) {
    request.uri = uri + 'index.html';
  } else if (!uri.includes('.')) {
    request.uri = uri + '/index.html';
  }

  return request;
}

/*
 * Rebuilds the query string from the parsed object CloudFront hands us, so a
 * redirect does not silently drop it. Repeated keys arrive under multiValue,
 * and a bare flag (?debug) arrives with an empty value and must stay bare.
 */
function queryString(querystring) {
  var parts = [];

  for (var key in querystring) {
    var param = querystring[key];

    if (param.multiValue) {
      for (var i = 0; i < param.multiValue.length; i++) {
        parts.push(pair(key, param.multiValue[i].value));
      }
    } else {
      parts.push(pair(key, param.value));
    }
  }

  return parts.length ? '?' + parts.join('&') : '';
}

function pair(key, value) {
  return value === '' ? key : key + '=' + value;
}
