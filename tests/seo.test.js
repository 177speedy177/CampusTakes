const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname,'..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const pages = ['index','research','students','panel-report','privacy','terms'];
const host = 'https://www.campustakes.com';

test('indexable pages and sitemap agree on one canonical URL per page', () => {
  const sitemap = read('sitemap.xml');
  const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
  assert.equal(urls.length,pages.length);
  const titles = new Set();
  for(const page of pages) {
    const html = read(page+'.html');
    const expected = host+(page==='index'?'/':'/'+page);
    const canonicals = [...html.matchAll(/<link rel="canonical" href="([^"]+)"/g)];
    assert.equal(canonicals.length,1,page);
    assert.equal(canonicals[0][1],expected,page);
    assert.ok(urls.includes(expected),page);
    assert.equal([...html.matchAll(/<h1\b/g)].length,1,page);
    assert.doesNotMatch(html,/<meta name="robots" content="[^"]*noindex/);
    assert.doesNotMatch(html,/https:\/\/campustakes\.com/);
    titles.add(html.match(/<title>(.*?)<\/title>/)[1]);
    for(const m of html.matchAll(/href="([^"#]+)(?:#[^"]*)?"/g)) {
      const url = new URL(m[1],expected);
      if(url.origin!==host) continue;
      assert.ok(!url.pathname.endsWith('.html'),m[1]);
      const file = url.pathname==='/'?'index.html':path.extname(url.pathname)?url.pathname.slice(1):url.pathname.slice(1)+'.html';
      assert.ok(fs.existsSync(path.join(root,file)),`${page}: ${m[1]}`);
    }
  }
  assert.equal(titles.size,pages.length);
  assert.ok(read('robots.txt').includes(host+'/sitemap.xml'));
  assert.match(read('404.html'),/name="robots" content="noindex"/);
});

test('structured data is parseable and inline scripts remain allowed by the restrictive CSP', () => {
  const config = JSON.parse(read('vercel.json'));
  const csp = config.headers[0].headers.find(h=>h.key==='Content-Security-Policy').value;
  assert.ok(!csp.split('style-src')[0].includes("'unsafe-inline'"));
  for(const page of pages) {
    const html = read(page+'.html');
    for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
      if(/\bsrc=/.test(match[1])) continue;
      if(match[1].includes('application/ld+json')) {
        const data = JSON.parse(match[2]);
        assert.equal(data['@context'],'https://schema.org');
        assert.ok(data['@graph'].some(n=>n['@type']==='WebPage'));
      }
      const hash = crypto.createHash('sha256').update(match[2].replace(/\r\n/g,'\n')).digest('base64');
      assert.ok(csp.includes("'sha256-"+hash+"'"),`${page}: inline script blocked`);
    }
  }
});
