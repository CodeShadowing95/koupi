import { describe, expect, it } from 'vitest';
import { columnName, crc32, sheetName, toXlsx, xmlEscape, zipStored } from './xlsx';

const decoder = new TextDecoder();

/** Lit une archive ZIP « stored » à partir du répertoire central. */
function unzip(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = bytes.length - 22;
  expect(view.getUint32(end, true)).toBe(0x06054B50);
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const files: Record<string, string> = {};
  for (let i = 0; i < count; i++) {
    expect(view.getUint32(at, true)).toBe(0x02014B50);
    const crc = view.getUint32(at + 16, true), size = view.getUint32(at + 24, true), nameLength = view.getUint16(at + 28, true);
    const local = view.getUint32(at + 42, true);
    const name = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength));
    const start = local + 30 + view.getUint16(local + 26, true);
    const data = bytes.subarray(start, start + size);
    expect(crc32(data)).toBe(crc);
    files[name] = decoder.decode(data);
    at += 46 + nameLength;
  }
  return files;
}

describe('xlsx helpers', () => {
  it('names columns like Excel', () => {
    expect([0, 25, 26, 27, 51, 52, 701, 702].map(columnName)).toEqual(['A', 'Z', 'AA', 'AB', 'AZ', 'BA', 'ZZ', 'AAA']);
  });
  it('computes the standard CRC-32', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xCBF43926);
  });
  it('escapes XML and drops control characters', () => {
    expect(xmlEscape('a<b>&"c"\u0001')).toBe('a&lt;b&gt;&amp;&quot;c&quot;');
  });
  it('makes sheet names Excel accepts', () => {
    expect(sheetName('Codes [archives]: 2026/11')).toBe('Codes  archives   2026 11');
    expect(sheetName('x'.repeat(40))).toHaveLength(31);
    expect(sheetName('   ')).toBe('Feuille1');
  });
  it('writes a readable zip', () => {
    const files = unzip(zipStored([['a.txt', new TextEncoder().encode('héllo')], ['b/c.txt', new Uint8Array()]]));
    expect(files).toEqual({ 'a.txt': 'héllo', 'b/c.txt': '' });
  });
});

describe('toXlsx', () => {
  const files = unzip(toXlsx({ name: 'Codes', headers: ['Outil', 'Votes', 'Note'], rows: [['Notion', 4, '=HYPERLINK("x")'], ['A & B', null, true]] }));

  it('contains the parts of a workbook', () => {
    expect(Object.keys(files).sort()).toEqual(['[Content_Types].xml', '_rels/.rels', 'xl/_rels/workbook.xml.rels', 'xl/styles.xml', 'xl/workbook.xml', 'xl/worksheets/sheet1.xml']);
    expect(files['xl/workbook.xml']).toContain('<sheet name="Codes"');
  });

  it('writes a bold frozen header, numbers as numbers and text as inline strings', () => {
    const sheet = files['xl/worksheets/sheet1.xml'];
    expect(sheet).toContain('<c r="A1" s="1" t="inlineStr"><is><t xml:space="preserve">Outil</t></is></c>');
    expect(sheet).toContain('<c r="B2"><v>4</v></c>');
    expect(sheet).toContain('state="frozen"');
    expect(sheet).toContain('<autoFilter ref="A1:C3"/>');
    expect(sheet).toContain('A &amp; B');
    expect(sheet).toContain('<t xml:space="preserve">oui</t>');
    expect(sheet).not.toContain('<c r="B3"');
  });

  it('never writes formulas, even for text that looks like one', () => {
    const sheet = files['xl/worksheets/sheet1.xml'];
    expect(sheet).not.toContain('<f>');
    expect(sheet).toContain('=HYPERLINK(&quot;x&quot;)');
  });
});
