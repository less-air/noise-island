import json
from pathlib import Path
import pandas as pd
ROOT=Path(__file__).resolve().parent
df=pd.read_excel(ROOT/'Database.xlsx');df.columns=[str(c).strip() for c in df.columns]
city_names=['Dublin','Cork','Limerick','Galway','Sligo','Kilkenny','Dundalk','Belfast','Leitrim']
def clean(v): return '' if pd.isna(v) else str(v).strip()
def parts(v): return [x.strip() for x in clean(v).split('/') if x.strip()]
artists=[]
for _,r in df.iterrows():
 loc=clean(r.get('Location'));p=parts(loc)
 artists.append({'artist':clean(r.get('Artist')),'locationRaw':loc,'locations':[x for x in p if x in city_names],'locationTags':p,'genre':clean(r.get('Genre')),'link':clean(r.get('Links')) or clean(r.get('Website')),'notes':clean(r.get('Notes'))})
(ROOT/'data.json').write_text(json.dumps({'artists':artists},ensure_ascii=False,indent=2),encoding='utf-8')
