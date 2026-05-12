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
    'Dashboard': 'Dashboard',
    'Menu': 'Menu',
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
    'Como funciona': 'How it works',
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
    'Dashboard': 'Panel',
    'Menu': 'Menú',
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
    'Como funciona': 'Cómo funciona',
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
    'Dashboard': '仪表盘',
    'Menu': '菜单',
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
    'Como funciona': '如何运作',
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
    'Dashboard': 'Tableau de bord',
    'Menu': 'Menu',
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
    'Como funciona': 'Comment ça marche',
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
