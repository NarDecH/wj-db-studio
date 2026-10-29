/**
 * WJ DB Studio — unit tests for pure functions (run: node tests/unit.test.js)
 * (c) 2026 Weeradech Jessadarom — MIT
 */
'use strict';
const assert = require('assert');
const { parseCsv, splitSqlStatements, DBManager } = require('../main/db.js');

let pass = 0, fail = 0;
function ok(name, cond) { if (cond) { pass++; console.log('  ✓ ' + name); } else { fail++; console.log('  ✗ ' + name); } }
function eq(name, got, want) {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + '\n     got:  ' + g.slice(0, 160) + '\n     want: ' + w.slice(0, 160)); }
}

console.log('parseCsv');
eq('basic', parseCsv('a,b\nc,d'), [['a', 'b'], ['c', 'd']]);
eq('quoted with delimiter', parseCsv('a,b\n"x,y",2'), [['a', 'b'], ['x,y', '2']]);
eq('escaped quotes', parseCsv('"he said ""hi""",3'), [['he said "hi"', '3']]);
eq('semicolon delim', parseCsv('a;b', ';'), [['a', 'b']]);
eq('crlf', parseCsv('1,2\r\n3,4\r\n'), [['1', '2'], ['3', '4']]);
eq('empty field', parseCsv('a,,c'), [['a', '', 'c']]);

console.log('splitSqlStatements');
eq('two statements', splitSqlStatements('SELECT 1; SELECT 2;'), ['SELECT 1', 'SELECT 2']);
eq('semicolon inside string', splitSqlStatements("INSERT INTO t VALUES ('a;b'); SELECT 1"), ["INSERT INTO t VALUES ('a;b')", 'SELECT 1']);
eq('with comments', splitSqlStatements('-- hi\nSELECT 1; /* block */ SELECT 2;'), ['-- hi\nSELECT 1', '/* block */ SELECT 2']);
eq('delimiter directive skipped', splitSqlStatements('DELIMITER $$\nSELECT 1$$'), ['SELECT 1$$']);
eq('backtick string', splitSqlStatements('SELECT `a;b` FROM t;'), ['SELECT `a;b` FROM t']);

console.log('DBManager.escId / escValue');
eq('escId', DBManager.escId('a`b'), '`a``b`');
eq('escId thai', DBManager.escId('ชื่อ'), '`ชื่อ`');
eq('escValue string', DBManager.escValue("O'Brien"), "'O''Brien'");
eq('escValue backslash', DBManager.escValue('a\\b'), "'a\\\\b'");
eq('escValue null', DBManager.escValue(null), 'NULL');
eq('escValue number', DBManager.escValue(42), '42');
eq('escValue bool', DBManager.escValue(true), '1');
eq('escValue newline', DBManager.escValue('a\nb'), "'a\\nb'");
eq('escValue buffer', DBManager.escValue(Buffer.from('hi')), "X'6869'");

console.log('safeIdent / _inferType');
const infer = (v) => DBManager.prototype._inferType.call(null, v);
eq('infer int', infer(['1', '2', '3']), 'INT');
eq('infer bigint', infer(['12345678901']), 'BIGINT');
eq('infer decimal', infer(['1.5', '2']), 'DECIMAL(18,4)');
eq('infer date', infer(['2026-01-01', '2026-02-03']), 'DATE');
eq('infer datetime', infer(['2026-01-01 10:00:00']), 'DATETIME');
eq('infer varchar', infer(['hello world']), 'VARCHAR(20)');
eq('infer text', infer([pick100()]), 'TEXT');
function pick100() { return 'x'.repeat(300); }
const used = new Set();
eq('safeIdent basic', DBManager.safeIdent('my col', used), 'my_col');
eq('safeIdent thai', DBManager.safeIdent('ชื่อ ลูกค้า', used), 'ชื่อ_ลูกค้า');
eq('safeIdent dup', DBManager.safeIdent('my col', used), 'my_col_2');
eq('safeIdent digit-start', DBManager.safeIdent('1abc', new Set()), 'col_1abc');

console.log('diffSchema');
const snapA = {
  t1: { columns: { id: { type: 'INT', nullable: false, def: null, extra: '' }, name: { type: 'VARCHAR(50)', nullable: true, def: null, extra: '' } }, indexes: [{ name: 'ix_a', unique: false, columns: ['name'] }] },
  t2: { columns: { id: { type: 'INT', nullable: false, def: null, extra: '' } }, indexes: [] },
};
const snapB = {
  t1: { columns: { id: { type: 'INT', nullable: false, def: null, extra: '' } }, indexes: [] },
  t3: { columns: { id: { type: 'INT', nullable: false, def: null, extra: '' } }, indexes: [] },
};
const d = DBManager.diffSchema(snapA, snapB);
eq('onlyA', d.onlyA, ['t2']);
eq('onlyB', d.onlyB, ['t3']);
eq('changed tables', d.changed.map(c => c.table), ['t1']);
eq('changed kinds', d.changed[0].details.map(x => x.kind), ['col-add', 'ix-add']);

console.log('highlightSQL');
(async () => {
  const { highlightSQL } = await import('../src/highlight.js');
  const html = highlightSQL('SELECT name FROM `t` WHERE id=1 -- c');
  ok('keyword colored', html.includes('tk-kw'));
  ok('string colored', html.includes('tk-str'));
  ok('backtick colored', html.includes('tk-bt'));
  ok('comment colored', html.includes('tk-com'));
  ok('escaped', !html.includes('<t>'));

  console.log('\nRESULT: ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
