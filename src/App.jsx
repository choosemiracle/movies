import React, { useState, useEffect, useRef } from 'react';
import { 
  Leaf, Map, Compass, Flower2, Archive, BookOpen, Users, ArrowRight, 
  MessageCircle, CheckCircle2, RefreshCcw, Sparkles, Info, Clock, 
  Trash2, Download, Layout, ClipboardCheck, Zap, Heart, DoorOpen, 
  Footprints, Lightbulb, Sprout, ChevronRight, ShieldCheck, Share2, Eye, ScrollText, 
  ChevronLeft, Ghost
} from 'lucide-react';

// --- 配置与常量 ---
const STORAGE_KEY = 'talent_courtyard_v3_data';

const THEME = {
  bg: '#F7F2E8',
  text: '#2F2F2A',
  secondary: '#7A7468',
  primary: '#7FA88B',
  primaryHover: '#5F8A72',
  card: '#EFE4D0',
  accent: '#C7A45D',
  border: '#DDD4C5',
  danger: '#B96A5B'
};

// --- 模拟逻辑引擎 ---
const generateInsightReport = (reflection) => {
  const contentCount = Object.values(reflection).filter(v => v.length > 5).length;
  if (contentCount === 0) return null;

  return {
    naturalAttention: "你似乎特别容易注意到人与事背后的结构、情绪和未被说出的线索。这种敏锐是你识别天赋的第一块基石。",
    energySource: "当你处于深度连接真实问题的时刻，你的生命力会显著上升。那种‘变亮’的感觉值得反复回味。",
    repeatedRole: "你在人群中可能自然承担着‘整理者’的角色，擅长在混乱中找到那个‘定心丸’。",
    deepConcern: "你对‘人是否能活得真实’有着近乎本能的关切。",
    suitableSoil: "你可能更适合有一定自由度、允许深度思考、重视真实表达的环境。",
    drainingEnvironment: "高度表演化、只讲效率不讲人的环境，可能会迅速消耗你的生命水分。",
    initialClue: "你的天赋线索可能与‘在复杂中帮助人重新找到方向’有关。",
    openQuestions: ["哪一个片段让你最想继续聊下去？", "这种抗拒的感觉，是在保护什么？", "你愿意为之停留的领域在哪里？"]
  };
};

const generateHypothesis = (insight) => {
  if (!insight) return null;
  return {
    lifeTheme: "在复杂与模糊中，看见结构，并帮助人重新找到方向。",
    clues: [
      { title: "整理复杂的能力", description: "自然地将零散信息结构化。", evidence: "来自你的高能时刻记录。", stillToVerify: "这件事是否长期带给你深度的宁静感。" },
      { title: "深度倾听的倾向", description: "愿意陪别人慢慢说清楚，而不是急着给建议。", evidence: "来自你反复承担的角色。", stillToVerify: "持续倾听后，你是被滋养还是被耗尽。" }
    ],
    possibleExpressions: ["咨询与引导", "写作与内容转译", "教育与共创工作坊", "社群陪伴"],
    unsuitableEnvironments: ["只执行不思考的系统", "形式主义组织"],
    livingQuestions: ["我最自然的贡献，是否一直被我低估了？", "我可以用什么小行动验证这份假设？"],
    gentleSummary: "天赋也许不是一个固定职业，而是一种在世界中回应问题的方式。请带着这份假设生活。"
  };
};

// --- 子组件：进度小径 ---
const LifeProgressPath = ({ currentStep }) => {
  const steps = [
    { id: 'L', label: '回听', icon: <DoorOpen size={16} /> },
    { id: 'I', label: '辨认', icon: <Footprints size={16} /> },
    { id: 'F', label: '假设', icon: <Lightbulb size={16} /> },
    { id: 'E', label: '验证', icon: <Sprout size={16} /> }
  ];

  return (
    <div className="flex items-center gap-3">
      {steps.map((step, idx) => (
        <React.Fragment key={step.id}>
          <div className={`flex flex-col items-center gap-1 transition-all duration-700 ${currentStep === step.id ? 'opacity-100 scale-110' : 'opacity-30'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === step.id ? 'bg-[#7FA88B] text-white shadow-md' : 'bg-[#DDD4C5] text-[#2F2F2A]'}`}>
              {step.icon}
            </div>
            <span className="text-[9px] font-bold text-[#7A7468]">{step.label}</span>
          </div>
          {idx < steps.length - 1 && <div className="h-[1px] w-4 bg-[#DDD4C5] mb-4"></div>}
        </React.Fragment>
      ))}
    </div>
  );
};

// --- 主应用组件 ---
export default function TalentCourtyard() {
  const [activeSection, setActiveSection] = useState('home'); 
  const [isExploring, setIsExploring] = useState(false); 
  const [lifeStep, setLifeStep] = useState('L'); 
  const [reflectionIndex, setReflectionIndex] = useState(0); // L阶段的具体问题索引

  const [reflection, setReflection] = useState({
    highEnergyMoment: '', childhoodClue: '', repeatedHelp: '', envyAndLonging: '', closedDoor: '', bodySignal: ''
  });
  const [insight, setInsight] = useState(null);
  const [hypothesis, setHypothesis] = useState(null);
  const [experiment, setExperiment] = useState({
    clueToTest: '', action: '', targetPersonOrContext: '', duration: '7 日', successSignal: '', nextAdjustment: ''
  });
  const [archive, setArchive] = useState([]);
  const [takeaway, setTakeaway] = useState('');

  const reflectionConfigs = [
    { key: 'highEnergyMoment', title: '高能时刻', sub: '回忆一个忘记时间、心里变亮的时刻。', q: '有什么时候，你觉得自己特别“活着”？', ph: '那时我正在……我感到……' },
    { key: 'childhoodClue', title: '童年线索', sub: '在没有太多功利考虑前，你喜欢做什么？', q: '小时候，你自然会靠近什么？', ph: '小时候，我常常会……' },
    { key: 'repeatedHelp', title: '他人反馈', sub: '别人来找你，常常是因为你身上的某种可靠。', q: '别人通常因为什么事来找你？', ph: '他们似乎相信我可以……' },
    { key: 'envyAndLonging', title: '羡慕与渴望', sub: '羡慕是一枚信号，指向未被承认的渴望。', q: '你最近一次真心羡慕别人，是因为什么？', ph: '我羡慕他可以……' },
    { key: 'closedDoor', title: '关闭之门', sub: '关闭不只是失败，也可能是某种转向。', q: '有没有一条路，很想走却没走成？', ph: '曾经有一条路是……' },
    { key: 'bodySignal', title: '身体知觉', sub: '身体比头脑更早知道方向。', q: '想到某些事，身体是变紧了还是放松了？', ph: '当我想到……我的呼吸变深了……' },
  ];

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setArchive(JSON.parse(saved));
  }, []);

  const startLifeDiscovery = () => {
    setIsExploring(true);
    setLifeStep('L');
    setReflectionIndex(0);
    const exploreSection = document.getElementById('explore-anchor');
    if (exploreSection) exploreSection.scrollIntoView({ behavior: 'smooth' });
  };

  const handleNextReflection = () => {
    if (reflectionIndex < reflectionConfigs.length - 1) {
      setReflectionIndex(reflectionIndex + 1);
    } else {
      const res = generateInsightReport(reflection);
      setInsight(res);
      setLifeStep('I');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const saveFullReport = () => {
    const newReport = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      reflection, insight, hypothesis, experiment, takeaway
    };
    const updated = [newReport, ...archive];
    setArchive(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setIsExploring(false);
    setActiveSection('archive');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- 导航栏 ---
  const Header = () => (
    <nav className="fixed top-0 w-full z-50 bg-[#F7F2E8]/90 backdrop-blur-md border-b border-[#DDD4C5] px-6 py-4 flex justify-between items-center">
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setIsExploring(false); setActiveSection('home'); }}>
        <div className="w-8 h-8 bg-[#7FA88B] rounded-full flex items-center justify-center">
          <Flower2 size={18} className="text-white" />
        </div>
        <h1 className="font-serif text-lg font-bold tracking-widest text-[#2F2F2A]">天赋小院</h1>
      </div>
      <div className="hidden md:flex gap-8 text-sm text-[#7A7468]">
        {['首页', '为什么不测试', '生命档案'].map((label, idx) => (
          <button 
            key={idx}
            onClick={() => { setIsExploring(false); setActiveSection(['home', 'why', 'archive'][idx]); }}
            className={`hover:text-[#2F2F2A] transition-colors ${!isExploring && activeSection === ['home', 'why', 'archive'][idx] ? 'text-[#2F2F2A] border-b border-[#C7A45D]' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>
      <button onClick={() => setActiveSection('archive')} className="p-2 text-[#7A7468] hover:text-[#7FA88B]"><Archive size={20}/></button>
    </nav>
  );

  const Hero = () => (
    <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-20">
      <div className="max-w-3xl space-y-8 animate-fade-in">
        <h2 className="text-4xl md:text-6xl font-serif leading-tight text-[#2F2F2A]">
          天赋，不是测出来的。<br />
          是在你的生命里，被慢慢听见的。
        </h2>
        <p className="text-lg md:text-xl text-[#7A7468] font-light max-w-2xl mx-auto leading-relaxed">
          这里不算命，不贴标签。我们陪你回看真实经历，听见内在的召唤。
        </p>
        <div className="flex justify-center pt-10">
          <button onClick={() => document.getElementById('life-model-section').scrollIntoView({ behavior: 'smooth' })} className="flex flex-col items-center gap-2 text-[#7A7468] hover:text-[#7FA88B] transition-all">
            <span className="text-xs tracking-[0.3em] uppercase">进入小院</span>
            <div className="w-0.5 h-12 bg-[#7FA88B]/40 rounded-full animate-bounce mt-2"/>
          </button>
        </div>
      </div>
    </section>
  );

  const LifeModelIntroduction = () => (
    <section id="life-model-section" className="py-24 px-6 border-y border-[#DDD4C5]/30 bg-white/20">
      <div className="max-w-4xl mx-auto space-y-16">
        <div className="text-center space-y-4">
          <h3 className="text-3xl font-serif">LIFE 天赋辨识模型</h3>
          <p className="text-[#7A7468]">不是测评，而是一次温和的生命回听。</p>
        </div>
        
        {!isExploring ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {['回听生命', '辨认线索', '形成假设', '小步验证'].map((step, idx) => (
              <div key={idx} className="p-6 bg-[#EFE4D0]/50 rounded-3xl border border-[#DDD4C5]/30 text-center space-y-2">
                <div className="text-xs font-bold text-[#7FA88B] opacity-50 mb-2">STEP 0{idx+1}</div>
                <h4 className="font-serif font-bold text-[#2F2F2A]">{step}</h4>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex justify-center">
            <LifeProgressPath currentStep={lifeStep} />
          </div>
        )}

        <div id="explore-anchor" className="flex justify-center pt-4">
          {!isExploring && (
            <button 
              onClick={startLifeDiscovery}
              className="px-12 py-5 bg-[#7FA88B] text-white rounded-full hover:bg-[#5F8A72] shadow-xl transition-all flex items-center gap-3 text-lg font-serif"
            >
              踏上探索小径 <ChevronRight size={20} />
            </button>
          )}
        </div>
      </div>
    </section>
  );

  // --- L阶段交互优化：步道卡片 ---
  const LifeReflectionWalking = () => {
    const config = reflectionConfigs[reflectionIndex];
    const progress = ((reflectionIndex + 1) / reflectionConfigs.length) * 100;

    return (
      <div className="max-w-2xl mx-auto py-12 space-y-12 animate-fade-in">
        <div className="relative p-10 md:p-14 bg-white rounded-[48px] border border-[#DDD4C5] shadow-sm space-y-8">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-[10px] text-[#C7A45D] font-bold tracking-widest uppercase">
              <span>{config.title}</span>
              <span>{reflectionIndex + 1} / {reflectionConfigs.length}</span>
            </div>
            <h4 className="text-2xl font-serif text-[#2F2F2A] leading-relaxed">{config.q}</h4>
            <p className="text-sm text-[#7A7468] font-light">{config.sub}</p>
          </div>

          <textarea 
            key={config.key}
            value={reflection[config.key]}
            onChange={(e) => setReflection({...reflection, [config.key]: e.target.value})}
            className="w-full h-48 p-6 bg-[#F7F2E8]/50 border-none rounded-[32px] text-base leading-relaxed outline-none focus:ring-2 focus:ring-[#7FA88B]/20 transition-all resize-none font-light"
            placeholder={config.ph}
          />

          <div className="flex items-center justify-between gap-4 pt-4">
            <button 
              disabled={reflectionIndex === 0}
              onClick={() => setReflectionIndex(reflectionIndex - 1)}
              className={`p-4 rounded-full border border-[#DDD4C5] text-[#7A7468] transition-all ${reflectionIndex === 0 ? 'opacity-20' : 'hover:bg-[#F7F2E8]'}`}
            >
              <ChevronLeft size={20} />
            </button>
            
            <div className="flex-1 h-1 bg-[#F7F2E8] rounded-full overflow-hidden">
              <div className="h-full bg-[#7FA88B] transition-all duration-700" style={{ width: `${progress}%` }} />
            </div>

            <button 
              onClick={handleNextReflection}
              className="px-8 py-4 bg-[#7FA88B] text-white rounded-full flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
            >
              {reflectionIndex === reflectionConfigs.length - 1 ? '完成回听' : '下一步'} <ChevronRight size={18} />
            </button>
          </div>

          <button 
            onClick={handleNextReflection}
            className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-xs text-[#7A7468] hover:text-[#2F2F2A] border-b border-transparent hover:border-[#7A7468] transition-all py-1"
          >
            暂时没想起什么，跳过这一步
          </button>
        </div>

        {/* 拾遗脚印反馈 */}
        <div className="flex justify-center gap-3 pt-6">
          {reflectionConfigs.map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full transition-all duration-500 ${i <= reflectionIndex ? 'bg-[#7FA88B]' : 'bg-[#DDD4C5]/40'}`} />
          ))}
        </div>
      </div>
    );
  };

  const InsightArea = () => (
    <div className="max-w-4xl mx-auto py-12 space-y-12 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(insight).filter(([k])=>k!=='openQuestions').map(([k,v]) => (
          <div key={k} className="p-10 bg-white border border-[#DDD4C5] rounded-[40px] space-y-3 hover:shadow-md transition-shadow">
            <span className="text-[10px] font-bold text-[#C7A45D] uppercase tracking-[0.2em]">初步观察</span>
            <p className="text-sm leading-relaxed text-[#2F2F2A] font-light">{v}</p>
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-4">
        <button onClick={() => { setLifeStep('L'); setReflectionIndex(5); }} className="px-10 py-4 border border-[#7A7468] text-[#7A7468] rounded-full">返回修改</button>
        <button onClick={handleIToF} className="px-10 py-4 bg-[#7FA88B] text-white rounded-full shadow-lg">有共鸣，形成假设</button>
      </div>
    </div>
  );

  const HypothesisArea = () => (
    <div className="max-w-3xl mx-auto py-12 space-y-12 animate-fade-in">
      <div className="p-12 bg-white rounded-[60px] border-2 border-[#C7A45D]/20 space-y-10 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#F7F2E8] rounded-full -mr-16 -mt-16 opacity-50" />
        <div className="space-y-4">
          <span className="text-xs font-bold text-[#C7A45D] tracking-widest uppercase">生命主题假设</span>
          <h4 className="text-3xl font-serif leading-relaxed text-[#2F2F2A] border-l-8 border-[#C7A45D] pl-8">
            {hypothesis.lifeTheme}
          </h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-4">
            <p className="font-bold text-[#7FA88B] text-sm tracking-widest uppercase">可能表达方式</p>
            <ul className="space-y-3 text-sm font-light">
              {hypothesis.possibleExpressions.map((e,i)=><li key={i} className="flex items-center gap-3"><div className="w-1.5 h-1.5 bg-[#7FA88B] rounded-full opacity-40"/>{e}</li>)}
            </ul>
          </div>
          <div className="space-y-4">
            <p className="font-bold text-[#B96A5B] text-sm tracking-widest uppercase">带走三个问题</p>
            <ul className="space-y-3 italic text-sm text-[#7A7468] font-light">
              {hypothesis.livingQuestions.map((q,i)=><li key={i}>· {q}</li>)}
            </ul>
          </div>
        </div>
      </div>
      <div className="flex justify-center">
        <button onClick={()=>setLifeStep('E')} className="px-12 py-5 bg-[#7FA88B] text-white rounded-full shadow-xl text-lg">开始小步验证</button>
      </div>
    </div>
  );

  const ExperimentArea = () => (
    <div className="max-w-3xl mx-auto py-12 space-y-12 animate-fade-in">
      <div className="bg-white p-12 rounded-[50px] border border-[#DDD4C5] space-y-10 shadow-sm">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#7A7468] uppercase tracking-widest">验证线索</label>
            <input value={experiment.clueToTest} onChange={(e)=>setExperiment({...experiment, clueToTest:e.target.value})} className="w-full p-4 bg-[#F7F2E8] rounded-2xl border-none outline-none text-sm" placeholder="例如：我可能擅长把复杂问题讲清楚。"/>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#7A7468] uppercase tracking-widest">小实验行动</label>
            <textarea value={experiment.action} onChange={(e)=>setExperiment({...experiment, action:e.target.value})} className="w-full h-32 p-4 bg-[#F7F2E8] rounded-2xl border-none outline-none text-sm resize-none" placeholder="例如：写一篇短文，下周三发给三位朋友听。"/>
          </div>
          <div className="pt-8 space-y-4">
            <label className="text-sm font-bold text-[#2F2F2A] font-serif">此刻我想对自己说的一句话</label>
            <input value={takeaway} onChange={(e)=>setTakeaway(e.target.value)} className="w-full p-4 border-b border-[#DDD4C5] text-2xl italic outline-none font-serif bg-transparent text-[#7FA88B]" placeholder="在这里写下你的生命声音..."/>
          </div>
        </div>
      </div>
      <div className="flex justify-center">
        <button onClick={saveFullReport} className="px-14 py-5 bg-[#7FA88B] text-white rounded-full shadow-2xl text-xl font-serif">保存到我的生命档案</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F2E8] text-[#2F2F2A] font-sans selection:bg-[#7FA88B]/20">
      <Header />
      <main>
        {activeSection === 'home' && (
          <div>
            <Hero />
            <LifeModelIntroduction />
            {isExploring && (
              <div id="life-exploration-area" className="bg-gradient-to-b from-white/20 to-transparent">
                {lifeStep === 'L' && <LifeReflectionWalking />}
                {lifeStep === 'I' && <InsightArea />}
                {lifeStep === 'F' && <HypothesisArea />}
                {lifeStep === 'E' && <ExperimentArea />}
              </div>
            )}
            <section className="py-24 px-6 text-center space-y-8 max-w-2xl mx-auto">
              <h3 className="text-2xl font-serif">为什么要做这件事？</h3>
              <p className="text-sm text-[#7A7468] leading-relaxed font-light">
                因为很多时候，我们太忙着回应世界，忘了回听自己。<br/>
                天赋不是一种奖赏，而是一种由于你的存在而自然产生的贡献。
              </p>
              <div className="flex justify-center gap-4 text-[#C7A45D] opacity-40">
                <Leaf size={24} /> <Flower2 size={24} /> <Compass size={24} />
              </div>
            </section>
          </div>
        )}
        {activeSection === 'archive' && <ArchiveView archive={archive} setArchive={setArchive} />}
      </main>
      <footer className="py-20 border-t border-[#DDD4C5] text-center text-[10px] text-[#7A7468] tracking-[0.5em] uppercase">
        天赋小院 · 让生命发声
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700&family=Noto+Sans+SC:wght@300;400;700&display=swap');
        body { font-family: 'Noto Sans SC', sans-serif; background-color: #F7F2E8; overflow-x: hidden; }
        h1, h2, h3, h4, h5, h6, .font-serif { font-family: 'Noto Serif SC', serif; }
        .animate-fade-in { animation: fadeIn 1.2s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
    </div>
  );
}

const ArchiveView = ({ archive, setArchive }) => (
  <section className="py-24 px-6 max-w-4xl mx-auto animate-fade-in min-h-screen">
    <div className="flex justify-between items-end border-b pb-8 mb-12">
      <h3 className="text-3xl font-serif">我的生命档案</h3>
      <button onClick={()=>{localStorage.removeItem(STORAGE_KEY); setArchive([]);}} className="text-xs text-[#B96A5B] flex items-center gap-1 hover:underline"><Trash2 size={14}/> 清空档案</button>
    </div>
    {archive.length === 0 ? (
      <div className="text-center py-32 opacity-20 flex flex-col items-center gap-6">
        <Archive size={64}/>
        <p className="font-serif text-xl tracking-widest">目前还没有留下脚印</p>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {archive.map((entry, idx) => (
          <div key={idx} className="p-10 bg-white border border-[#DDD4C5] rounded-[48px] space-y-6 hover:shadow-xl transition-all">
            <div className="flex justify-between items-center text-[10px] font-bold text-[#C7A45D] tracking-widest">
              <span>{entry.date}</span>
              <span className="px-2 py-0.5 bg-[#7FA88B]/10 text-[#7FA88B] rounded">LIFE</span>
            </div>
            <h4 className="text-xl font-serif italic border-l-4 border-[#7FA88B] pl-4">“{entry.hypothesis?.lifeTheme || '探索中的生命主题'}”</h4>
            <div className="pt-4 space-y-2">
              <p className="text-[9px] uppercase text-[#7A7468] font-bold">带走的话</p>
              <p className="text-xs italic text-[#2F2F2A]">{entry.takeaway || '未留下感言'}</p>
            </div>
          </div>
        ))}
      </div>
    )}
  </section>
);

