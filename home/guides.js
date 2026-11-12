// Original v0.2 spiritual guidance, preserved for the separate approved-catalog preview.
const profiles = {
 '쉼':['숨을 고르는 사람','많은 것을 해내는 대신, 잠시 쉬어도 괜찮은 시간을 찾고 있군요.'],
 '침묵':['고요한 샘을 찾는 사람','조용한 공간에서 자신과 하느님의 목소리를 더 가까이 듣고 싶은 마음입니다.'],
 '말씀':['말씀의 빛을 찾는 사람','새로운 배움과 성경의 언어로 일상을 다시 보고 싶은 마음입니다.'],
 '관계':['다정한 연결을 찾는 사람','함께 머무는 시간 속에서 사람과 관계의 의미를 되새겨 보고 싶군요.'],
 '자연':['길 위에서 쉬어 가는 사람','풍경 속에서 걸으며 마음의 속도를 조금 늦추는 시간이 어울립니다.'],
 '식별':['나만의 길을 찾는 사람','삶의 선택과 방향을 조용히 돌아보고 싶은 마음입니다.'],
 '기도':['기도의 자리를 찾는 사람','하느님 앞에 머물며 기도의 깊이를 조금 더 발견하고 싶은 마음입니다.'],
 '개인':['오롯한 시간을 찾는 사람','누군가의 속도에 맞추지 않고 자신의 걸음으로 머물고 싶은 마음입니다.']
};
Object.assign(profiles,{
 '성찰':['생각의 여백을 찾는 사람','책과 이야기처럼, 마음에 남은 생각을 천천히 펼쳐 보는 시간은 어떨까요?'],
 '경험':['새로운 순간을 만나는 사람','익숙한 일상에서 한 걸음 나와, 직접 느끼고 경험하는 시간을 찾아보세요.'],
 '시작':['작은 시작을 준비하는 사람','모든 것을 알지 못해도 괜찮아요. 안내를 따라 한 걸음 시작해 보세요.'],
 '열림':['나에게 맞는 시간을 찾는 사람','정해진 유형 없이, 편한 조건부터 골라보셔도 괜찮습니다.']
});
// 유형은 진단명이 아니라 지금의 머뭄을 묵상하도록 돕는 안내 카드입니다.
// 성경은 한국천주교주교회의 새번역의 짧은 발췌문과 공식 장 링크를 사용합니다.
// 정식 서비스에서 성경 본문을 게시하려면 주교회의의 저작권 사용 승인을 확인하세요.
const spiritualGuides = {
 '쉼': {
  opening:'많이 바빴을 당신에게',
  comfort:'해야 할 일과 누군가의 기대를 따라가느라, 정작 자신의 숨소리를 듣는 시간은 부족하지 않았나요? 당신에게 지금 필요한 것은 더 많은 성취가 아니라 잠시 앉아 있어도 괜찮은 자리일지 모릅니다. 쉬는 시간에도 무언가를 증명할 필요는 없습니다.',
  verse:'내가 너희에게 안식을 주겠다.', reference:'마태오 11,28', url:'https://bible.cbck.or.kr/Knb/Mt/11',
  saint:'성녀 마르타', saintStory:'손님을 맞느라 분주했던 마르타에게 예수님은 필요한 한 가지를 일깨워 주셨습니다(루카 10,38-42). 마르타의 성실함을 부정하기보다, 분주함 가운데 주님께 시선을 돌려 보라는 초대로 읽어 보세요.',
  question:'나는 언제부터 쉬는 순간에도 해야 할 일을 생각했을까요?',
  prayer:'주님, 서두르지 않아도 당신이 저를 받아 주심을 믿게 하소서.'
 },
 '침묵': {
  opening:'수많은 소리 속에서 나의 목소리를 잊은 당신에게',
  comfort:'하루는 이야기로 가득했는데, 마음은 오히려 비어 있는 것 같을 때가 있습니다. 조용함이 낯설더라도 괜찮습니다. 침묵은 아무 말도 하지 못하는 시간이 아니라, 무엇이 소중한지 다시 들을 수 있는 시간입니다.',
  verse:'내 안에 머물러라. 나도 너희 안에 머무르겠다.', reference:'요한 15,4', url:'https://bible.cbck.or.kr/Knb/Jn/15',
  saint:'아빌라의 성녀 데레사', saintStory:'데레사 성녀는 기도를 하느님과의 친밀한 만남으로 가르쳤고, 「영혼의 성」에서 내면의 여정을 이야기했습니다. 고요함을 잘하는 사람이 되기보다, 사랑받는 사람으로 머물러 보세요.',
  question:'오늘 잠시 침묵한다면 내 안에서 가장 먼저 들려올 말은 무엇일까요?',
  prayer:'주님, 침묵이 두려운 순간에도 당신의 현존 안에 머무르게 하소서.'
 },
 '말씀': {
  opening:'답을 서두르지 않고 찾고 있는 당신에게',
  comfort:'질문이 많은 사람은 믿음이 부족한 사람이 아닙니다. 오히려 무엇을 믿고 어떻게 살아야 할지 진지하게 고민하는 사람일 수 있습니다. 오늘 모든 답을 얻지 않아도 괜찮습니다. 말씀 한 문장이 오래도록 삶을 비추기도 하니까요.',
  verse:'우리 마음이 타오르지 않았던가!', reference:'루카 24,32', url:'https://bible.cbck.or.kr/Knb/Lk/24',
  saint:'성 예로니모', saintStory:'예로니모 성인은 성경 연구와 번역에 깊이 헌신했습니다. 성경을 많이 아는 것 자체보다 그 말씀을 통해 그리스도를 더 알아 가는 길을 떠올려 보세요.',
  question:'요즘 내가 하느님께 꼭 여쭙고 싶은 질문 하나는 무엇인가요?',
  prayer:'주님, 제 질문을 피하지 않고 말씀 안에서 당신을 만나게 하소서.'
 },
 '관계': {
  opening:'사람들 사이에서 마음이 바빴을 당신에게',
  comfort:'누군가를 이해하려 애쓰는 동안 자신의 마음은 돌보지 못했을지도 모릅니다. 모든 관계를 당장 회복할 필요는 없습니다. 먼저 있는 그대로의 마음을 바라보고, 작은 친절 하나를 다시 선택해도 충분합니다.',
  verse:'서로 사랑하여라.', reference:'요한 13,34', url:'https://bible.cbck.or.kr/Knb/Jn/13',
  saint:'성 빈첸시오 아 바오로', saintStory:'빈첸시오 성인은 어려운 이웃을 돌보는 구체적인 사랑을 실천했습니다. 거창한 관계의 해답보다, 오늘 내 곁의 한 사람에게 건넬 작은 마음을 생각해 보세요.',
  question:'누구에게 좋은 사람이 되려 애쓰느라 내 마음을 놓쳤을까요?',
  prayer:'주님, 저와 이웃을 조금 더 부드러운 눈으로 바라보게 하소서.'
 },
 '자연': {
  opening:'바쁘게 걷다가 풍경을 놓쳤을 당신에게',
  comfort:'어디를 향해 가는지만 생각하다 보면 지금 발 딛고 선 땅을 잊기 쉽습니다. 잠깐 고개를 들고 바람을 느껴 보세요. 오늘은 멀리 가지 않아도, 작은 풍경 하나가 마음을 다시 열어 줄 수 있습니다.',
  verse:'잔잔한 물가로 나를 이끄시어', reference:'시편 23,2', url:'https://bible.cbck.or.kr/Knb/Ps/23',
  saint:'아시시의 성 프란치스코', saintStory:'프란치스코 성인은 피조물을 형제자매처럼 바라보며 창조주를 찬미했습니다. 주변 풍경을 소비할 대상이 아니라 함께 살아가는 선물로 바라보는 시간을 가져 보세요.',
  question:'내 마음이 편안해졌던 마지막 풍경은 어디였나요?',
  prayer:'주님, 당신께서 지으신 세상의 작은 아름다움을 다시 보게 하소서.'
 },
 '식별': {
  opening:'중요한 선택 앞에 서 있는 당신에게',
  comfort:'빨리 결정해야 한다는 말이 오히려 마음을 복잡하게 만들 수 있습니다. 아직 방향을 정하지 못했어도 괜찮습니다. 식별은 정답을 맞히는 시험이 아니라 마음의 움직임을 찬찬히 살피는 여정입니다.',
  verse:'당신 말씀은 제 발에 등불, 저의 길에 빛입니다.', reference:'시편 119,105', url:'https://bible.cbck.or.kr/Knb/Ps/119',
  saint:'로욜라의 성 이냐시오', saintStory:'이냐시오 성인은 자신의 삶을 돌아보며 마음의 움직임을 식별하는 길을 발전시켰습니다. 선택을 서두르기보다 무엇이 하느님과 이웃을 향한 자유를 넓히는지 살펴보세요.',
  question:'두려움이 없다면, 나는 어떤 선택을 조용히 바라보게 될까요?',
  prayer:'주님, 조급함보다 자유로움 안에서 한 걸음을 선택하게 하소서.'
 },
 '기도': {
  opening:'기도하고 싶은데 말이 떠오르지 않는 당신에게',
  comfort:'기도를 잘해야 한다는 부담 때문에 오히려 기도를 미루기도 합니다. 아무런 감흥이 없어도 괜찮습니다. 마음에 있는 한마디를 그대로 올려드리는 것에서 시작해 보세요. 하느님 앞에 머무는 시간은 성적표가 아닙니다.',
  verse:'끊임없이 기도하십시오.', reference:'1테살 5,17', url:'https://bible.cbck.or.kr/Knb/1Thes/5',
  saint:'소화 데레사 성녀', saintStory:'소화 데레사 성녀는 일상의 작은 사랑과 신뢰로 하느님께 나아가는 길을 보여 주었습니다. 오늘의 기도도 대단한 말보다 솔직한 마음에서 시작할 수 있습니다.',
  question:'지금 하느님께 가장 솔직하게 드리고 싶은 한마디는 무엇인가요?',
  prayer:'주님, 멋진 말이 없어도 제 마음을 있는 그대로 받아 주소서.'
 },
 '개인': {
  opening:'모두를 위해 시간을 내느라 나를 잊었을 당신에게',
  comfort:'많은 사람의 속도에 맞추느라 자신의 걸음은 늦춰 두지 않았나요? 잠시 혼자 있는 것은 누군가를 밀어내는 일이 아닙니다. 오롯한 시간 안에서 자신과 하느님을 다시 만날 수 있습니다. 무엇을 해내지 않는 시간도 소중합니다.',
  verse:'너희는 따로 외딴곳으로 가서 좀 쉬어라.', reference:'마르코 6,31', url:'https://bible.cbck.or.kr/Knb/Mk/6',
  saint:'성 샤를 드 푸코', saintStory:'샤를 드 푸코 성인은 나자렛의 숨은 삶과 기도를 깊이 사랑했고, 사하라에서 사람들의 형제가 되어 살고자 했습니다. 혼자 머무는 시간이 다시 누군가와 만날 힘을 기르는 시간일 수도 있습니다.',
  question:'누구의 기대도 없는 오늘, 나는 어떻게 나 자신을 돌보고 싶나요?',
  prayer:'주님, 제 걸음이 느리더라도 그 안에서 당신을 만나게 하소서.'
 }
};
// New everyday headings reuse the existing, sourced spiritual readings; they do not assign a tradition.
for(const [key,source] of Object.entries({'성찰':'말씀','경험':'자연','시작':'기도','열림':'쉼'}))spiritualGuides[key]={...spiritualGuides[source]};
const saintSources={"쉼": "https://bible.cbck.or.kr/Knb/Lk/10", "침묵": "https://www.vatican.va/content/benedict-xvi/en/audiences/2011/documents/hf_ben-xvi_aud_20110202.html", "말씀": "https://www.vatican.va/content/benedict-xvi/en/audiences/2007/documents/hf_ben-xvi_aud_20071107.html", "관계": "https://press.vatican.va/content/salastampa/en/bollettino/pubblico/2017/03/15/holy.html", "자연": "https://www.vatican.va/content/benedict-xvi/en/audiences/2010/documents/hf_ben-xvi_aud_20100127.html", "식별": "https://www.vatican.va/content/francesco/en/audiences/2022/documents/20220907-udienza-generale.html", "기도": "https://www.vatican.va/content/benedict-xvi/en/audiences/2011/documents/hf_ben-xvi_aud_20110406.html", "개인": "https://www.vatican.va/content/francesco/en/audiences/2023/documents/20231018-udienza-generale.html"};
for(const [key,source] of Object.entries({'성찰':'말씀','경험':'자연','시작':'기도','열림':'쉼'}))saintSources[key]=saintSources[source];

export {profiles,spiritualGuides,saintSources};
