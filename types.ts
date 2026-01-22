export enum BillCategory {
  ENERGIA = 'Energia',
  AGUA = 'Água',
  TERRENO = 'Terreno',
  PLACA_SOLAR = 'Placa Solar',
  GASOLINA = 'Gasolina',
  FEIRA = 'Feira',
  RESTAURANTE = 'Restaurante',
  VIAGEM = 'Viagem',
  TELEFONE_MOVEL = 'Telefone Móvel',
  INTERNET = 'Internet Residencial',
  VIVO = 'Conta Vivo',
  PENSAO_ERIC = 'Pensão Eric',
  EMPRESTIMO = 'Empréstimo',
  EXTRAS = 'Contas Extras',
  OUTROS = 'Outros'
}

export interface Bill {
  id: string;
  category: string; // Mudado para string para suportar infinitas categorias
  description: string;
  amount: number;
  dueDate: string;
  paid: boolean;
  createdAt: number;
  paidAt?: number; // Data do pagamento (timestamp)
}

export interface FinancialSummary {
  income: number;
  totalPaid: number;
  totalPending: number;
  balance: number;
}