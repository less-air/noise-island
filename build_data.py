import json
from pathlib import Path
import pandas as pd
ROOT=Path(__file__).resolve().parent
df=pd.read_excel(ROOT/'Database.xlsx'); df.columns=[str(c).strip() for c in df.columns]
CITY_COORDS={'Dublin':[53.3498,-6.2603],'Cork':[51.8985,-8.4756],'Limerick':[52.6638,-8.6267],'Galway':[53.2707,-9.0568],'Sligo':[54.2766,-8.4761],'Kilkenny':[52.6541,-7.2448],'Dundalk':[54.0027,-6.4059],'Belfast':[54.5973,-5.9301],'Leitrim':[54.049,-8.0]}
def clean(v): return '' if pd.isna(v) else str(v).strip()
def parts(v): return [x.strip() for x in clean(v).split('/') if x.strip()]
artists=[]
for _,r in df.iterrows():
    loc=clean(r.get('Location')); p=parts(loc)
    artists.append({'artist':clean(r.get('Artist')),'locationRaw':loc,'locations':[x for x in p if x in CITY_COORDS],'locationTags':p,'genre':clean(r.get('Genre')),'link':clean(r.get('Links')) or clean(r.get('Website')),'notes':clean(r.get('Notes'))})
(ROOT/'data.json').write_text(json.dumps({'cities':[{'name':n,'lat':v[0],'lng':v[1]} for n,v in CITY_COORDS.items()],'artists':artists},ensure_ascii=False,indent=2),encoding='utf-8')
print(f'Generated data.json for {len(artists)} artists')
