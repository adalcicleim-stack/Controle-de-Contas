
import { GoogleGenAI } from "@google/genai";
import { Bill, FinancialSummary } from "../types";

export const getFinancialAdvice = async (summary: FinancialSummary, bills: Bill[]): Promise<string> => {
  // Always use {apiKey: process.env.API_KEY} for initialization
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const paidBillsStr = bills
    .filter(b => b.paid)
    .map(b => `${b.category}: R$ ${b.amount.toFixed(2)}`)
    .join(', ');

  const prompt = `
    Como um assistente financeiro especialista, analise meu resumo mensal:
    - Salário: R$ ${summary.income.toFixed(2)}
    - Total Pago: R$ ${summary.totalPaid.toFixed(2)}
    - Saldo Restante: R$ ${summary.balance.toFixed(2)}
    - Contas Pagas: ${paidBillsStr}

    Dê uma dica curta (máximo 3 frases) e motivadora em Português sobre como melhorar meus gastos ou o que focar no próximo mês baseado nessas categorias (Energia, Água, Terreno, Placa Solar, Gasolina, Feira).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    // response.text is a property that returns the string output
    return response.text || "Continue gerenciando suas contas com sabedoria!";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Mantenha o foco em suas metas financeiras para um futuro próspero.";
  }
};
