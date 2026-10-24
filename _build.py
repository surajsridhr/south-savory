import json,re,csv,collections,os
from datetime import datetime,timedelta,date
W='/tmp/sschat/work'
OUT='/sessions/exciting-dreamy-cray/mnt/outputs'
os.makedirs(OUT,exist_ok=True)
recs=json.load(open(W+'/orders2.json'))
menus=json.load(open(W+'/menus.json'))
offers=json.load(open(W+'/offers.json'))

# ---- late fixes ----
for r in recs:
    t=r['text']
    if r['cat']=='batter_order':
        if r.get('kg') is None:
            m=re.search(r'(\d+)\s*-\s*kg',t,re.I)
            if m: r['kg']=float(m.group(1))
        if re.search(r'(without|with out|no)\s*topping',t,re.I): r['toppings']=False
        if re.search(r'change to|make this',t,re.I): r['amendment']=True
        if r.get('kg') is None: r['cat']='question'
    if r['dt']=='2026-06-18 17:34:00':
        r.update({'cat':'batter_order','kg':0.75,'batter_type':'Adai','toppings':False})
    if r['dt']=='2026-07-17 11:31:00':
        r.update({'cat':'lunch_order','items':{'DISH::Avial':1},'service_date':'2026-07-17','late':True,'manual_override':True})

def norm(h):
    h=re.sub(r'\s*\(.*?\)','',h).strip().lower().replace('&','and').replace(',',' ')
    h=re.sub(r'\s+',' ',h)
    A={'dantina soppu alasande kalu huli':'Dantina Soppu Alasande Kalu Huli','mixed soppu huli':'Mixed Soppu Huli',
     'methi soppu and alasande kalu huli':'Methi Soppu Alasande Kalu Huli','mixed sprouts huli':'Mixed Sprouts Huli',
     'carrot beans and potato huli':'Carrot Beans Potato Huli','onion potato and drumstick huli':'Onion Potato Drumstick Huli',
     'mangaloure cucumber huli':'Mangalore Cucumber Huli','palak majjige huli':'Palak Majjige Huli',
     'ash gourd majjige huli':'Ash Gourd Majjige Huli','huruli saru':'Huruli Saaru','vegetable sambar':'Vegetable Sambar',
     'bendekayi sambar':'Bendekayi (Okra) Sambar','radish sambar':'Radish Sambar','sabbakki soppu kootu':'Sabbakki Soppu Kootu',
     'mixed vegetable kootu':'Mixed Vegetable Kootu','hasi kootu':'Hasi Kootu','pepper kootu':'Pepper Kootu',
     'tomato dal rasam':'Tomato Dal Rasam','tomato rasam':'Tomato Rasam','pepper jeera rasam':'Pepper Jeera Rasam',
     'pepper rasam':'Pepper Rasam','mixed sprouts usli':'Mixed Sprouts Usli','green gram usli':'Green Gram Usli',
     'horsegram usli':'Horsegram Usli','baby potato fry':'Baby Potato Fry','beetroot palya':'Beetroot Palya',
     'beans bele palya':'Beans Bele Palya','potato and brinjal palya':'Potato Brinjal Palya',
     'balekayi palya':'Balekayi (Raw Banana) Palya','heerekayi dal':'Heerekayi (Ridge Gourd) Dal',
     'kadale gojju':'Kadale Gojju','bendekayi gojju':'Bendekayi (Okra) Gojju','onion capsicum gojju':'Onion Capsicum Gojju',
     'palak peas rice':'Palak Peas Bath','pudina rice':'Pudina Rice','vegetable bath':'Vegetable Bath',
     'tomato peas bath':'Tomato Peas Bath','capsicum peas bath':'Capsicum Peas Bath','lemon capsicum bath':'Lemon Capsicum Bath',
     'methi soppu and peas rice':'Methi Soppu Peas Bath','vangibath':'Vangibath','bisibelebath':'Bisibelebath',
     'vegetable pulav':'Vegetable Pulav','puliyogre':'Puliyogre','pongal':'Pongal','avial':'Avial'}
    return A.get(h,h.title())

def archetype(heros):
    if len(heros)==2 and any('Rasam' in h for h in heros): return 'Rasam + dry side'
    if len(heros)==1 and re.search(r'Bath$|Pulav|Puliyogre|Pongal|Rice$',heros[0]): return 'One-pot rice bath'
    if len(heros)==2: return 'Two-dish plate'
    return 'Curry + rice/ragi ball'

# ---------- menu rows ----------
menu_rows=[];mbydate={}
for m in menus:
    c1=m['combos'].get('Combo 1',{}); c2=m['combos'].get('Combo 2',{}); al=m['alacarte']
    heros=[norm(h) for h in m['hero']]
    alamain=next((v for k,v in al.items() if not re.search(r'ragi|menthya|mentya',k,re.I)),'')
    row={'service_date':m['service_date'],'dow':m['service_dow'],'posted_at':m['post_dt'][:16],
      'post_lead':m['lead'],'posted_by':m['post_by'],'menu_archetype':archetype(heros),
      'hero_dish':' + '.join(heros),'n_hero_dishes':len(heros),
      'combo1_price':c1.get('price',''),'combo1_items':'; '.join(c1.get('items',[])),
      'combo2_price':c2.get('price',''),'combo2_items':'; '.join(c2.get('items',[])),
      'alacarte_main_price':alamain,'ragi_ball_price':40,'menthya_mudde_price':60,
      'side':'papad' if any(re.search(r'papad',x,re.I) for x in c1.get('items',[])) else
             ('sandige' if any(re.search(r'sandige',x,re.I) for x in c1.get('items',[])) else
             ('raita/chutney' if any(re.search(r'raita|chutney',x,re.I) for x in c1.get('items',[])) else '')),
      'curd_rice_in_combo1':any(re.search(r'curd',x,re.I) for x in c1.get('items',[]))}
    menu_rows.append(row); mbydate[m['service_date']]=row
menu_rows.sort(key=lambda r:r['service_date'])

# ---------- daily lunch aggregation ----------
lun=[r for r in recs if r['cat']=='lunch_order' and r.get('items')]
days=collections.defaultdict(lambda:{'msgs':0,'hh':set(),'c1':0,'c2':0,'main':0,'rb':0,'mm':0,'cr':0,
    'late':0,'times':[],'unk_main':0})
for mr in menu_rows: days[mr['service_date']]
for r in lun:
    sd=r.get('service_date')
    if not sd: sd='UNATTRIBUTED'
    d=days[sd]; d['msgs']+=1; d['hh'].add(r['sender'])
    if r.get('late'): d['late']+=1
    d['times'].append(r['time'])
    for k,v in r['items'].items():
        if k=='combo1': d['c1']+=v
        elif k=='combo2': d['c2']+=v
        elif k=='ragi_ball': d['rb']+=v
        elif k=='menthya_mudde': d['mm']+=v
        elif k=='curd_rice': d['cr']+=v
        elif k=='mudde_unspecified': d['unk_main']+=v
        elif k.startswith('DISH::'): d['main']+=v
daily=[]
for sd in sorted(days):
    d=days[sd]; mr=mbydate.get(sd,{})
    c1p=mr.get('combo1_price') or 0; c2p=mr.get('combo2_price') or 0
    amp=mr.get('alacarte_main_price') or ''
    meal=d['c1']+d['c2']+d['main']
    rev_known=d['c1']*(c1p or 0)+d['c2']*(c2p or 0)+d['rb']*40+d['mm']*60
    rev_lo=rev_known+d['main']*(amp if isinstance(amp,int) else 70)
    rev_hi=rev_known+d['main']*(amp if isinstance(amp,int) else (c2p or 110))
    tt=sorted(d['times'])
    daily.append({'service_date':sd,'dow':mr.get('dow',''),'menu_posted':bool(mr),
      'menu_archetype':mr.get('menu_archetype',''),'hero_dish':mr.get('hero_dish',''),
      'post_lead':mr.get('post_lead',''),'posted_at':mr.get('posted_at',''),
      'order_messages':d['msgs'],'ordering_households':len(d['hh']),
      'combo1_units':d['c1'],'combo2_units':d['c2'],'alacarte_main_portions':d['main'],
      'ragi_ball_units':d['rb'],'menthya_mudde_units':d['mm'],'curd_rice_units':d['cr'],
      'unspecified_mudde_units':d['unk_main'],
      'est_meal_units':meal,'late_order_msgs':d['late'],
      'first_order_time':tt[0] if tt else '','last_order_time':tt[-1] if tt else '',
      'est_revenue_low_inr':int(rev_lo),'est_revenue_high_inr':int(rev_hi)})

# ---------- dish performance ----------
dish=collections.defaultdict(lambda:{'apps':[],'meal':0,'hh':0,'msgs':0})
for row in daily:
    if not row['menu_posted'] or not row['hero_dish']: continue
    for h in row['hero_dish'].split(' + '):
        dd=dish[h]; dd['apps'].append(row['service_date'])
        dd['meal']+=row['est_meal_units']; dd['hh']+=row['ordering_households']; dd['msgs']+=row['order_messages']
# menus with zero orders still count as appearance
for mr in menu_rows:
    if mr['service_date'] not in {r['service_date'] for r in daily}:
        for h in mr['hero_dish'].split(' + '):
            dish[h]['apps'].append(mr['service_date'])
dishrows=[]
for h,dd in dish.items():
    apps=sorted(set(dd['apps'])); n=len(apps)
    gaps=[(datetime.strptime(apps[i],'%Y-%m-%d')-datetime.strptime(apps[i-1],'%Y-%m-%d')).days for i in range(1,n)]
    dishrows.append({'dish':h,'appearances':n,'dates':';'.join(apps),
      'total_meal_units':dd['meal'],'avg_meal_units_per_appearance':round(dd['meal']/n,1),
      'total_ordering_households':dd['hh'],'avg_households_per_appearance':round(dd['hh']/n,1),
      'repeat_gaps_days':';'.join(map(str,gaps))})
dishrows.sort(key=lambda r:(-r['avg_meal_units_per_appearance'],-r['appearances']))

# ---------- batter ----------
bat=[r for r in recs if r['cat']=='batter_order']
PRICE={'Idly':{0.5:60,1:120},'Idli':{0.5:60,1:120},'Dosa':{0.5:75,1:150},'Set Dosa':{0.5:75,1:150},
       'Paddu':{0.5:60,1:120},'Adai':{0.5:80,1:160}}
batch=collections.defaultdict(lambda:{'kg':0.0,'msgs':0,'hh':set(),'top':0,'rev':0.0,'dates':set()})
for r in bat:
    bt=r.get('batter_type') or 'Unknown'
    key=(r['date'][:10] if False else None)
for o in offers:
    pass
# group batter orders by nearest preceding batter post
bposts=[o for o in offers if o['kind']=='batter']
def bkey(r):
    ts=datetime.strptime(r['dt'],'%Y-%m-%d %H:%M:%S')
    cand=[o for o in bposts if datetime.strptime(o['dt'],'%Y-%m-%d %H:%M:%S')<=ts]
    return cand[-1]['dt'][:10] if cand else None
for r in bat:
    k=bkey(r)
    if not k: continue
    b=batch[(k,r.get('batter_type') or 'Unknown')]
    b['kg']+=r['kg'] or 0; b['msgs']+=1; b['hh'].add(r['sender'])
    if r.get('toppings'): b['top']+=1
    pr=PRICE.get(r.get('batter_type') or '',{1:0,0.5:0})
    b['rev']+= (r['kg'] or 0)*pr.get(1,0) + (15 if r.get('toppings') else 0)
    b['dates'].add(r['date'])
batrows=[{'batch_post_date':k[0],'batter_type':k[1],'order_messages':v['msgs'],
  'ordering_households':len(v['hh']),'total_kg':round(v['kg'],2),'orders_with_toppings':v['top'],
  'est_revenue_inr':int(v['rev']),'order_dates':';'.join(sorted(v['dates']))}
  for k,v in sorted(batch.items())]

# ---------- specials ----------
SN=[
 ('Onion Masala Vade','2026-06-08','Mon','2026-06-08 10:48','piece','Rs.20 / 2 pcs',150,'15:00',
  [10,10,14,6,4,4,10,4,10,10,6,4,6,10,6,6,6,4,6],19,1,'Order window 10:48-13:05; closed early at cap'),
 ('Wheat Aloo Paratha','2026-07-07','Tue','2026-07-07 15:44','paratha','Rs.65 each',25,'17:30',
  [4,10,2,2,4,2],6,0,'24 of 25 cap sold; 1 order amended 2->4'),
 ('Wheat Chapati','2026-07-08','Wed','2026-07-08 12:03','chapati','not posted',30,'16:30',
  [4,4],2,0,'8 of 30 cap; weakest special'),
 ('Onion Masala Vade','2026-07-10','Fri','2026-07-09 20:55','piece','Rs.20 / 2 pcs',None,'15:00',
  [10,8,2,8,12,6,8,12,8,8,10],11,0,'Posted night before with lunch menu'),
 ('Maddur Vada','2026-08-02','Sun','2026-08-02 11:04','piece','Rs.50 for 1 / Rs.90 for 2',None,'15:30',
  [8,3,4,10,2,2,8,2,2,6],10,1,'Same-day post; 1 late order accepted'),
]
specrows=[]
for e in SN:
    nm,sd,dw,odt,unit,price,cap,cut,qs,n,late,note=e
    specrows.append({'event':nm,'service_date':sd,'dow':dw,'offered_at':odt,'unit':unit,'price':price,
      'stated_cap':cap if cap else '','order_cutoff':cut,'order_messages':n,'units_ordered':sum(qs),
      'late_orders':late,'notes':note})
OB=[('2026-08-16','C048',0,5),('2026-08-16','C036',0,10),('2026-08-16','C052',8,0),('2026-08-16','C014',4,4),
 ('2026-08-16','C002',4,2),('2026-08-16','C034',2,2),('2026-08-16','C010',2,2),('2026-08-16','C048',8,6),
 ('2026-08-16','C092',0,6),('2026-08-16','C078',0,5),('2026-08-17','C020',2,2),('2026-08-17','C026',2,0),
 ('2026-08-17','C075',2,2),('2026-08-17','C080',4,4)]
specrows.append({'event':'Varamahalakshmi Obbattu (Kobbari + Bele)','service_date':'2026-08-20','dow':'Thu',
  'offered_at':'2026-08-16 11:25','unit':'piece','price':'Rs.45 each','stated_cap':'','order_cutoff':'2026-08-18 12:00',
  'order_messages':len(OB),'units_ordered':sum(k+b for _,_,k,b in OB),'late_orders':0,
  'notes':'Kobbari %d + Bele %d; %d distinct households; kitchen closed 2 lunch days to produce it'%(
      sum(k for _,_,k,_ in OB),sum(b for _,_,_,b in OB),len({h for _,h,_,_ in OB}))})

json.dump({'menu_rows':menu_rows,'daily':daily,'dishrows':dishrows,'batrows':batrows,'specrows':specrows},
          open(W+'/final.json','w'),indent=1)
def wr(name,rows):
    if not rows: return
    with open(os.path.join(OUT,name),'w',newline='') as f:
        w=csv.DictWriter(f,fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
    print(name,len(rows))
wr('south_savory_menus.csv',menu_rows)
wr('south_savory_daily_lunch_orders.csv',daily)
wr('south_savory_dish_performance.csv',dishrows)
wr('south_savory_batter_batches.csv',batrows)
wr('south_savory_special_events.csv',specrows)
print('lunch order msgs:',len(lun),'batter msgs:',len(bat))
