import json
from pathlib import Path

NB_PATH = Path(__file__).with_name('flood_risk_training.ipynb')
BACKUP_PATH = NB_PATH.with_suffix('.ipynb.bak')

NEW_FEATURE_COLS = [
    "shape_area",
    "shape_leng",
    "compactness",
    "elev_mean",
    "elev_min",
    "sungai_density",
    "dist_to_river",
    "pct_pemukiman",
    "pct_sawah",
]

def replace_feature_cols(cell_source_lines):
    out_lines = []
    in_block = False
    for line in cell_source_lines:
        if 'FEATURE_COLS' in line and '=' in line:
            in_block = True
            out_lines.append('FEATURE_COLS = [\n')
            for col in NEW_FEATURE_COLS:
                out_lines.append(f"    '{col}',\n")
            out_lines.append(']\n')
            continue
        if in_block:
            # end of block detection: if line contains closing bracket we skip until next
            if ']' in line:
                in_block = False
            continue
        out_lines.append(line)
    return out_lines

def ensure_groupby_severity(cell_source_lines):
    """Ensure df_banjir_grouped = df_banjir.groupby('kecamatan_upper')['severity_score'].max().reset_index() exists."""
    joined = ''.join(cell_source_lines)
    if "df_banjir_grouped = df_banjir.groupby('kecamatan_upper')['severity_score'].max().reset_index()" in joined:
        return cell_source_lines

    out = []
    inserted = False
    for i, line in enumerate(cell_source_lines):
        out.append(line)
        # after df_banjir is created, insert grouping
        if not inserted and 'df_banjir = pd.DataFrame' in line:
            # find end of that logical block by looking a few lines ahead
            out.append("\n# Aggregate historical severity by kecamatan (max severity)\n")
            out.append("df_banjir['severity_score'] = df_banjir['severity_historis'].map(severity_map).fillna(1)\n")
            out.append("df_banjir['kecamatan_upper'] = df_banjir['kecamatan'].str.upper().str.strip()\n")
            out.append("df_banjir_grouped = df_banjir.groupby('kecamatan_upper')['severity_score'].max().reset_index()\n")
            inserted = True
    return out

def main():
    if not NB_PATH.exists():
        print(f'Notebook not found: {NB_PATH}')
        return

    data = json.loads(NB_PATH.read_text(encoding='utf-8'))
    # backup
    BACKUP_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'Backup created: {BACKUP_PATH}')

    changed = False
    for cell in data.get('cells', []):
        if cell.get('cell_type') != 'code':
            continue
        src = cell.get('source', [])
        # normalize to list of lines
        lines = src if isinstance(src, list) else src.splitlines(True)

        if any('FEATURE_COLS' in l for l in lines):
            new_lines = replace_feature_cols(lines)
            if new_lines != lines:
                cell['source'] = new_lines
                changed = True
                print('Replaced FEATURE_COLS in a cell')

        if any('df_banjir = pd.DataFrame' in l for l in lines):
            new_lines = ensure_groupby_severity(lines)
            if new_lines != lines:
                cell['source'] = new_lines
                changed = True
                print('Inserted df_banjir grouping in a cell')

    if changed:
        NB_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
        print(f'Notebook updated: {NB_PATH}')
    else:
        print('No changes made (FEATURE_COLS/groupby not found or already present).')

if __name__ == '__main__':
    main()
