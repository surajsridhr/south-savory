import json,collections,statistics as st
from datetime import datetime,timedelta
W='/tmp/sschat/work'
F=json.load(open(W+'/final.json'))
recs=json.load(open(W+'/orders2.json'))
daily=[d for d in F['daily'] if d['service_date']!='UNATTRIBUTED']
menu=F['menu_rows']
def p(*a): print(*a)

p("=== COVERAGE ===")
p("menu days:",len(menu),"| days with >=1 order msg:",sum(1 for d in daily if d['order_messages']),
  "| zero-order menu days:",sum(1 for d in daily if d['order_messages']==0))
p("zero-order dates:",[d['service_date']+'('+d['dow']+')' for d in daily if d['order_messages']==0])
tot_msgs=sum(d['order_messages'] for d in daily); tot_meal=sum(d['est_meal_units'] for d in daily)
p("total lunch order msgs:",tot_msgs,"total est meal units:",tot_meal)
act=[d for d in daily if d['order_messages']]
p("on ACTIVE days: median msgs %.1f mean %.1f | median meal units %.1f mean %.1f"%(
  st.median([d['order_messages'] for d in act]),st.mean([d['order_messages'] for d in act]),
  st.median([d['est_meal_units'] for d in act]),st.mean([d['est_meal_units'] for d in act])))
p("max day:",max(daily,key=lambda d:d['est_meal_units'])['service_date'],
  max(d['est_meal_units'] for d in daily))
p("revenue band across all lunch days: Rs %d - %d"%(sum(d['est_revenue_low_inr'] for d in daily),
  sum(d['est_revenue_high_inr'] for d in daily)))

p("\n=== DAY OF WEEK ===")
dw=collections.defaultdict(lambda:{'days':0,'msgs':0,'meal':0,'hh':0,'zero':0})
for d in daily:
    x=dw[d['dow']]; x['days']+=1; x['msgs']+=d['order_messages']; x['meal']+=d['est_meal_units']
    x['hh']+=d['ordering_households']
    if d['order_messages']==0: x['zero']+=1
order=['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
p("dow menu_days zero_days avg_msgs avg_meal_units avg_households")
for k in order:
    if k in dw:
        x=dw[k]
        p("%-4s %6d %8d %9.1f %14.1f %14.1f"%(k,x['days'],x['zero'],x['msgs']/x['days'],x['meal']/x['days'],x['hh']/x['days']))

p("\n=== ARCHETYPE ===")
ar=collections.defaultdict(lambda:{'d':0,'m':0,'u':0,'z':0})
for d in daily:
    a=ar[d['menu_archetype']]; a['d']+=1; a['m']+=d['order_messages']; a['u']+=d['est_meal_units']
    if d['order_messages']==0: a['z']+=1
for k,v in sorted(ar.items(),key=lambda kv:-kv[1]['u']/kv[1]['d']):
    p("%-24s days=%2d zero=%d avg_msgs=%.1f avg_meal_units=%.1f"%(k,v['d'],v['z'],v['m']/v['d'],v['u']/v['d']))

p("\n=== PRICE POINT vs DEMAND ===")
pp=collections.defaultdict(lambda:{'d':0,'u':0,'m':0})
for d,mr in zip(daily,sorted(menu,key=lambda r:r['service_date'])):
    assert d['service_date']==mr['service_date']
    k=mr['combo1_price']; x=pp[k]; x['d']+=1; x['u']+=d['est_meal_units']; x['m']+=d['order_messages']
for k in sorted(pp): p("Combo1 Rs.%s days=%2d avg_meal_units=%.1f avg_msgs=%.1f"%(k,pp[k]['d'],pp[k]['u']/pp[k]['d'],pp[k]['m']/pp[k]['d']))

p("\n=== WEEK BY WEEK ===")
wk=collections.defaultdict(lambda:{'days':0,'msgs':0,'meal':0,'hh':set(),'zero':0})
for d in daily:
    dt=datetime.strptime(d['service_date'],'%Y-%m-%d'); k=(dt-timedelta(days=dt.weekday())).strftime('%Y-%m-%d')
    x=wk[k]; x['days']+=1; x['msgs']+=d['order_messages']; x['meal']+=d['est_meal_units']
    if d['order_messages']==0: x['zero']+=1
for r in recs:
    if r['cat']=='lunch_order' and r.get('service_date'):
        dt=datetime.strptime(r['service_date'],'%Y-%m-%d'); k=(dt-timedelta(days=dt.weekday())).strftime('%Y-%m-%d')
        wk[k]['hh'].add(r['sender'])
p("week_start menu_days zero_days order_msgs meal_units distinct_households")
for k in sorted(wk):
    x=wk[k]; p("%s %9d %9d %10d %10d %18d"%(k,x['days'],x['zero'],x['msgs'],x['meal'],len(x['hh'])))

p("\n=== ORDER TIMING vs 10:30 CUTOFF ===")
lun=[r for r in recs if r['cat']=='lunch_order' and r.get('service_date')]
buck=collections.Counter(); late=0
for r in lun:
    sd=r['service_date']
    if r['date']<sd: buck['prev evening (before midnight)']+=1
    else:
        h,m=map(int,r['time'].split(':'))
        t=h*60+m
        if t<6*60: buck['00:00-05:59']+=1
        elif t<8*60: buck['06:00-07:59']+=1
        elif t<9*60: buck['08:00-08:59']+=1
        elif t<10*60: buck['09:00-09:59']+=1
        elif t<=630: buck['10:00-10:30']+=1
        else: buck['AFTER 10:30 (late)']+=1; late+=1
tot=sum(buck.values())
for k in ['prev evening (before midnight)','00:00-05:59','06:00-07:59','08:00-08:59','09:00-09:59','10:00-10:30','AFTER 10:30 (late)']:
    if k in buck: p("%-32s %3d (%4.1f%%)"%(k,buck[k],100*buck[k]/tot))
p("late order msgs:",late,"of",tot)

p("\n=== TOP DISHES (by avg meal units per appearance, min 1) ===")
for r in F['dishrows'][:20]:
    p("%-34s app=%d avg_units=%5.1f avg_hh=%4.1f gaps=%s"%(r['dish'],r['appearances'],
      r['avg_meal_units_per_appearance'],r['avg_households_per_appearance'],r['repeat_gaps_days']))
p("\n--- BOTTOM ---")
for r in F['dishrows'][-14:]:
    p("%-34s app=%d avg_units=%5.1f avg_hh=%4.1f gaps=%s"%(r['dish'],r['appearances'],
      r['avg_meal_units_per_appearance'],r['avg_households_per_appearance'],r['repeat_gaps_days']))

p("\n=== REPEAT DISHES: first vs later appearance ===")
bydate={d['service_date']:d for d in daily}
for r in F['dishrows']:
    if r['appearances']<2: continue
    ds=r['dates'].split(';')
    p("%-34s %s"%(r['dish'],'  '.join('%s(%s):%d units/%d msgs'%(x,bydate[x]['dow'],bydate[x]['est_meal_units'],bydate[x]['order_messages']) for x in ds)))

p("\n=== HOUSEHOLDS ===")
hh=collections.Counter()
for r in recs:
    if r['cat'] in ('lunch_order','batter_order','snack_order'): hh[r['sender']]+=1
p("distinct ordering households (any category):",len(hh))
lh=collections.Counter(r['sender'] for r in recs if r['cat']=='lunch_order')
bh=collections.Counter(r['sender'] for r in recs if r['cat']=='batter_order')
p("lunch-ordering households:",len(lh),"| batter-ordering households:",len(bh),
  "| overlap:",len(set(lh)&set(bh)))
p("lunch orders per household: median %.1f max %d"%(st.median(lh.values()),max(lh.values())))
p("top 10 lunch households order-msg counts:",sorted(lh.values(),reverse=True)[:10])
p("households ordering lunch once only:",sum(1 for v in lh.values() if v==1))
p("share of lunch order msgs from top 10 households: %.0f%%"%(100*sum(sorted(lh.values(),reverse=True)[:10])/sum(lh.values())))

p("\n=== BATTER ===")
for r in F['batrows']: p(r)
tk=sum(r['total_kg'] for r in F['batrows']); p("total kg:",round(tk,1),"est revenue Rs",sum(r['est_revenue_inr'] for r in F['batrows']))
p("\n=== SPECIALS ===")
for r in F['specrows']: p(r)
p("\n=== CATEGORY COUNTS ===")
p(collections.Counter(r['cat'] for r in recs))
