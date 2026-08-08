/*
 * CloudFront Function (viewer-request) that maps clean URLs to the prerendered
 * files Angular emits.
 *
 * S3's REST endpoint — which OAC requires — has no concept of a directory
 * index, so a request for /about returns 403, not /about/index.html. The
 * website endpoint would do this for us, but it cannot be private.
 *
 *   /about       -> /about/index.html
 *   /projects/   -> /projects/index.html
 *   /main-ABC.js -> unchanged (has a file extension)
 */
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  if (uri.endsWith('/')) {
    request.uri = uri + 'index.html';
  } else if (!uri.includes('.')) {
    request.uri = uri + '/index.html';
  }

  return request;
}
