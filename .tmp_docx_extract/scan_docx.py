import zipfile, xml.etree.ElementTree as ET
p = r"c:\Users\Asus\OneDrive - Bina Nusantara\Documents\Semester6\Pre-Thesis Skripsi\Project\.tmp_docx_extract\PaperSkripsi.zip"
ns = {
 'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
 'm':'http://schemas.openxmlformats.org/officeDocument/2006/math'
}
with zipfile.ZipFile(p) as z:
    doc = ET.fromstring(z.read('word/document.xml'))

paras=[]
for p in doc.findall('.//w:p', ns):
    txt=''.join(t.text or '' for t in p.findall('.//w:t', ns)).strip()
    if txt:
        paras.append(txt)

keys=['used dataset','used datasets','b-drain','flow diagram','system architecture','architecture','equation','rumus','formula','gradient boosting','macro-f1']
print('PARA_COUNT', len(paras))
for i,t in enumerate(paras):
    low=t.lower()
    if any(k in low for k in keys):
        print(f'[{i}] {t}')

print('\nTABLES:')
for ti,tbl in enumerate(doc.findall('.//w:tbl', ns)):
    rows=[]
    for tr in tbl.findall('.//w:tr', ns):
        cells=[]
        for tc in tr.findall('./w:tc', ns):
            c=''.join(x.text or '' for x in tc.findall('.//w:t', ns)).strip()
            cells.append(c)
        if any(cells):
            rows.append(cells)
    if not rows:
        continue
    joined=' | '.join(rows[0]).lower()
    if any(k in joined for k in ['dataset','feature','used','accuracy','model','f1']):
        print(f'-- Table {ti} rows={len(rows)} cols~={max(len(r) for r in rows)}')
        for r in rows[:10]:
            print('   ', ' || '.join(r))

omath = doc.findall('.//m:oMath', ns) + doc.findall('.//m:oMathPara', ns)
print('\nOMATH_COUNT', len(omath))
