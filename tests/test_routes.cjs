const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const script = fs.readFileSync('site/theme-init.js', 'utf8');
const date = '2026-07-31T08:13:10Z';
const cursor = Buffer.from(Buffer.from('cursor:v2:' + date + ':id').toString('base64')).toString('base64');
async function route(hash) {
  const redirected = [];
  vm.runInNewContext(script, {
    document: {documentElement: {setAttribute() {}}},
    localStorage: {getItem() {return null}},
    matchMedia() {return {matches: false}},
    location: {hash, search: '', replace(value) {redirected.push(value)}},
    addEventListener() {},
    atob: value => Buffer.from(value, 'base64').toString(),
    fetch: async () => ({json: async () => ({[date]: 1, __count: 9})}),
  });
  await new Promise(resolve => setImmediate(resolve));
  return redirected;
}
(async () => {
  assert.deepEqual(await route('#/posts/53'), ['/posts/53/']);
  assert.deepEqual(await route('#/'), ['/']);
  assert.deepEqual(await route('#/after/' + cursor), ['/page/2/']);
  assert.deepEqual(await route('#/before/' + cursor), ['/']);
  assert.deepEqual(await route('#section-heading'), []);
  console.log('PASS: old post/home/cursor links and ordinary heading anchors');
})();
