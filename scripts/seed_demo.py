"""Seed a demo coach with realistic clients, programs and training history.
Env: SUPABASE_URL, SUPABASE_SECRET (service key), DB_URL (postgres conn string).
Idempotent: deletes and recreates the demo coach."""
import os, json, random, re, datetime as dt, urllib.request
import psycopg

URL = os.environ['SUPABASE_URL']; SECRET = os.environ['SUPABASE_SECRET']; DB = os.environ['DB_URL']
EMAIL, PW, NAME = 'demo@coachsheet.app', 'Demo1234!', 'Coach Sam Carter'
random.seed(7)
LIB = json.load(open(os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'videoLibrary.json')))

def api(method, path, body=None):
    req = urllib.request.Request(URL + path, method=method, data=json.dumps(body).encode() if body else None,
        headers={'apikey': SECRET, 'Authorization': f'Bearer {SECRET}', 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as r: return json.loads(r.read() or b'{}')

def norm(s):
    s = s.lower(); s = re.sub(r'\(.*?\)', ' ', s); s = re.sub(r'[^a-z0-9\s-]', ' ', s)
    for a, b in [(r'\bdb\b','dumbbell'),(r'\bdumbell\b','dumbbell'),(r'\bbb\b','barbell'),(r'\brdls?\b','romanian deadlift'),(r'\bnordics?\b','nordic curl'),(r'\bohp\b','overhead press'),(r'\btriceps?\b','tricep'),(r'\bbiceps?\b','bicep')]:
        s = re.sub(a, b, s)
    for a, b in [(r'raises\b','raise'),(r'curls\b','curl'),(r'presses\b','press'),(r'extensions\b','extension'),(r'rows\b','row'),(r'squats\b','squat'),(r'fl(ys|ies)\b','fly'),(r'crunches\b','crunch'),(r'lunges\b','lunge'),(r'mornings\b','morning'),(r'deadlifts\b','deadlift'),(r'pushdowns\b','pushdown'),(r'shrugs\b','shrug'),(r'dips\b','dip'),(r'pulls\b','pull'),(r'pullovers\b','pullover')]:
        s = re.sub(a, b, s)
    return re.sub(r'\s+', ' ', s).strip()
STOP = {'the','a','with','and','for','on','of','to','each','side','per','leg','arm'}
IDX = [(set(t for t in norm(e['name']).split() if t not in STOP), norm(e['name']), e['videoId']) for e in LIB]
def video(name):
    k = norm(name); q = set(t for t in k.split() if t not in STOP)
    best, bs = None, 0
    for toks, key, vid in IDX:
        if key == k: return vid
        inter = len(toks & q)
        if not inter: continue
        sc = inter / len(toks | q)
        if q <= toks or toks <= q: sc = max(sc, .75)
        if sc > bs: bs, best = sc, vid
    return best if bs >= .6 else None

# ---- programs: (name, [(day, is_rest, [(exercise, sets, reps, notes)])]) ----
ALI = ('ATG Upper/Lower', [
 ('Day 1 - Upper', False, [('Trap three raise',2,'15-20',''),('Powell raise',2,'15-20',''),('Incline bench press machine',3,'8-12',''),('Lat pulldown',3,'8-12',''),('Chest fly machine',3,'8-12',''),('Seated close grip cable row',3,'8-12',''),('Tricep extensions',3,'8-12',''),('Lateral raises',3,'8-12',''),('Preacher curl',3,'8-12','')]),
 ('Day 2 - Lower', False, [('Tibialis raise',2,'15-20',''),('Bent knee calf raise',2,'12-20',''),('Peterson step up',2,'12-20',''),('ATG split squat',3,'6-12','each'),('RDL',3,'6-12',''),('Leg curl',3,'8-12',''),('Garhammer raise',3,'10-20',''),('Cossack squat',2,'6-12','each')]),
 ('Day 3 - Rest', True, []),
 ('Day 4 - Upper', False, [('Trap three raise',2,'15-20',''),('Dumbbell pullover',2,'15-20',''),('Shoulder press',3,'8-12',''),('Bent over row',3,'8-12',''),('Chest press machine',3,'8-12',''),('Hammer curl',3,'8-12',''),('JM press',3,'8-12',''),('Lateral raises',3,'8-12','')]),
 ('Day 5 - Lower', False, [('Tibialis raises',2,'15-20',''),('Straight leg calf raises',2,'12-20',''),('Heel elevated squat',3,'8-12',''),('Seated good mornings',3,'8-15',''),('Nordics',3,'5',''),('Back extensions',3,'8-12',''),('Crunches',3,'10-20','')]),
])
PPL = ('Push / Pull / Legs', [
 ('Push', False, [('Barbell bench press',4,'5-8','Rest 2-3 min'),('Incline dumbbell press',3,'8-12',''),('Overhead press',3,'6-10',''),('Lateral raises',3,'12-15',''),('Cable tricep pushdown',3,'10-15',''),('Overhead tricep extension',2,'12-15','')]),
 ('Pull', False, [('Deadlift',3,'5','Heavy'),('Pull ups',3,'6-10','Add weight if easy'),('Seated cable row',3,'10-12',''),('Face pull',3,'15-20',''),('Barbell curl',3,'8-12',''),('Hammer curl',2,'12-15','')]),
 ('Legs', False, [('Back squat',4,'5-8',''),('Romanian deadlift',3,'8-10',''),('Leg press',3,'10-12',''),('Walking lunges',2,'12','each leg'),('Leg curl',3,'12-15',''),('Standing calf raise',4,'12-15','')]),
 ('Rest', True, []),
])
FULL = ('Full Body 3x', [
 ('Workout A', False, [('Goblet squat',3,'10-12',''),('Push ups',3,'8-15',''),('Dumbbell row',3,'10-12','each'),('Glute bridge',3,'15',''),('Plank',3,'30-45 sec','')]),
 ('Workout B', False, [('Dumbbell deadlift',3,'10-12',''),('Dumbbell bench press',3,'10-12',''),('Lat pulldown',3,'10-12',''),('Reverse lunges',3,'10','each'),('Dead bug',3,'10','each side')]),
 ('Workout C', False, [('Leg press',3,'12-15',''),('Shoulder press',3,'10-12',''),('Seated cable row',3,'12',''),('Hip thrust',3,'12-15',''),('Farmer carry',3,'40 m','')]),
])
STR = ('Strength Block – Upper/Lower', [
 ('Upper A', False, [('Barbell bench press',5,'5','Top set + back-offs'),('Weighted pull ups',4,'6',''),('Overhead press',3,'8',''),('Dumbbell row',3,'10',''),('Skull crushers',3,'10','')]),
 ('Lower A', False, [('Back squat',5,'5',''),('Romanian deadlift',3,'8',''),('Bulgarian split squat',3,'8','each'),('Hanging leg raise',3,'10','')]),
 ('Rest', True, []),
 ('Upper B', False, [('Incline bench press',4,'6-8',''),('Barbell row',4,'6-8',''),('Dips',3,'8-12',''),('Face pull',3,'15',''),('EZ bar curl',3,'10','')]),
 ('Lower B', False, [('Deadlift',4,'4','Heavy'),('Front squat',3,'6',''),('Hip thrust',3,'10',''),('Leg curl',3,'12',''),('Standing calf raise',4,'10','')]),
])

# ---- clients: (name, email, notes, unit, program, weeks_history, days_since_last, sessions/week, start weight scale) ----
CLIENTS = [
 ('Ali Nouur','ali@example.com','Knee rehab focus (ATG). Wants to train 4x/week.','kg',ALI,8,0,4,1.0),
 ('Sarah Mitchell','sarah.m@example.com','Goal: first pull up + general strength. Travels for work.','kg',PPL,6,2,3,0.65),
 ('Omar Haddad','omar.h@example.com','Beginner, 3 days/week, lower back caution.','kg',FULL,4,9,3,0.55),
 ('Emma Larsen','emma.l@example.com','Powerlifting prep – meet in 10 weeks.','lb',STR,10,3,4,1.9),
 ('Youssef Benali','youssef@example.com','Starts next Monday.','kg',PPL,0,None,0,0.8),
 ('Lina Costa','lina.c@example.com','Intro call done; waiting for her Excel.','kg',None,0,None,0,0),
 ('Marco Rossi','marco@example.com','Paused membership.','kg',FULL,3,40,2,0.9),
]
BASE = {'bench':60,'press':40,'squat':80,'deadlift':100,'row':50,'pulldown':50,'curl':12,'raise':8,'extension':20,'pushdown':25,'fly':15,'lunge':12,'step':10,'bridge':40,'thrust':60,'leg press':120,'pull up':0,'push up':0,'plank':0,'nordic':0,'dip':0,'carry':20,'calf':40,'dead bug':0,'crunch':0,'tibialis':10,'good morning':30,'pullover':12,'jm':30,'cossack':8,'split squat':10,'garhammer':0,'hanging':0}
def base_w(name):
    n = name.lower()
    for k in ['leg press','split squat','pull up','push up','dead bug','good morning','nordic','hanging']:
        if k in n: return BASE[k]
    for k, v in BASE.items():
        if k in n: return v
    return 20
def rep_target(reps):
    m = re.match(r'^(\d+)(?:\s*[-–]\s*(\d+))?$', reps.strip())
    return (int(m.group(1)), int(m.group(2) or m.group(1))) if m else None

def main():
    for u in api('GET', '/auth/v1/admin/users?per_page=200').get('users', []):
        if u['email'] == EMAIL: api('DELETE', f"/auth/v1/admin/users/{u['id']}")
    user = api('POST', '/auth/v1/admin/users', {'email': EMAIL, 'password': PW, 'email_confirm': True, 'user_metadata': {'name': NAME}})
    uid = user['id']
    now = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=1)).replace(hour=18, minute=0, second=0, microsecond=0)
    with psycopg.connect(DB) as con, con.cursor() as cur:
        cur.execute("insert into coaches (id,name,email) values (%s,%s,%s) on conflict (id) do update set name=excluded.name", (uid, NAME, EMAIL))
        nsess = 0
        for (cname, cemail, notes, unit, prog, weeks, since, per_week, scale) in CLIENTS:
            cur.execute("insert into clients (coach_id,name,email,notes,unit,archived,created_at) values (%s,%s,%s,%s,%s,%s,%s) returning id,token",
                        (uid, cname, cemail, notes, unit, cname == 'Marco Rossi', now - dt.timedelta(weeks=max(weeks, 1) + 1)))
            cid, token = cur.fetchone()
            print(f'{cname:16s} /c/{token}')
            if not prog: continue
            cur.execute("insert into programs (coach_id,client_id,name,source_filename,created_at) values (%s,%s,%s,%s,%s) returning id",
                        (uid, cid, prog[0], prog[0].replace(' ', '_').replace('/', '') + '.xlsx', now - dt.timedelta(weeks=max(weeks, 1) + 1)))
            pid = cur.fetchone()[0]
            train_days = []
            for i, (dname, rest, exs) in enumerate(prog[1]):
                cur.execute("insert into program_days (program_id,position,name,is_rest) values (%s,%s,%s,%s) returning id", (pid, i, dname, rest))
                did = cur.fetchone()[0]
                exrows = []
                for j, (en, sets, reps, en_notes) in enumerate(exs):
                    cur.execute("insert into program_exercises (day_id,position,name,sets,reps,notes,video_id) values (%s,%s,%s,%s,%s,%s,%s) returning id", (did, j, en, sets, reps, en_notes, video(en)))
                    exrows.append((cur.fetchone()[0], en, sets, reps))
                if not rest: train_days.append((did, dname, exrows))
            if not weeks or since is None: continue
            last = now - dt.timedelta(days=since)
            total = weeks * per_week
            k = 0
            for s in range(total):
                offset_weeks = (total - 1 - s) // per_week
                slot = s % per_week
                when = last - dt.timedelta(weeks=offset_weeks) - dt.timedelta(days=(per_week - 1 - slot) * (7 // per_week)) if offset_weeks or slot != per_week - 1 else last
                when = when.replace(hour=random.choice([7, 8, 12, 17, 18, 19]), minute=random.randint(0, 59))
                if when > now: continue
                did, dname, exrows = train_days[k % len(train_days)]; k += 1
                progress = s / max(total - 1, 1)
                dur = random.randint(42, 68)
                cur.execute("insert into workout_sessions (client_id,day_id,day_name,started_at,finished_at,duration_min) values (%s,%s,%s,%s,%s,%s) returning id",
                            (cid, did, dname, when - dt.timedelta(minutes=dur), when, dur))
                sid = cur.fetchone()[0]; nsess += 1
                for (eid, en, sets, reps) in exrows:
                    if random.random() < 0.08: continue
                    rt = rep_target(reps); bw = base_w(en)
                    for i in range(sets):
                        if rt and bw:
                            w = round((bw * scale * (1 + 0.22 * progress) * random.uniform(0.97, 1.03)) / 2.5) * 2.5
                            if unit == 'lb': w = round(w / 5) * 5
                            r = random.randint(rt[0], rt[1]) - (1 if i == sets - 1 and random.random() < .4 else 0)
                            cur.execute("insert into workout_sets (session_id,exercise_id,exercise_name,set_index,weight,reps,done) values (%s,%s,%s,%s,%s,%s,true)", (sid, eid, en, i, w, max(r, 1)))
                        elif rt:
                            r = random.randint(rt[0], rt[1]) + int(6 * progress)
                            cur.execute("insert into workout_sets (session_id,exercise_id,exercise_name,set_index,reps,done) values (%s,%s,%s,%s,%s,true)", (sid, eid, en, i, r))
                        else:
                            cur.execute("insert into workout_sets (session_id,exercise_id,exercise_name,set_index,extra,done) values (%s,%s,%s,%s,%s,true)", (sid, eid, en, i, reps))
        con.commit()
        print('sessions:', nsess)
    print(f'login: {EMAIL} / {PW}')

if __name__ == '__main__': main()
