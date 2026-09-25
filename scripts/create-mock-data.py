"""Regenerate clearly fictional editorial fixtures. No real-world claims or evidence."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'
DATA.joinpath('reports').mkdir(parents=True, exist_ok=True)

def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')

# Each fixture has a distinct editorial scenario; all conclusions describe that fixture only.
rows = [
 ('ai-voice', 'report', '地方選舉', '網傳「某候選人私下賄選錄音檔流出」？查核結果為變造', '一段聲音，足以代表真相嗎？從原始檔案、完整脈絡與交叉比對，檢視可疑的選舉音訊。', '2026-09-01', '錯誤', 'AI 識別', 'audio', 'cyan',
  '示範情境中的音檔是事先製作的合成素材，無法作為任何候選人發言的證據。',
  '示範社群貼文轉傳一段短音檔，並附上「候選人私下對話外流」的文字。這段情境完全虛構，沒有對應的真實候選人或事件。',
  [('先找原始音檔，確認來源', '示範素材的製作紀錄標示為人工合成。我們先比對檔案來源與發佈脈絡，而非僅根據聲音相似程度認定說話者。'), ('檢測結果不能單獨作為定論', 'AI 偵測工具可能誤判；本例的判讀依據是預先設定的素材製作紀錄。真實查核仍需要原始檔案、可核對的證據與獨立專業判讀。'), ('回到完整脈絡，再決定是否轉傳', '音訊中的聲音相似、字幕或貼文描述都不等於來源證明。本示範的結論只適用於這份虛構素材，不涉及任何實際人物。')]),
 ('ballot-paper', 'report', '地方選舉', '圖文流傳「新選票設計會透光，作票更容易」？錯誤訊息', '照片的明暗與對比，可能改變我們的判讀。一起拆解這則影像查核示範。', '2026-08-28', '錯誤', '影像查核', 'ballot', 'magenta',
  '本例照片經過調整，無法用來推論真實選票的材質或選務程序。',
  '虛構貼文將一張強光照射紙張的照片標示為「新選票」。圖片是為本網站製作的示意素材，並非官方選票。',
  [('確認圖片中的物件', '示範圖片拍攝的是一般紙張，沒有可驗證的選票來源。不能只憑貼文標題認定圖中的物件。'), ('比較處理前後的影像', '在這份測試案例中，影像的曝光與對比刻意提高。視覺效果並不能證明紙張材質已經改變。'), ('分開檢查影像與推論', '即使照片本身真實，照片是否足以支持「作票更容易」仍是另一個需要證據的問題。')]),
 ('early-voting', 'report', '地方選舉', '社群瘋傳「提前去投票所可以多領票」？查核這則傳言', '收到投票小撇步，先別急著分享。辨識缺少來源的選務訊息。', '2026-08-25', '錯誤', '投票資訊', 'ballot', 'cyan',
  '本示範訊息捏造了不存在的通知文件，傳言所引用的資料不能成立。',
  '示範群組訊息聲稱「越早到場，就有額外選票」，卻沒有附上公告原文或可查詢的通知編號。',
  [('追查消息依據', '範例訊息只引用「朋友聽說」，沒有可供核對的原始資料。這是需要停下來查證的訊號。'), ('核對公告出處', '本例預設的文件資料集中，沒有貼文所聲稱的通知。真實投票規則應以選務機關公告為準。'), ('保留原文再查證', '保留訊息文字與收到的時間，有助於比對傳言版本；避免把未查證的小技巧傳給更多人。')]),
 ('election-message', 'report', '地方選舉', '簡訊自稱「選委會」要求輸入個資？先確認連結來源', '假冒官方的訊息看起來很熟悉。從網址、要求的資料與查證管道找線索。', '2026-08-15', '事實釐清', '數位安全', 'phone', 'magenta',
  '範例連結指向虛構表單；網站名稱與機關標誌並不能證明訊息來源。',
  '本例以虛構簡訊呈現常見的緊急催促手法，要求讀者點擊連結並填寫敏感資料。沒有任何真實簡訊或受害者。',
  [('不要只看顯示名稱', '範例訊息的顯示名稱可自行設定，無法證明傳送者身分。'), ('檢查訊息要求的動作', '這則範例同時使用急迫期限與資料填寫要求，應先停止操作，從獨立管道核實。'), ('自行尋找可信管道', '不要使用可疑訊息內提供的聯絡方式作為唯一驗證來源；請自行查找機關的正式聯絡管道。')]),
 ('polling-video', 'report', '地方選舉', '「這是今年投票所的畫面」？舊影片換上新說明', '畫面沒有被修改，也可能傳遞錯誤脈絡。查核影片的時間與地點。', '2026-08-12', '部分錯誤', '脈絡查核', 'network', 'cyan',
  '本例使用舊素材搭配新的時間標籤，畫面與文字描述並不一致。',
  '示範貼文將素材庫中的舊影片寫成當年度選舉現場。本例所有場景及發佈紀錄均為虛構。',
  [('抽取關鍵畫面', '先選取可辨認場景的畫面，保留畫面中可核對的文字與時間資訊。'), ('確認最早的版本', '本例素材庫的時間紀錄早於貼文聲稱的時間，說明兩者並非同一事件。'), ('文字也需要查核', '影片可能未經剪輯，但搭配的說明仍可能改變讀者理解。影像與文案要分別檢視。')]),
 ('referendum-notice', 'report', '公投議題', '網傳「公投通知已經公告」？先比對原始文件', '一張沒有出處的公告截圖，如何一步步確認？', '2026-09-03', '事實釐清', '公告查證', 'document', 'cyan',
  '範例截圖缺少文件來源，不能據此判定任何公投的實際辦理狀態。',
  '示範圖片模仿公告格式，但沒有發文單位與原文連結。本頁沒有指涉任何實際公投案。',
  [('從截圖回到原文', '完整文件才能提供發布日期、修訂紀錄與適用範圍。截圖不能取代原始文件。'), ('核對文件版本', '本例提供兩份日期不同的虛構文件，示範舊版內容可能漏掉後續更新。'), ('確認適用對象', '不同種類投票的規則不能直接類推。本示範不提供任何實際投票資格判定。')]),
 ('referendum-chart', 'report', '公投議題', '「九成民眾都同意」？看懂圖表背後沒有說的事', '百分比之外，還有哪些數字必須一起看？', '2026-08-30', '部分錯誤', '數據判讀', 'chart', 'magenta',
  '本例數字來自虛構的自願回覆樣本，不能推論為全體民意。',
  '虛構社群圖卡引用一份示範問卷，卻沒有呈現收集方式與樣本範圍。圖卡上的數字不是實際民調。',
  [('先確認分母', '本例的百分比只描述示範問卷的回覆者，不等於全體民眾。'), ('檢視問句與抽樣', '問句順序、選項與收集方式都會影響如何理解結果。缺少這些資訊時應保留判斷。'), ('避免過度推論', '精確的百分比不代表可以推論到其他群體。結論的範圍應與資料來源一致。')]),
 ('referendum-context', 'report', '公投議題', '一張圖就能說完公投提案？把被省略的脈絡找回來', '閱讀提案內容，也要閱讀限制、範圍與完整說明。', '2026-08-22', '事實釐清', '政策判讀', 'document', 'cyan',
  '示範摘要省略了適用條件，讀者應回到完整提案文字核對。',
  '本例以虛構政策提案展示「只摘一句話」可能產生的理解落差，沒有對應真實提案。',
  [('取得完整文字', '先保存原始版本與日期，以免把不同階段的草稿當成同一文件。'), ('標記被省略的條件', '在示範文件中，段落後半部列有適用條件，圖卡卻沒有呈現。'), ('區分主張與事實', '支持或反對的價值判斷與可核對的事實是不同問題，可以分開討論。')]),
 ('coordinated-sharing', 'analysis', '地方選舉', '社群帳號如何利用「民生議題」帶動選舉風向？', '從發文時間、重複文案到轉貼路徑，認識資訊擴散的觀察方法。', '2026-09-02', None, '手法解析', 'network', 'cyan',
  '同步發文可以作為進一步觀察的線索，但不能單憑這點推定帳號的身分或動機。',
  '這份解析使用虛構的帳號網絡，說明如何有條理地記錄資訊傳播。',
  [('記錄時間與版本', '保存各則貼文的時間與公開網址，對照內容的異同。'), ('把觀察與推論分開', '相同文字是觀察到的現象；是否協調、由誰操作，需要另外的證據。'), ('交代分析的限制', '可見的公開貼文只是部分資料，不能代表平台上的所有傳播行為。')]),
 ('deepfake-guide', 'analysis', '地方選舉', 'Deepfake 語音越來越逼真，我們該如何防範？', '面對聽起來很像的聲音，先查出處，再談判讀。', '2026-08-29', None, 'AI 識別', 'audio', 'magenta',
  '查證來源、聯絡本人與比對完整脈絡，比單靠耳朵辨認更有幫助。',
  '本篇以虛構音訊情境整理查證步驟，不提供可取代專業鑑定的判斷公式。',
  [('先暫停轉傳', '遇到要求立即行動的音訊，先保存原始訊息，不必急著做決定。'), ('透過既有管道核實', '從原本就信任的聯絡方式確認身分，避免只使用訊息內提供的新聯絡資料。'), ('保留不確定性', '找不到來源，不代表一定為假；也不代表已經證實。清楚表達仍待查證的部分。')]),
 ('short-video', 'analysis', '地方選舉', '短影音如何讓資訊脫離脈絡？從十五秒片段開始查', '鏡頭前後發生了什麼？把完整發言放回時間軸。', '2026-08-20', None, '趨勢觀察', 'phone', 'cyan',
  '短片的片段、字幕與旁白需要分別核對，完整影片能補足遺漏的脈絡。',
  '本篇以一份剪輯示範素材，展示剪去前後文可能帶來的差異。',
  [('尋找完整版本', '記下片段中的關鍵字與可辨認畫面，作為尋找原始影片的線索。'), ('核對字幕', '字幕與旁白是另外加入的資訊，不能假設它們與原始發言完全一致。'), ('重建時間順序', '把片段放回完整時間軸，檢查被省略的提問、條件與回答。')]),
 ('ai-tools', 'guide', '地方選舉', '如何使用 AI 工具輔助查證', '認識 AI 檢測的用途與限制，建立有證據的查證習慣。', '2026-08-18', None, '查核學堂', 'audio', 'cyan',
  '工具的輸出是待查證的線索，原始資料與獨立證據仍是判斷核心。',
  '這份入門教學使用示範素材，協助讀者理解工具輔助查證的工作流程。',
  [('準備原始素材', '優先取得最早、品質最好的版本，避免轉傳壓縮造成額外干擾。'), ('理解工具的限制', '閱讀工具的適用範圍，不要把分數當作對素材真偽的保證。'), ('記錄查證過程', '保存使用的版本、日期與結果，並清楚交代目前無法確認的事項。')]),
 ('osint-basics', 'guide', '地方選舉', 'OSINT 開源情報基本功', '從公開來源、以圖搜圖到網頁紀錄，找回訊息的最初脈絡。', '2026-08-10', None, '查核學堂', 'network', 'magenta',
  '多個獨立來源的交叉核對，有助於辨別訊息是否完整、是否適用於當下。',
  '這份教學用虛構的圖片與網頁紀錄介紹基本查證步驟，不涉及個人資料調查。',
  [('用關鍵字找原文', '將人名以外的關鍵句、地點或公開事件名稱組合查詢，尋找原始發布者。'), ('比較圖片版本', '以圖搜圖可以協助找到舊版本，但搜尋不到並不代表圖片首次出現。'), ('善用公開網頁紀錄', '比對不同時間的頁面內容，並記錄網站可能缺頁、漏存等限制。')]),
]

stories=[]
for row in rows:
    sid, kind, cat, title, desc, published, verdict, tag, art, tone, finding, bg, sections = row
    pic={'src':f'/images/{art}.svg','alt':f'{tag}主題的報刊風格示意插圖，非事件照片'}
    story=dict(slug=sid,kind=kind,category=cat,title=title,description=desc,date=published,image=pic,tag=tag,tone=tone)
    if verdict: story['verdict']=verdict
    stories.append(story)
    report=dict(version=1,isMock=True,slug=sid,kind=kind,category=cat,title=title,finding=finding,tags=([verdict] if verdict else [])+[tag],published=published,updated=published,reportId=f'DEMO-{published.replace("-", "")}-{len(stories):02}',reporter='示範查核小組',editor='示範編輯',image=pic,imageCaption='編輯示意插圖｜本頁為虛構資料，非真實查核報告。',summaryPoints=[bg]+[p for _,p in sections[:2]],summaryClose=finding,background=dict(id='background',title='背景',paragraphs=[bg,'以下內容與證據設定僅供版型、資料串接與操作測試，不應引用為真實事件的查核結果。']),checkSections=[dict(id=f'check-{i+1}',title=t,paragraphs=[p]) for i,(t,p) in enumerate(sections)],sources=[dict(label='示範素材說明',note='文中場景、文件與判讀結果均為虛構；沒有對應的真實原始證據或採訪紀錄。')],relatedSlugs=[])
    if verdict: report['verdict']=verdict
    if sid == 'ai-voice':
        report['background']['image']={'src':'/images/message.svg','alt':'虛構轉傳訊息的示意排版，標示來源尚待確認'}
        report['background']['caption']='網傳訊息示意｜非真實貼文'
        report['checkSections'][1]['image']={'src':'/images/audio.svg','alt':'聲音波形與來源比對的概念示意，不是實際鑑定結果'}
        report['checkSections'][1]['caption']='音訊查核概念示意｜非實際工具輸出'
    write(DATA/'reports'/f'{sid}.json',report)
for s in stories:
    p=DATA/'reports'/f'{s["slug"]}.json'; report=json.loads(p.read_text())
    report['relatedSlugs']=[x['slug'] for x in stories if x['slug']!=s['slug'] and x['category']==s['category'] and x['kind']=='report'][:3]
    write(p,report)

listings=dict(version=1,isMock=True,
 site=dict(name='台灣事實查核中心',englishName='Taiwan FactCheck Center',title='2026 選舉工具箱',notice='示範網站・所有報告與活動皆為虛構資料',footer='© 2026 台灣事實查核中心｜介面示範・非正式網站'),
 navigation=[dict(label=l,href=h) for l,h in [('最新消息','/#activities'),('查核報告','/reports'),('謠言風向球','/#rumors'),('議題觀察室','/#analysis'),('重點專區','/#process'),('全民查核學堂','/#learning'),('關於本專區','/#about')]],
 hero=dict(kicker='2026 選舉工具箱',title=['台灣地方選舉 & 公投','事實查核與資訊專區'],description='在眾聲喧嘩之中，讓事實成為判斷的起點。從即時查核、資訊操弄解析到投票知識，陪你看懂訊息，做出知情的選擇。',electionDate='2026-11-28',facts=[dict(title=t,description=d,tone=c) for t,d,c in [('選舉日期與時間','示範投票日為 2026 年 11 月 28 日；實際日期與投票時間請以正式選務公告為準。','cyan'),('選舉項目與範圍','認識地方公職人員選舉，以及不同投票種類的適用範圍。','magenta'),('投票資格與準備','出發前，向選務機關確認投票資格、地點與應攜帶的文件。','cyan')]]),
 stories=stories,
 sections=dict(
 reports=dict(title='即時查核報告',categories=['地方選舉','公投議題'],items=[dict(slug=s['slug'], **({'title': '網傳候選人賄選錄音？實為變造'} if s['slug']=='ai-voice' else {})) for s in stories if s['kind']=='report']),
 analyses=dict(title='資訊操弄解析',description='不只查核單一事件，更深入理解資訊如何被剪輯、包裝與傳播，建立長期的資訊判讀力。',slugs=[s['slug'] for s in stories if s['kind']=='analysis']),
 shorts=dict(title='60 秒短影音闢謠',description='直接觀看台灣事實查核中心的 YouTube 影片，快速掌握查證方法與資訊判讀重點。',items=[dict(title=t,url=u) for t,u in [('一分鐘掌握：先查來源，再判讀內容','https://www.youtube.com/watch?v=GoRukYrdkdE'),('事實查核必修課：辨識資訊真偽','https://www.youtube.com/watch?v=63hT8oS83Vo'),('查核中心如何維持獨立與透明','https://www.youtube.com/watch?v=vGsTY_ct1eI')]]),
 rumors=dict(title='常見選舉謠言與劇本',items=[dict(id=i,badge=b,label=l,tone=t,scriptId=q) for i,b,l,t,q in [('vote','Vote','作票疑雲','cyan','ballot-box'),('money','Money','買票賄選','magenta','audio-rumor'),('rumor','Rumor','私德抹黑','cyan','audio-rumor'),('policy','Policy','政策造假','magenta','invisible-ink'),('unfair','Unfair','選務不公','cyan','ballot-box'),('foreign','Foreign','外部勢力','magenta','counting-system')]]),
 scripts=dict(title='破解常見劇本',items=[dict(id=i,question=q,answer=a) for i,q,a in [('ballot-box','劇本一：紙製票匭容易藏票、作票？','不要只由容器材質推論選務是否可靠。查核這類說法時，應核對現行查驗程序、公開監督方式，以及傳言提出的具體證據。本段是查證方法的示範，並非對個別選務事件的結論。'),('invisible-ink','劇本二：選票上會沾隱形墨水？','先找出傳言所指的原始影像與選票來源，釐清是否有可驗證的檢測或紀錄。網友轉述與看不清楚的照片，都不能單獨證明選票受到處理。'),('counting-system','劇本三：駭客能直接改掉開票結果？','區分現場開票、結果彙整與對外顯示等不同流程，再查核傳言究竟指向哪一環節。單一網頁顯示異常，不足以推論整個選舉結果遭到更改。'),('audio-rumor','延伸劇本：有錄音就一定有真相？','聲音相似不代表身分已經確認。先核對來源與完整脈絡，也要檢查是否存在剪輯、配音或合成的可能。相關示範可參考本專區的音訊查核報告。')]]),
 process=dict(title='選舉怎麼運作？',items=[dict(id=i,title=t,description=d,icon=ic,tone=c,content=p) for i,t,d,ic,c,p in [('prepare','選前準備','關於選票與投票通知單的那些事','document','cyan',['先確認投票地點、應備文件與實際投票時間，減少當天的慌亂。','本區是內容結構示範；正式上線時可補入經確認的選務資訊與官方來源。']),('voting','選中投票','一次看懂投開票所的流程與監督','calendar','magenta',['將身分確認、領票、圈選與投票等步驟逐一閱讀，遇到疑問時詢問現場選務人員。','實際程序與注意事項應以各選務機關當次公告為準。']),('counting','選後開票','認識計票與查驗機制','check','cyan',['區分現場開票、結果彙整與公告的不同階段，對照原始紀錄。','本示範不對任何實際選舉結果提出判斷。']),('resources','可信資源','尋找官方公告與有依據的查核','globe','magenta',['優先尋找發布機關的完整公告，並核對日期、適用範圍與更新版本。','查核文章應清楚交代引用來源、推論過程與尚待確認的限制。'])]]),
 learning=dict(title='全民查核學堂：資訊怎麼查？',items=[dict(slug='ai-tools',badge='AI Tools'),dict(slug='osint-basics',badge='OSINT')]),
 activities=dict(title='查核中心工作動態',items=[dict(id=i,dateLabel=dt,tag=t,title=tt,description=d,cta='查看活動',tone=c,content=p) for i,dt,t,tt,d,c,p in [('workshop','10/12','線上講座','看懂選舉假訊息：資訊判讀工作坊','從日常訊息出發，練習找來源、看證據、讀脈絡。','cyan',['這是一場虛構的示範活動，沒有開放報名。','預計內容包含圖片來源查找、音訊查核觀念與小組練習；正式活動資訊可在這份 JSON 中替換。']),('weekly','10/25','議題觀察','【解析 2026】一起觀察選舉資訊的變化','跟著查核記者，理解傳言如何被包裝與擴散。','magenta',['這是示範用的議題觀察活動，日期與內容均為虛構。','未來可在此提供正式活動時間、講者與報名資訊。']),('community','EVERY DAY','一起參與','把查證多做一步，把分享慢下一秒','從自己做起，讓有來源的資訊回到日常對話。','cyan',['收到可疑訊息時，先保存原文、確認出處與時間，再決定是否分享。','本示範網站不接收個人資料或疑似謠言投稿。'])]])
 ))
write(DATA/'listings.json',listings)
print(f'Wrote listings.json and {len(stories)} individual reports.')

# Keep regenerated fixtures compatible with the SEO schema.
import runpy
runpy.run_path(str(ROOT / 'scripts/add-mock-seo.py'))
