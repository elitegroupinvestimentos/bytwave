import { useEffect, useState } from 'react';

export type Lang = 'pt' | 'en' | 'es' | 'zh' | 'fr';

export const LANGUAGES: { code: Lang; label: string; flag: string }[] = [
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
];

const STORAGE_KEY = 'bytwave:lang';

// ─────────────────────────────────────────────────────────────
// Dicionário. Chaves em pt (mais comum no projeto). Cada idioma
// preenche o que tiver; a função t() faz fallback pra chave bruta.
// ─────────────────────────────────────────────────────────────
const DICT: Record<Lang, Record<string, string>> = {
  pt: {},
  en: {
    // ── Landing hero ────────────────────────────────────────────
    'Onde a precisão encontra seu limite': 'Where precision finds its edge',
    'e a visão reescreve o que vem a seguir': 'and vision rewrites what comes next',
    'uma ponte fluida — onde ambição bruta': 'a seamless bridge — where raw ambition',
    'e a clareza da máquina convergem como uma só': 'and machine clarity converge as one',
    'Veja em ação': 'Watch it unfold',
    'Entrar na lista': 'Join the wait',
    'Entrar': 'Sign in',
    // ── Landing nav ─────────────────────────────────────────────
    'Plataforma': 'Platform',
    'Como funciona': 'How it works',
    'Defesa IA': 'AI Defense',
    'Conexões': 'Connections',
    'Insights': 'Insights',

    'Dashboard': 'Dashboard',
    'Menu': 'Menu',
    'Estatísticas': 'Statistics',
    'Marketing': 'Marketing',
    'Config': 'Config',
    'Finance': 'Finance',
    'Transações': 'Transactions',
    'Configurações': 'Settings',
    'Créditos': 'Credits',
    'Tokens': 'Credits',
    'Sair': 'Log out',
    'Comprar Tokens': 'Buy Credits',
    'Comprar': 'Buy',
    'Histórico de Posições Fechadas': 'Closed Positions History',
    'Lucro Realizado': 'Realized Profit',
    'total encerrado': 'total closed',
    'Lucro não realizado': 'Unrealized profit',
    'em andamento': 'in progress',
    'DCAs Exec.': 'DCAs Exec.',
    'safety orders': 'safety orders',
    'Saldo Binance': 'Binance Balance',
    'Nenhuma posição fechada ainda.': 'No closed positions yet.',
    'Tokens / pacotes': 'Credits / packs',
    'Histórico de operações': 'Operation history',
    'Voltar ao dashboard': 'Back to dashboard',
    'Salvar gerenciamento': 'Save management',
    'Aplicar modalidade': 'Apply mode',
    'Modalidade do bot': 'Bot mode',
    'Escolha a modalidade': 'Choose the mode',
    'Conservador': 'Conservative',
    'Agressivo': 'Aggressive',
    'Mais segurança e menor exposição': 'More safety, less exposure',
    'Mais rentabilidade e maior exposição': 'More profitability, more exposure',
    'Ativo': 'Asset',
    'Banca detectada (Binance)': 'Detected balance (Binance)',
    'Limite de Drawdown': 'Drawdown Limit',
    'Operando normalmente': 'Operating normally',
    'Bot pausado por proteção de Drawdown': 'Bot paused — drawdown protection',
    'Salvar proteção': 'Save protection',
    'Re-armar': 'Re-arm',
    'Chaves Binance': 'Binance Keys',
    'Salva': 'Saved',
    'Chave salva e ativa': 'Active key saved',
  },
  es: {
    'Onde a precisão encontra seu limite': 'Donde la precisión encuentra su límite',
    'e a visão reescreve o que vem a seguir': 'y la visión reescribe lo que viene',
    'uma ponte fluida — onde ambição bruta': 'un puente fluido — donde la ambición pura',
    'e a clareza da máquina convergem como uma só': 'y la claridad de la máquina convergen como una',
    'Veja em ação': 'Verlo en acción',
    'Entrar na lista': 'Únete a la lista',
    'Entrar': 'Entrar',
    'Plataforma': 'Plataforma',
    'Como funciona': 'Cómo funciona',
    'Defesa IA': 'Defensa IA',
    'Conexões': 'Conexiones',
    'Insights': 'Insights',

    'Dashboard': 'Panel',
    'Menu': 'Menú',
    'Estatísticas': 'Estadísticas',
    'Marketing': 'Marketing',
    'Config': 'Config',
    'Finance': 'Finanzas',
    'Transações': 'Transacciones',
    'Configurações': 'Ajustes',
    'Créditos': 'Créditos',
    'Tokens': 'Créditos',
    'Sair': 'Salir',
    'Comprar Tokens': 'Comprar créditos',
    'Comprar': 'Comprar',
    'Histórico de Posições Fechadas': 'Historial de posiciones cerradas',
    'Lucro Realizado': 'Beneficio realizado',
    'total encerrado': 'total cerrado',
    'Lucro não realizado': 'Beneficio no realizado',
    'em andamento': 'en curso',
    'DCAs Exec.': 'DCAs Ejec.',
    'safety orders': 'órdenes de seguridad',
    'Saldo Binance': 'Saldo Binance',
    'Nenhuma posição fechada ainda.': 'Aún no hay posiciones cerradas.',
    'Tokens / pacotes': 'Créditos / paquetes',
    'Histórico de operações': 'Historial de operaciones',
    'Voltar ao dashboard': 'Volver al panel',
    'Salvar gerenciamento': 'Guardar gestión',
    'Aplicar modalidade': 'Aplicar modalidad',
    'Modalidade do bot': 'Modalidad del bot',
    'Escolha a modalidade': 'Elige la modalidad',
    'Conservador': 'Conservador',
    'Agressivo': 'Agresivo',
    'Mais segurança e menor exposição': 'Más seguridad y menor exposición',
    'Mais rentabilidade e maior exposição': 'Más rentabilidad y mayor exposición',
    'Ativo': 'Activo',
    'Banca detectada (Binance)': 'Saldo detectado (Binance)',
    'Limite de Drawdown': 'Límite de Drawdown',
    'Operando normalmente': 'Operando normalmente',
    'Bot pausado por proteção de Drawdown': 'Bot pausado — protección de drawdown',
    'Salvar proteção': 'Guardar protección',
    'Re-armar': 'Re-armar',
    'Chaves Binance': 'Claves Binance',
    'Salva': 'Guardada',
    'Chave salva e ativa': 'Clave guardada y activa',
  },
  zh: {
    'Onde a precisão encontra seu limite': '精准在此找到边界',
    'e a visão reescreve o que vem a seguir': '远见重塑未来',
    'uma ponte fluida — onde ambição bruta': '一座无缝桥梁——纯粹的野心',
    'e a clareza da máquina convergem como uma só': '与机器的清晰合为一体',
    'Veja em ação': '观看演示',
    'Entrar na lista': '加入等候',
    'Entrar': '登录',
    'Plataforma': '平台',
    'Como funciona': '运作方式',
    'Defesa IA': 'AI 防御',
    'Conexões': '连接',
    'Insights': '洞察',

    'Dashboard': '仪表盘',
    'Menu': '菜单',
    'Estatísticas': '统计',
    'Marketing': '营销',
    'Config': '设置',
    'Finance': '财务',
    'Transações': '交易',
    'Configurações': '设置',
    'Créditos': '点数',
    'Tokens': '点数',
    'Sair': '退出',
    'Comprar Tokens': '购买点数',
    'Comprar': '购买',
    'Histórico de Posições Fechadas': '已平仓历史',
    'Lucro Realizado': '已实现利润',
    'total encerrado': '已平仓总额',
    'Lucro não realizado': '未实现利润',
    'em andamento': '进行中',
    'DCAs Exec.': '已执行DCA',
    'safety orders': '安全订单',
    'Saldo Binance': '币安余额',
    'Nenhuma posição fechada ainda.': '尚无已平仓位。',
    'Tokens / pacotes': '点数 / 套餐',
    'Histórico de operações': '操作历史',
    'Voltar ao dashboard': '返回仪表盘',
    'Salvar gerenciamento': '保存管理',
    'Aplicar modalidade': '应用模式',
    'Modalidade do bot': '机器人模式',
    'Escolha a modalidade': '选择模式',
    'Conservador': '保守',
    'Agressivo': '激进',
    'Mais segurança e menor exposição': '更安全,更低风险',
    'Mais rentabilidade e maior exposição': '更高收益,更高风险',
    'Ativo': '资产',
    'Banca detectada (Binance)': '检测到的余额(币安)',
    'Limite de Drawdown': '回撤限制',
    'Operando normalmente': '正常运行',
    'Bot pausado por proteção de Drawdown': '机器人因回撤保护暂停',
    'Salvar proteção': '保存保护',
    'Re-armar': '重新启用',
    'Chaves Binance': '币安密钥',
    'Salva': '已保存',
    'Chave salva e ativa': '密钥已保存并启用',
  },
  fr: {
    'Onde a precisão encontra seu limite': 'Là où la précision trouve son tranchant',
    'e a visão reescreve o que vem a seguir': 'et la vision réécrit ce qui suit',
    'uma ponte fluida — onde ambição bruta': 'un pont fluide — où l’ambition brute',
    'e a clareza da máquina convergem como uma só': 'et la clarté de la machine convergent',
    'Veja em ação': 'Voir en action',
    'Entrar na lista': 'Rejoindre la liste',
    'Entrar': 'Connexion',
    'Plataforma': 'Plateforme',
    'Como funciona': 'Comment ça marche',
    'Defesa IA': 'Défense IA',
    'Conexões': 'Connexions',
    'Insights': 'Insights',

    'Dashboard': 'Tableau de bord',
    'Menu': 'Menu',
    'Estatísticas': 'Statistiques',
    'Marketing': 'Marketing',
    'Config': 'Config',
    'Finance': 'Finance',
    'Transações': 'Transactions',
    'Configurações': 'Paramètres',
    'Créditos': 'Crédits',
    'Tokens': 'Crédits',
    'Sair': 'Déconnexion',
    'Comprar Tokens': 'Acheter des crédits',
    'Comprar': 'Acheter',
    'Histórico de Posições Fechadas': 'Historique des positions fermées',
    'Lucro Realizado': 'Profit réalisé',
    'total encerrado': 'total clôturé',
    'Lucro não realizado': 'Profit latent',
    'em andamento': 'en cours',
    'DCAs Exec.': 'DCA exéc.',
    'safety orders': 'ordres de sécurité',
    'Saldo Binance': 'Solde Binance',
    'Nenhuma posição fechada ainda.': 'Aucune position fermée pour le moment.',
    'Tokens / pacotes': 'Crédits / packs',
    'Histórico de operações': 'Historique des opérations',
    'Voltar ao dashboard': 'Retour au tableau de bord',
    'Salvar gerenciamento': 'Enregistrer la gestion',
    'Aplicar modalidade': 'Appliquer le mode',
    'Modalidade do bot': 'Mode du bot',
    'Escolha a modalidade': 'Choisissez le mode',
    'Conservador': 'Conservateur',
    'Agressivo': 'Agressif',
    'Mais segurança e menor exposição': 'Plus de sécurité, moins d’exposition',
    'Mais rentabilidade e maior exposição': 'Plus de rentabilité, plus d’exposition',
    'Ativo': 'Actif',
    'Banca detectada (Binance)': 'Solde détecté (Binance)',
    'Limite de Drawdown': 'Limite de Drawdown',
    'Operando normalmente': 'Fonctionnement normal',
    'Bot pausado por proteção de Drawdown': 'Bot en pause — protection drawdown',
    'Salvar proteção': 'Enregistrer la protection',
    'Re-armar': 'Réarmer',
    'Chaves Binance': 'Clés Binance',
    'Salva': 'Enregistrée',
    'Chave salva e ativa': 'Clé enregistrée et active',
  },
};

// ─────────────────────────────────────────────────────────────
// Estado global + listeners (singleton em memória).
// ─────────────────────────────────────────────────────────────
function readInitial(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'pt' || v === 'en' || v === 'es' || v === 'zh' || v === 'fr') return v;
  } catch {
    // ignore
  }
  return 'pt';
}

let currentLang: Lang = readInitial();
const listeners = new Set<() => void>();

export function getLang(): Lang {
  return currentLang;
}

export function setLang(lang: Lang) {
  if (currentLang === lang) return;
  currentLang = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // ignore
  }
  for (const l of listeners) l();
}

export function translate(key: string, lang: Lang = currentLang): string {
  return DICT[lang]?.[key] ?? key;
}

export function useI18n() {
  const [, force] = useState(0);
  useEffect(() => {
    const update = () => force((x) => x + 1);
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, []);
  return {
    lang: currentLang,
    setLang,
    t: (key: string) => translate(key, currentLang),
  };
}
