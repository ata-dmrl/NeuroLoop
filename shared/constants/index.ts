import type { GameId, GameMeta, SkillCategory, SkillId } from '../types';

export const DIFFICULTY_MIN = 1;
export const DIFFICULTY_MAX = 100;
export const DIFFICULTY_START = 50;
export const MAX_SCORE = 1000;

export interface CategoryDef {
  id: SkillCategory;
  label: string;
  description: string;
  /** Kategori skoruna katkı yapan alt beceriler ve ağırlıkları (veri olanlar üzerinden yeniden normalize edilir). */
  skills: { id: SkillId; weight: number }[];
  /** Panoda gösterilsin mi (oyunu olan kategoriler). */
  onDashboard: boolean;
}

export const SKILL_LABELS: Record<SkillId, string> = {
  'working-memory': 'Çalışma belleği',
  'visual-memory': 'Görsel bellek',
  'spatial-memory': 'Uzamsal bellek',
  recall: 'Hatırlama',
  'selective-attention': 'Seçici dikkat',
  'divided-attention': 'Bölünmüş dikkat',
  'sustained-attention': 'Sürdürülebilir dikkat',
  'visual-attention': 'Görsel dikkat',
  'reaction-speed': 'Tepki hızı',
  'processing-speed': 'İşlem hızı',
  'visual-processing': 'Görsel işleme',
  'task-switching': 'Görev değiştirme',
  'rule-switching': 'Kural değiştirme',
  'response-inhibition': 'Tepki baskılama',
  logic: 'Mantık',
  planning: 'Planlama',
  'pattern-recognition': 'Örüntü tanıma',
  deduction: 'Tümdengelim',
  'sequence-recognition': 'Dizi tanıma',
  'spatial-reasoning': 'Uzamsal akıl yürütme',
  'mental-calculation': 'Zihinden hesaplama',
  estimation: 'Tahmin',
  'numerical-reasoning': 'Sayısal akıl yürütme',
  'word-recognition': 'Kelime tanıma',
  vocabulary: 'Kelime dağarcığı',
  'verbal-fluency': 'Sözel akıcılık',
};

export const CATEGORIES: Record<SkillCategory, CategoryDef> = {
  memory: {
    id: 'memory',
    label: 'Hafıza',
    description: 'Bilgiyi kısa süre aklında tutma ve geri çağırma.',
    skills: [
      { id: 'working-memory', weight: 0.4 },
      { id: 'spatial-memory', weight: 0.3 },
      { id: 'recall', weight: 0.3 },
    ],
    onDashboard: true,
  },
  attention: {
    id: 'attention',
    label: 'Dikkat',
    description: 'Önemliyi seçme, dikkatini bölme ve sürdürme.',
    skills: [
      { id: 'selective-attention', weight: 0.4 },
      { id: 'divided-attention', weight: 0.4 },
      { id: 'sustained-attention', weight: 0.1 },
      { id: 'visual-attention', weight: 0.1 },
    ],
    onDashboard: true,
  },
  speed: {
    id: 'speed',
    label: 'Hız',
    description: 'Bilgiyi ne kadar çabuk işlediğin ve tepki verdiğin.',
    skills: [
      { id: 'processing-speed', weight: 0.5 },
      { id: 'reaction-speed', weight: 0.3 },
      { id: 'visual-processing', weight: 0.2 },
    ],
    onDashboard: true,
  },
  flexibility: {
    id: 'flexibility',
    label: 'Esneklik',
    description: 'Kurallar değişince hızlıca uyum sağlama.',
    skills: [
      { id: 'rule-switching', weight: 0.4 },
      { id: 'task-switching', weight: 0.35 },
      { id: 'response-inhibition', weight: 0.25 },
    ],
    onDashboard: true,
  },
  'problem-solving': {
    id: 'problem-solving',
    label: 'Problem çözme',
    description: 'Mantık, planlama ve örüntü bulma.',
    skills: [
      { id: 'logic', weight: 0.4 },
      { id: 'planning', weight: 0.3 },
      { id: 'pattern-recognition', weight: 0.3 },
    ],
    onDashboard: false,
  },
  reasoning: {
    id: 'reasoning',
    label: 'Akıl yürütme',
    description: 'Dizilerdeki ve örüntülerdeki kuralı çıkarma.',
    skills: [
      { id: 'sequence-recognition', weight: 0.5 },
      { id: 'deduction', weight: 0.25 },
      { id: 'spatial-reasoning', weight: 0.25 },
    ],
    onDashboard: true,
  },
  math: {
    id: 'math',
    label: 'Matematik',
    description: 'Zihinden hızlı ve doğru hesaplama.',
    skills: [
      { id: 'mental-calculation', weight: 0.6 },
      { id: 'numerical-reasoning', weight: 0.2 },
      { id: 'estimation', weight: 0.2 },
    ],
    onDashboard: true,
  },
  language: {
    id: 'language',
    label: 'Dil',
    description: 'Kelime tanıma ve sözel akıcılık.',
    skills: [
      { id: 'word-recognition', weight: 0.4 },
      { id: 'vocabulary', weight: 0.3 },
      { id: 'verbal-fluency', weight: 0.3 },
    ],
    onDashboard: true,
  },
};

export const CATEGORY_ORDER: SkillCategory[] = [
  'memory',
  'attention',
  'speed',
  'flexibility',
  'reasoning',
  'math',
  'language',
  'problem-solving',
];

/** Oyun kayıt defteri — meta bilgiler. Oyun bileşenleri client/src/games altında. */
export const GAME_META: Record<GameId, GameMeta> = {
  'memory-grid': {
    id: 'memory-grid',
    name: 'Memory Grid',
    tagline: 'Parlayan hücreleri aklında tut.',
    description:
      'Bir ızgarada kısa süre parlayan hücreleri izle, ışıklar sönünce aynı hücreleri işaretle.',
    category: 'memory',
    primarySkill: 'spatial-memory',
    secondarySkills: ['working-memory'],
    estimatedSeconds: 75,
    measuresReaction: false,
  },
  'symbol-match': {
    id: 'symbol-match',
    name: 'Symbol Match',
    tagline: 'Hedefi bul, hemen seç.',
    description:
      'Ekranın üstündeki hedef sembolle birebir aynı olanı seçeneklerin arasından mümkün olduğunca hızlı seç.',
    category: 'speed',
    primarySkill: 'processing-speed',
    secondarySkills: ['reaction-speed', 'visual-attention'],
    estimatedSeconds: 50,
    measuresReaction: true,
  },
  'distractor-field': {
    id: 'distractor-field',
    name: 'Distractor Field',
    tagline: 'Kalabalığın içinde hedefi yakala.',
    description: 'Birbirine benzeyen onlarca sembolün arasından hedef sembolü bul ve dokun.',
    category: 'attention',
    primarySkill: 'selective-attention',
    secondarySkills: ['visual-attention'],
    estimatedSeconds: 70,
    measuresReaction: true,
  },
  'rule-switch': {
    id: 'rule-switch',
    name: 'Rule Switch',
    tagline: 'Kural değişti — hızlı uyum sağla.',
    description:
      'Üstteki kurala göre doğru kartı seç. Kural haber verilmeden değişir; eski kuralı bırakıp yenisine geç.',
    category: 'flexibility',
    primarySkill: 'rule-switching',
    secondarySkills: ['response-inhibition', 'task-switching'],
    estimatedSeconds: 55,
    measuresReaction: true,
  },
  'pattern-sequence': {
    id: 'pattern-sequence',
    name: 'Pattern Sequence',
    tagline: 'Sıradaki ne olmalı?',
    description: 'Sayı ve şekil dizilerindeki gizli kuralı çöz, eksik elemanı seç.',
    category: 'reasoning',
    primarySkill: 'sequence-recognition',
    secondarySkills: ['pattern-recognition', 'logic'],
    estimatedSeconds: 90,
    measuresReaction: true,
  },
  'quick-calc': {
    id: 'quick-calc',
    name: 'Quick Calc',
    tagline: 'Zihinden hızlı hesap.',
    description: 'Kısa aritmetik işlemleri kağıtsız çöz. Doğruluk ve hız birlikte puanlanır.',
    category: 'math',
    primarySkill: 'mental-calculation',
    secondarySkills: ['numerical-reasoning'],
    estimatedSeconds: 60,
    measuresReaction: true,
  },
  'dual-task': {
    id: 'dual-task',
    name: 'Dual Task',
    tagline: 'İki akışı aynı anda izle.',
    description:
      'Solda kırmızı üçgen çıkınca BOŞLUK, sağda çift sayı çıkınca ENTER. İkisini aynı anda takip et.',
    category: 'attention',
    primarySkill: 'divided-attention',
    secondarySkills: ['sustained-attention', 'processing-speed'],
    estimatedSeconds: 65,
    measuresReaction: true,
  },
  'recall-chain': {
    id: 'recall-chain',
    name: 'Recall Chain',
    tagline: 'Zinciri sırasıyla tekrarla.',
    description:
      'Tek tek gösterilen sembol dizisini izle, sonra aynı sırayla gir. Her başarılı turda zincir uzar.',
    category: 'memory',
    primarySkill: 'working-memory',
    secondarySkills: ['recall'],
    estimatedSeconds: 90,
    measuresReaction: false,
  },
  'color-clash': {
    id: 'color-clash',
    name: 'Color Clash',
    tagline: 'Rengin adını değil rengini söyle!',
    description:
      'Ekrandaki kelimenin yazıldığı RENGI seç — kelimenin anlamı seni yanıltmasın. Klasik Stroop testi.',
    category: 'flexibility',
    primarySkill: 'response-inhibition',
    secondarySkills: ['selective-attention', 'processing-speed'],
    estimatedSeconds: 55,
    measuresReaction: true,
  },
  'word-bubble': {
    id: 'word-bubble',
    name: 'Word Bubble',
    tagline: 'Kategoriyi bul, balonu patlat!',
    description:
      'Ekranda yükselen balonlarda kelimeler var. Verilen kategoriye uyan kelimelerin balonunu hızlıca patlat. Yanlış balona dokunursan puan kaybedersin.',
    category: 'language',
    primarySkill: 'verbal-fluency',
    secondarySkills: ['word-recognition', 'selective-attention'],
    estimatedSeconds: 60,
    measuresReaction: true,
  },
  'number-flow': {
    id: 'number-flow',
    name: 'Number Flow',
    tagline: 'N adım önceki sayıyı hatırla.',
    description:
      'Her turda yeni bir sayı gösterilir. Eğer bu sayı, N tur öncekiyle aynıysa Eşleşti butonuna bas. N-Back çalışma belleği egzersizi.',
    category: 'memory',
    primarySkill: 'working-memory',
    secondarySkills: ['visual-memory', 'sustained-attention'],
    estimatedSeconds: 80,
    measuresReaction: true,
  },
};

export const GAME_IDS = Object.keys(GAME_META) as GameId[];
