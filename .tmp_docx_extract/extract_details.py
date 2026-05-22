import zipfile, xml.etree.ElementTree as ET
p = r"c:\Users\Asus\OneDrive - Bina Nusantara\Documents\Semester6\Pre-Thesis Skripsi\Project\.tmp_docx_extract\PaperSkripsi.zip"
ns = {'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main','m':'http://schemas.openxmlformats.org/officeDocument/2006/math'}
with zipfile.ZipFile(p) as z:
    doc = ET.fromstring(z.read('word/document.xml'))

paras=[]
for pp in doc.findall('.//w:p', ns):
    txt=''.join(t.text or '' for t in pp.findall('.//w:t', ns)).strip()
    paras.append(txt)

print('--- PARAGRAPHS 90-130 ---')
for i in range(90,131):
    if i < len(paras):
        print(f'[{i}] {paras[i]}')

print('\n--- TABLE 0 FULL ---')
tables = doc.findall('.//w:tbl', ns)
tbl=tables[0]
for ridx,tr in enumerate(tbl.findall('.//w:tr', ns)):
    row=[]
    for tc in tr.findall('./w:tc', ns):
        c=''.join(x.text or '' for x in tc.findall('.//w:t', ns)).strip()
        row.append(c)
    if any(row):
        print(ridx, ' || '.join(row))

print('\n--- TABLE 3 FULL ---')
tbl=tables[3]
for ridx,tr in enumerate(tbl.findall('.//w:tr', ns)):
    row=[]
    for tc in tr.findall('./w:tc', ns):
        c=''.join(x.text or '' for x in tc.findall('.//w:t', ns)).strip()
        row.append(c)
    if any(row):
        print(ridx, ' || '.join(row))

print('\n--- TABLE 4 FULL ---')
tbl=tables[4]
for ridx,tr in enumerate(tbl.findall('.//w:tr', ns)):
    row=[]
    for tc in tr.findall('./w:tc', ns):
        c=''.join(x.text or '' for x in tc.findall('.//w:t', ns)).strip()
        row.append(c)
    if any(row):
        print(ridx, ' || '.join(row))
