import json
W='/tmp/sschat/work'
recs=json.load(open(W+'/orders2.json'))
# 2026-07-16 22:08 C071 "One portion Avial" superseded by 22:37 "Please make it 2 Avial tomorrow"
for r in recs:
    if r['dt']=='2026-07-16 22:08:00' and r['sender']=='C071':
        r['cat']='superseded'; r['items']={}
        r['note']='replaced by same-household amendment at 22:37 (1 -> 2 Avial)'
json.dump(recs,open(W+'/orders2.json','w'),indent=1)
print('amendment applied')
