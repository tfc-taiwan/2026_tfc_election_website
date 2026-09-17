"""Fill SEO fixtures without replacing existing editorial content or SEO overrides."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
p = ROOT / 'data/listings.json'
data = json.loads(p.read_text())
def image(name, alt):
    return dict(src=f'/images/og/{name}.png', alt=alt, width=1200, height=630, type='image/png')
data.setdefault('seo', dict(siteUrl=None, language='zh-Hant', locale='zh_TW',
    home=dict(title='2026 選舉工具箱｜台灣事實查核中心', description='【示範網站】2026 地方選舉與公投資訊專區：閱讀查核報告、理解資訊操弄、學習查證方法。本站內容皆為虛構示範資料。', image=image('home','2026 選舉工具箱：查核報告、資訊判讀與查核學堂示範網站'), noindex=False),
    reports=dict(title='查核報告列表｜2026 選舉工具箱', description='【示範網站】瀏覽地方選舉與公投議題的示範查核報告，依分類探索音訊、圖片、數據與選務訊息的查證過程。', image=image('home','2026 選舉工具箱查核報告列表'), noindex=False)))
p.write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n')
for p in (ROOT/'data/reports').glob('*.json'):
    report = json.loads(p.read_text())
    story = next((s for s in data['stories'] if s['slug']==report['slug']),None)
    report.setdefault('seo', dict(title=f"{report['title']}｜{data['site']['name']}", description='【示範資料】'+(story['description'] if story else report['finding']), image=image(report['slug'], report['title']+'（示意圖，非真實查核事件）'), noindex=False, authorType='Organization'))
    p.write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
