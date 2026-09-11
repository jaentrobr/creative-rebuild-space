/** Traduz erros do banco/autenticação em mensagens amigáveis, sem detalhe técnico. */

const AUTH_MAP: Array<[RegExp, string]> = [
  [/invalid login credentials/i, "E-mail ou senha incorretos."],
  [/email not confirmed/i, "Confirme seu e-mail para continuar."],
  [/user already registered|already been registered/i, "Este e-mail já está cadastrado."],
  [/password.*(short|least)/i, "A senha precisa ter pelo menos 8 caracteres."],
  [/token has expired|expired/i, "O código expirou. Peça um novo."],
  [/invalid.*(otp|token|code)/i, "Código inválido. Confira e tente de novo."],
  [/captcha/i, "Confirme que você não é um robô e tente de novo."],
  [/rate limit|too many/i, "Muitas tentativas. Aguarde um instante e tente de novo."],
  [/network|fetch failed|failed to fetch/i, "Sem conexão. Verifique sua internet e tente de novo."],
];

const DB_MAP: Array<[RegExp, string]> = [
  [/duplicate key|already exists|unique/i, "Esse registro já existe."],
  [/violates row-level security|permission denied|not authorized|jwt/i, "Você não tem permissão para isso."],
  [/foreign key/i, "Não foi possível concluir: há informações vinculadas."],
  [/Celular inválido/i, "Celular inválido. Use DDD + número"],
  [/check constraint|violates check/i, "Confira os dados informados e tente de novo."],
  [/value too long/i, "Um dos textos ficou longo demais. Reduza e tente de novo."],
];

type MaybeError = { message?: string | null; code?: string | null } | null | undefined;

export function friendlyError(error: MaybeError, fallback = "Não foi possível concluir agora. Tente de novo."): string {
  const message = error?.message ?? "";
  if (!message) return fallback;
  for (const [pattern, text] of [...AUTH_MAP, ...DB_MAP]) {
    if (pattern.test(message)) return text;
  }
  return fallback;
}

/** Mensagem neutra para login/recuperação (nunca revela se o e-mail existe). */
export const NEUTRAL_RESET_MESSAGE = "Se o e-mail estiver cadastrado, enviaremos um código";
