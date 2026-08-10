/*
 * Tests for rewrite-index.js, the CloudFront Function on viewer-request.
 *
 *   node --test infra/functions/
 *
 * Node's built-in runner, deliberately: this is the only JavaScript outside
 * web/, and giving infra/ its own package.json and dependency tree to test one
 * 80-line file is not a trade worth making.
 *
 * The source is evaluated in a vm rather than imported, because a CloudFront
 * Function is neither a CommonJS nor an ES module — the runtime simply calls a
 * global `handler`. Adding `module.exports` to make it importable would be
 * rejected at publish time. The empty vm context is a check in its own right:
 * the script sees no `require`, no `process`, no `Buffer`, so anything Node
 * would have supplied and CloudFront would not fails here rather than at the
 * edge, where the only symptom is a 503 on every request.
 *
 * This function sits in front of every request to the site, and the two failure
 * modes it guards against are both silent: a redirect that quietly drops the
 * query string, and an index rewrite applied to a path that must reach its
 * origin untouched.
 */

import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('./rewrite-index.js', import.meta.url), 'utf8');
const sandbox = vm.createContext({});
vm.runInContext(source, sandbox, { filename: 'rewrite-index.js' });

const handler = sandbox.handler;

/*
 * Minimal stand-in for the event CloudFront passes in. Only the fields the
 * function reads are populated; `querystring` is the parsed object form, which
 * is what makes rebuilding the string on redirect necessary in the first place.
 */
function request(host, uri, querystring = {}) {
  return {
    request: {
      method: 'GET',
      uri,
      querystring,
      headers: host === null ? {} : { host: { value: host } },
    },
  };
}

const APEX = 'example.com';
const WWW = 'www.example.com';

test('handler is defined without any Node globals in scope', () => {
  assert.equal(typeof handler, 'function');
  assert.equal(sandbox.require, undefined);
  assert.equal(sandbox.process, undefined);
});

test('www redirects', async (t) => {
  await t.test('301s the root to the apex', () => {
    const response = handler(request(WWW, '/'));

    assert.equal(response.statusCode, 301);
    assert.equal(response.statusDescription, 'Moved Permanently');
    assert.equal(response.headers.location.value, 'https://example.com/');
  });

  await t.test('preserves the path', () => {
    const response = handler(request(WWW, '/projects/guitar-store-rebuild'));

    assert.equal(
      response.headers.location.value,
      'https://example.com/projects/guitar-store-rebuild',
    );
  });

  /*
   * The redirect runs before the index rewrite for this reason: sending the
   * browser to /about/index.html would work, but it would put the internal
   * form in the address bar and in every link anyone copies from it.
   */
  await t.test('redirects to the clean URL, not the rewritten one', () => {
    const response = handler(request(WWW, '/about'));

    assert.equal(response.headers.location.value, 'https://example.com/about');
  });

  await t.test('strips only the leading www', () => {
    const response = handler(request('www.deep.example.com', '/'));

    assert.equal(response.headers.location.value, 'https://deep.example.com/');
  });

  /*
   * A viewer-request response is never cached by CloudFront — the function runs
   * ahead of the cache — so without this header the browser re-asks on every
   * single navigation.
   */
  await t.test('tells the browser to cache the redirect', () => {
    const response = handler(request(WWW, '/'));

    assert.equal(response.headers['cache-control'].value, 'max-age=3600');
  });
});

test('query strings survive the redirect', async (t) => {
  await t.test('keeps a single parameter', () => {
    const response = handler(request(WWW, '/', { utm_source: { value: 'linkedin' } }));

    assert.equal(response.headers.location.value, 'https://example.com/?utm_source=linkedin');
  });

  await t.test('keeps every value of a repeated parameter', () => {
    const response = handler(
      request(WWW, '/projects', {
        tag: {
          value: 'aws',
          multiValue: [{ value: 'aws' }, { value: 'angular' }],
        },
      }),
    );

    assert.equal(
      response.headers.location.value,
      'https://example.com/projects?tag=aws&tag=angular',
    );
  });

  /*
   * ?debug and ?debug= are different requests. Emitting the second for the
   * first is the kind of thing that only surfaces when a flag stops working.
   */
  await t.test('leaves a valueless flag bare', () => {
    const response = handler(request(WWW, '/', { debug: { value: '' } }));

    assert.equal(response.headers.location.value, 'https://example.com/?debug');
  });

  await t.test('appends no ? when there is no query string', () => {
    const response = handler(request(WWW, '/about'));

    assert.equal(response.headers.location.value, 'https://example.com/about');
  });
});

test('index rewriting', async (t) => {
  await t.test('appends index.html to a clean path', () => {
    assert.equal(handler(request(APEX, '/about')).uri, '/about/index.html');
  });

  await t.test('appends index.html after a trailing slash', () => {
    assert.equal(handler(request(APEX, '/projects/')).uri, '/projects/index.html');
  });

  await t.test('turns the root into index.html', () => {
    assert.equal(handler(request(APEX, '/')).uri, '/index.html');
  });

  await t.test('leaves a fingerprinted asset alone', () => {
    assert.equal(handler(request(APEX, '/main-ABC123.js')).uri, '/main-ABC123.js');
  });

  await t.test('leaves a dotted path alone', () => {
    assert.equal(
      handler(request(APEX, '/.well-known/acme-challenge/token')).uri,
      '/.well-known/acme-challenge/token',
    );
  });

  await t.test('returns the request, not a response', () => {
    const result = handler(request(APEX, '/about'));

    assert.equal(result.statusCode, undefined);
    assert.equal(typeof result.uri, 'string');
  });
});

test('hosts that must not be touched', async (t) => {
  /*
   * The function is attached whether or not a custom domain is configured, so
   * it has to be harmless on the distribution's own hostname.
   */
  await t.test('serves the bare cloudfront.net name normally', () => {
    const result = handler(request('d12uot6ivwmo30.cloudfront.net', '/about'));

    assert.equal(result.statusCode, undefined);
    assert.equal(result.uri, '/about/index.html');
  });

  await t.test('does not redirect a host that merely contains www', () => {
    const result = handler(request('nowww.example.com', '/'));

    assert.equal(result.statusCode, undefined);
  });

  await t.test('survives a missing Host header', () => {
    const result = handler(request(null, '/about'));

    assert.equal(result.statusCode, undefined);
    assert.equal(result.uri, '/about/index.html');
  });
});

/*
 * Not a test of this function so much as a guard on cloudfront.tf. /api/contact
 * has no file extension, so if the function were ever associated with the
 * /api/* behavior it would rewrite the path to /api/contact/index.html and the
 * contact form would 404. Worse, on the www hostname it would 301 the POST —
 * and a browser following a 301 reissues it as a GET with the body dropped, so
 * the API would see a valid-looking request with nothing in it.
 *
 * The assertion below documents that behavior. The protection itself is the
 * absence of a function_association on the /api/* ordered_cache_behavior.
 */
test('would corrupt API paths if it were ever attached to /api/*', () => {
  assert.equal(handler(request(APEX, '/api/contact')).uri, '/api/contact/index.html');
  assert.equal(handler(request(WWW, '/api/contact')).statusCode, 301);
});
