import pandas as pd
import json

df = pd.read_excel('../Kiểm kê 2024.xlsx', sheet_name='CL', header=0)
# Forward fill the "Đơn vị" column because of merged cells
df['Đơn vị'] = df['Đơn vị'].ffill()

# Drop rows where "Bộ Phận" is empty
df = df.dropna(subset=['Bộ Phận'])

unique_pairs = df[['Đơn vị', 'Bộ Phận']].drop_duplicates()

departments_map = {}
for index, row in unique_pairs.iterrows():
    unit = str(row['Đơn vị']).strip()
    dept = str(row['Bộ Phận']).strip()
    
    # Exclude headers themselves if they got caught
    if unit == 'Đơn vị' or dept == 'Bộ Phận':
        continue
        
    if pd.isna(row['Đơn vị']) or pd.isna(row['Bộ Phận']):
        continue
    
    if unit not in departments_map:
        departments_map[unit] = set()
    departments_map[unit].add(dept)

result = []
for unit, depts in departments_map.items():
    result.append({
        'group': unit,
        'items': sorted(list(depts))
    })

result = sorted(result, key=lambda x: x['group'])
print(json.dumps(result, ensure_ascii=False, indent=2))
