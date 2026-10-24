import json,re,csv,os
W='/tmp/sschat/work'; OUT='/sessions/exciting-dreamy-cray/mnt/outputs'
recs=json.load(open(W+'/orders2.json'))
for r in recs:  # replay build-time fixes
    t=r['text']
    if r['cat']=='batter_order':
        if r.get('kg') is None:
            m=re.search(r'(\d+)\s*-\s*kg',t,re.I)
            if m: r['kg']=float(m.group(1))
        if re.search(r'(without|with out|no)\s*topping',t,re.I): r['toppings']=False
        if r.get('kg') is None: r['cat']='question'
    if r['dt']=='2026-06-18 17:34:00':
        r.update({'cat':'batter_order','kg':0.75,'batter_type':'Adai','toppings':False})
    if r['dt']=='2026-07-17 11:31:00':
        r.update({'cat':'lunch_order','items':{'DISH::Avial':1},'service_date':'2026-07-17','late':True})
LBL={'combo1':'Combo 1','combo2':'Combo 2','ragi_ball':'Ragi ball','menthya_mudde':'Menthya mudde',
     'curd_rice':'Curd rice','mudde_unspecified':'Mudde (type unspecified)'}
rows=[]
for r in recs:
    if r['cat']=='lunch_order':
        for k,v in (r.get('items') or {}).items():
            rows.append({'ordered_date':r['date'],'ordered_time':r['time'],'ordered_dow':r['dow'],
              'service_date':r.get('service_date') or '','household_id':r['sender'],'stream':'lunch',
              'item_type':'main_dish_alacarte' if k.startswith('DISH::') else 'combo' if k.startswith('combo') else 'addon',
              'item':k[6:] if k.startswith('DISH::') else LBL.get(k,k),'qty':v,
              'after_1030_cutoff':bool(r.get('late')),'qty_confidence':'medium' if r.get('manual_override') else 'medium'})
    elif r['cat']=='batter_order':
        rows.append({'ordered_date':r['date'],'ordered_time':r['time'],'ordered_dow':r['dow'],
          'service_date':'','household_id':r['sender'],'stream':'batter',
          'item_type':'batter','item':(r.get('batter_type') or 'Unknown')+(' + toppings' if r.get('toppings') else ''),
          'qty':r.get('kg'),'after_1030_cutoff':'','qty_confidence':'high'})
SN={'2026-06-08':'Onion Masala Vade','2026-07-07':'Wheat Aloo Paratha','2026-07-08':'Wheat Chapati',
    '2026-07-10':'Onion Masala Vade','2026-08-02':'Maddur Vada'}
SNACK_ROWS=[('2026-06-08','10:54','C014',10),('2026-06-08','10:55','C012',10),('2026-06-08','11:15','C007',14),
 ('2026-06-08','11:21','C015',6),('2026-06-08','11:23','C016',4),('2026-06-08','11:25','C017',4),
 ('2026-06-08','11:26','C018',10),('2026-06-08','11:27','C013',4),('2026-06-08','11:28','C019',10),
 ('2026-06-08','11:29','C020',10),('2026-06-08','11:45','C004',6),('2026-06-08','11:51','C006',4),
 ('2026-06-08','11:56','C021',6),('2026-06-08','12:25','C022',10),('2026-06-08','12:28','C023',6),
 ('2026-06-08','12:33','C024',6),('2026-06-08','12:46','C025',6),('2026-06-08','12:53','C026',4),
 ('2026-06-08','13:08','C027',6),
 ('2026-07-07','15:47','C040',4),('2026-07-07','15:58','C002',10),('2026-07-07','16:16','C012',2),
 ('2026-07-07','16:34','C004',2),('2026-07-07','16:38','C032',4),('2026-07-07','17:14','C044',2),
 ('2026-07-08','12:54','C013',4),('2026-07-08','13:00','C071',4),
 ('2026-07-09','21:10','C040',10),('2026-07-09','21:34','C077',8),('2026-07-09','21:40','C071',2),
 ('2026-07-09','22:14','C021',8),('2026-07-09','22:25','C022',12),('2026-07-10','05:20','C078',6),
 ('2026-07-10','06:08','C063',8),('2026-07-10','06:28','C012',12),('2026-07-10','09:23','C044',8),
 ('2026-07-10','10:39','C007',8),('2026-07-10','11:05','C018',10),
 ('2026-08-02','11:29','C039',8),('2026-08-02','11:57','C071',3),('2026-08-02','11:59','C089',4),
 ('2026-08-02','12:00','C021',10),('2026-08-02','12:36','C010',2),('2026-08-02','12:45','C032',2),
 ('2026-08-02','13:01','C042',8),('2026-08-02','13:23','C034',2),('2026-08-02','14:08','C026',2),
 ('2026-08-02','16:28','C035',6)]
import datetime as _d
for od,ot,hh,q in SNACK_ROWS:
    sd=od if od in SN else '2026-07-10'
    rows.append({'ordered_date':od,'ordered_time':ot,
      'ordered_dow':_d.date(*map(int,od.split('-'))).strftime('%a'),'service_date':sd,
      'household_id':hh,'stream':'evening_special','item_type':'special','item':SN[sd],'qty':q,
      'after_1030_cutoff':'','qty_confidence':'high'})
OB=[('2026-08-16','11:28','C048',0,5),('2026-08-16','12:36','C036',0,10),('2026-08-16','12:39','C052',8,0),
 ('2026-08-16','12:57','C014',4,4),('2026-08-16','13:09','C002',4,2),('2026-08-16','13:10','C034',2,2),
 ('2026-08-16','14:07','C010',2,2),('2026-08-16','14:21','C048',8,6),('2026-08-16','16:03','C092',0,6),
 ('2026-08-16','16:33','C078',0,5),('2026-08-17','12:44','C020',2,2),('2026-08-17','13:11','C026',2,0),
 ('2026-08-17','13:50','C075',2,2),('2026-08-17','13:53','C080',4,4)]
for od,ot,hh,k,b in OB:
    for nm,q in (('Kobbari Obbattu',k),('Bele Obbattu',b)):
        if q: rows.append({'ordered_date':od,'ordered_time':ot,
          'ordered_dow':_d.date(*map(int,od.split('-'))).strftime('%a'),'service_date':'2026-08-20',
          'household_id':hh,'stream':'festival_special','item_type':'special','item':nm,'qty':q,
          'after_1030_cutoff':'','qty_confidence':'high'})
rows.sort(key=lambda r:(r['ordered_date'],r['ordered_time']))
with open(os.path.join(OUT,'south_savory_order_lines.csv'),'w',newline='') as f:
    w=csv.DictWriter(f,fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
print('order lines:',len(rows))
# JSON bundle
F=json.load(open(W+'/final.json'))
bundle={'source':'WhatsApp export, South Savory main group, 2026-06-05 to 2026-09-02',
 'anonymisation':'household_id values are session-local pseudonyms; no names, phone numbers or flat numbers retained',
 'menus':F['menu_rows'],'daily_lunch':F['daily'],'dish_performance':F['dishrows'],
 'batter_batches':F['batrows'],'special_events':F['specrows'],'order_lines':rows}
json.dump(bundle,open(os.path.join(OUT,'south_savory_dataset.json'),'w'),indent=1)
print('json written')
