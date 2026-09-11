export type LegalSection = { title: string; body: string[] };

export const legalNotice = "Versão provisória, sujeita a revisão jurídica.";

export const termsSections: LegalSection[] = [
  {
    title: "1. Cadastro",
    body: [
      "Para comprar ingressos ou criar eventos na Entrô é necessário criar uma conta com nome, e-mail, CPF e data de nascimento.",
      "Você é responsável por manter seus dados de acesso em sigilo e por todas as atividades realizadas na sua conta.",
    ],
  },
  {
    title: "2. Compra de ingressos",
    body: [
      "Os ingressos são vendidos diretamente pelos produtores de cada evento; a Entrô atua como plataforma de intermediação.",
      "Após a confirmação do pagamento, o ingresso fica disponível na conta do comprador com um QR code de uso único.",
    ],
  },
  {
    title: "3. Taxas de serviço",
    body: [
      "Incide uma taxa de serviço sobre o valor do ingresso, paga pelo comprador no momento da compra.",
      "A taxa é de 7% para pagamentos via Pix e 8% para pagamentos no cartão, respeitado um valor mínimo por transação.",
    ],
  },
  {
    title: "4. Meia-entrada",
    body: [
      "A meia-entrada é destinada a estudantes, idosos e demais públicos previstos em lei, mediante apresentação de documento comprobatório na entrada do evento.",
      "A quantidade de ingressos de meia-entrada é limitada por lote e por evento, conforme definido pelo produtor.",
    ],
  },
  {
    title: "5. Direito de arrependimento",
    body: [
      "Compras feitas fora do estabelecimento físico podem ser canceladas em até 7 dias corridos após a compra, desde que o pedido seja feito antes do evento, com reembolso integral.",
    ],
  },
  {
    title: "6. Cancelamento pelo comprador",
    body: [
      "Após o prazo de arrependimento, o cancelamento só é possível quando o produtor do evento permitir essa opção, podendo ser cobrada uma taxa de cancelamento.",
    ],
  },
  {
    title: "7. Transferência de ingressos",
    body: [
      "Ingressos podem ser transferidos para outra pessoa cadastrada na Entrô. Ao transferir, um novo QR code é gerado e o anterior é invalidado.",
    ],
  },
  {
    title: "8. Eventos cancelados ou adiados",
    body: [
      "Se um evento for cancelado pelo produtor, o valor pago pelo ingresso é reembolsado integralmente.",
      "Em caso de adiamento, o ingresso permanece válido para a nova data ou pode ser reembolsado conforme as regras informadas pelo produtor.",
      "Se o evento mudar de data, você será avisado por e-mail e poderá manter o ingresso ou pedir reembolso integral até o início do evento na nova data. Se não escolher, seu ingresso continua válido.",
    ],
  },
  {
    title: "9. QR code de uso único",
    body: [
      "Cada ingresso possui um QR code de uso único, validado uma única vez na entrada do evento. Após a leitura, o código não pode ser reutilizado.",
    ],
  },
  {
    title: "10. Responsabilidades do produtor",
    body: [
      "O produtor é responsável pela realização do evento, pelas informações divulgadas na página do evento, pelo atendimento ao público no local e pelo cumprimento das leis aplicáveis, incluindo classificação etária e meia-entrada.",
    ],
  },
];

export const privacySections: LegalSection[] = [
  {
    title: "1. Dados coletados",
    body: [
      "Coletamos nome completo, e-mail, CPF e data de nascimento no momento do cadastro, além de dados de uso da plataforma.",
      "Produtores informam também um celular de contato durante a verificação da conta, usado apenas para falarmos sobre a conta.",
    ],
  },
  {
    title: "2. Finalidade do tratamento",
    body: [
      "Os dados são usados para viabilizar a compra e emissão de ingressos, check-in nos eventos, comunicação sobre pedidos, prevenção a fraudes e cumprimento de obrigações legais.",
    ],
  },
  {
    title: "3. Compartilhamento de dados",
    body: [
      "Compartilhamos os dados necessários com o produtor do evento (para check-in e comunicação) e com o processador de pagamentos (para viabilizar a transação financeira).",
      "Não vendemos dados pessoais a terceiros.",
    ],
  },
  {
    title: "4. Prazo de guarda",
    body: [
      "Os dados são mantidos pelo tempo necessário para cumprir as finalidades descritas nesta política e as obrigações legais e fiscais aplicáveis.",
    ],
  },
  {
    title: "5. Direitos do titular",
    body: [
      "Nos termos da LGPD, você pode solicitar acesso, correção, portabilidade, anonimização ou exclusão dos seus dados pessoais, bem como revogar consentimentos concedidos anteriormente.",
    ],
  },
  {
    title: "6. Contato",
    body: [
      "Para exercer seus direitos ou tirar dúvidas sobre esta política, entre em contato com contato@jaentro.com.br.",
    ],
  },
];
