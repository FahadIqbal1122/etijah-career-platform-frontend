"""Checks the high-school wording (`<id>_HS` entries in messages/*.json).

Each one must mirror its original question exactly (same option keys, same type of question), exist in both languages,
and be free of adult workplace words. Run from the frontend folder:   python3 scripts/check_hs_questions.py
"""
import json, re, sys

BANNED = re.compile(r"\b(manager|boss|job offer|offers?|salary|colleague|coworker|at work|meeting)\b|مدير|زميل العمل|عرضي عمل", re.I)
errors = []
msgs = {l: json.load(open(f'messages/{l}.json', encoding='utf-8'))['questions'] for l in ('en', 'ar')}
src = open('src/data/questions.ts', encoding='utf-8').read()
ids = set(re.findall(r"^\s+id: '([A-Za-z0-9_]+)'", src, re.M))

hs = {l: {k[:-3] for k in m if k.endswith('_HS') and k != 'QO5C_HS'} for l, m in msgs.items()}
if hs['en'] != hs['ar']:
    errors.append(f"EN/AR mismatch: {sorted(hs['en'] ^ hs['ar'])}")
for l, m in msgs.items():
    for qid in sorted(hs[l]):
        e, o = m[qid + '_HS'], m[qid]
        if qid not in ids: errors.append(f'{l} {qid}: no such question in questions.ts')
        if set(e) != set(o): errors.append(f'{l} {qid}: keys {set(e)} != {set(o)}')
        if 'options' in o and list(e.get('options', {})) != list(o['options']): errors.append(f'{l} {qid}: option keys differ')
        txt = e['text'] + ' ' + ' '.join(e.get('options', {}).values())
        if BANNED.search(txt): errors.append(f'{l} {qid}: adult word -> {BANNED.search(txt).group(0)}')
        if e['text'] == o['text'] and e.get('options') == o.get('options'): errors.append(f'{l} {qid}: identical to original')
print(f"{len(hs['en'])} questions with high-school wording; {len(errors)} problems")
for e in errors: print(' -', e)
sys.exit(1 if errors else 0)
