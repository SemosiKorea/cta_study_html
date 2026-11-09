"""Preserve supplied exam originals and create a topic index (not an answer key)."""
from pathlib import Path
import json, shutil, subprocess
from concurrent.futures import ThreadPoolExecutor
ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT.parent / 'tmp/admin-litigation-review'
OUT = ROOT / 'admin-law'
manifest = json.loads((WORK / 'manifest.json').read_text())
chapters = {
 '2021':[1,8,8,8,8,8,8,8,8,8,1,4,4,4,3,4,4,3,3,3,3,2,4,5,4,8,2,2,3,5,6,6,6,7,8,7,6,7,6,8],
 '2022':[1,8,8,4,1,1,8,2,2,4,2,3,4,2,4,2,3,4,3,5,3,4,8,3,5,8,7,8,6,6,7,7,7,6,6,6,7,3,5,7],
 '2023':[1,4,1,4,5,3,2,3,3,1,4,2,8,8,2,5,6,6,5,5,6,5,6,5,5,7,7,8,7,8,1,8,8,8,8,2,2,4,8,4],
 '2024':[5,6,6,5,6,6,7,7,8,7,8,8,8,4,8,8,1,7,7,3,3,3,3,3,5,1,7,2,1,2,4,8,4,4,8,5,4,2,2,3],
 '2025':[1,7,4,5,2,3,3,3,3,2,4,8,5,5,4,4,2,8,2,1,6,5,5,6,6,6,6,7,7,7,8,8,8,8,1,8,8,8,8,8]
}
questions=[]
for fn in ['analysis-2021-2023.json','analysis-2024-2025.json']:
 for year, data in json.loads((WORK/fn).read_text())['years'].items():
  assert len(chapters[year]) == 40
  for q in data['questions']:
   questions.append({'id':f'{year}-{q["number"]}', 'year':int(year), 'number':q['number'], 'page':q.get('page',q.get('pdf_page')), 'topic':q.get('topic',q.get('primary_topic')), 'chapter':chapters[year][q['number']-41]})
assert len(questions)==len({q['id'] for q in questions})==200
(OUT/'pdf').mkdir(exist_ok=True)
(OUT/'pages').mkdir(exist_ok=True)
for year,m in manifest.items(): shutil.copyfile(m['path'], OUT/'pdf'/f'exam-{year}.pdf')
(OUT/'sources'/'exams.json').write_text(json.dumps(sorted(questions,key=lambda q:(-q['year'],q['number'])),ensure_ascii=False,indent=2)+'\n')
def render(pair):
 from PIL import Image
 year,page=pair
 target=OUT/'pages'/f'{year}-{page}'
 if target.with_suffix('.webp').exists(): return
 subprocess.run(['pdftoppm','-f',str(page),'-l',str(page),'-scale-to','1700','-png','-singlefile',str(OUT/'pdf'/f'exam-{year}.pdf'),str(target)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
 with Image.open(target.with_suffix('.png')) as im: im.save(target.with_suffix('.webp'),quality=88)
 target.with_suffix('.png').unlink()
pages=sorted({(q['year'],q['page']) for q in questions})
with ThreadPoolExecutor(max_workers=3) as pool: list(pool.map(render,pages))
print(f'Preserved 5 PDFs, indexed {len(questions)} questions and rendered {len(pages)} pages.')
