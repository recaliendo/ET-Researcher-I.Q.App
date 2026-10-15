"""Read-only byte, workbook and CSV audit. Writes only private derived diagnostics."""
import csv, hashlib, json, zipfile
from pathlib import Path
import openpyxl

root = Path(__file__).resolve().parents[1]
package = root / 'UAP_Research_Consolidated_v08'
out = root / 'private'
out.mkdir(exist_ok=True)
manifest = json.loads((package / 'MANIFEST_v08.json').read_text(encoding='utf-8'))
checks = []
for member in manifest['members']:
    p = package / member['path']
    actual = hashlib.sha256(p.read_bytes()).hexdigest()
    checks.append({'path':member['path'],'sha256':actual,'matches':actual == member['sha256']})
assert all(c['matches'] for c in checks), 'Package checksum mismatch'
with zipfile.ZipFile(root / 'UAP_Research_Consolidated_v08.zip') as archive:
    mismatches = []
    for name in archive.namelist():
        if name.endswith('/'): continue
        parts = Path(name).parts
        relative = Path(*parts[1:]) if parts[0] == package.name else Path(name)
        p = package / relative
        if not p.exists() or archive.read(name) != p.read_bytes(): mismatches.append(name)
    assert not mismatches, mismatches
books=[]
for path in package.rglob('*.xlsx'):
    book = openpyxl.load_workbook(path, data_only=True, read_only=True)
    sheets=[]
    for sheet in book:
        rows=list(sheet.values)
        sheets.append({'name':sheet.title,'rows':len(rows)-1,'columns':sheet.max_column,'values':rows})
    books.append({'path':str(path.relative_to(package)),'sheets':sheets})
    book.close()
master=next(b for b in books if b['path']=='UAP_Evidence_Research_Database_v08.xlsx')
dictionary=list(csv.DictReader((package/'Data_Dictionary_v08.csv').open(encoding='utf-8-sig')))
reconciled=[]
for row in dictionary:
    vals=list(row.values()); sheet_name, csv_name=vals[0],vals[1]
    sheet=next(s for s in master['sheets'] if s['name']==sheet_name)
    csvrows=list(csv.reader((package/'Workbook_CSV_Exports'/csv_name).open(encoding='utf-8-sig')))
    differences=[]
    for i,(a,b) in enumerate(zip(sheet['values'],csvrows)):
        for j,(x,y) in enumerate(zip(a,b)):
            if str(x if x is not None else '')!=y:
                try:
                    assert abs(float(x)-float(y)) < 1e-10
                except (ValueError,TypeError,AssertionError): differences.append([i+1,j+1,str(x),y])
    assert len(csvrows)==len(sheet['values']) and not differences,(sheet_name,differences)
    reconciled.append({'sheet':sheet_name,'rows':len(csvrows)-1,'status':'cell-reconciled'})
documents={str(p.relative_to(root)):p.read_text(encoding='utf-8-sig') for p in package.rglob('*') if p.suffix in ['.md','.txt','.py']}
allrows={p.stem:list(csv.DictReader(p.open(encoding='utf-8-sig'))) for p in (package/'Workbook_CSV_Exports').glob('*.csv')}
report={'checksum_files':len(checks),'zip_exact':True,'worksheets':reconciled,'history_workbooks':[{ 'path':b['path'],'sheets':len(b['sheets'])} for b in books], 'documents_read':list(documents),'checks':checks}
(out/'package-audit.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
(out/'complete-research-extraction.json').write_text(json.dumps({'documents':documents,'tables':allrows,'books':books},default=str,ensure_ascii=False),encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k!='checks'},indent=2))
