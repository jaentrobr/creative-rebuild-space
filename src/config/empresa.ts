export const EMPRESA = {
  RAZAO_SOCIAL: "Entrô Tecnologia Ltda.",
  NOME_FANTASIA: "Entrô",
  CNPJ: "00.000.000/0000-00",
  ENDERECO: "Rua Exemplo, 000, Bairro Exemplo, Belo Horizonte/MG, CEP 00000-000",
  EMAIL_CONTATO: "contato@jaentro.com.br",
  FORO: "Belo Horizonte/MG",
  VERSAO_TERMOS: "1.0",
  DATA_VIGENCIA: "00/00/0000",
  TERMOS_PROVISORIOS: true,
} as const;

/** Substitui marcadores {{CHAVE}} pelos dados da empresa. */
export function aplicarDadosEmpresa(texto: string) {
  return texto.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const value = (EMPRESA as Record<string, string | boolean>)[key];
    return value === undefined ? match : String(value);
  });
}

export const LINHA_EMPRESA = `${EMPRESA.RAZAO_SOCIAL} – CNPJ ${EMPRESA.CNPJ} – ${EMPRESA.ENDERECO}`;
