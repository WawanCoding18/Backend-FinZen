import fs from "fs";
import path from "path";

const PROMPTS_DIR = path.join(__dirname, "../prompts");

const systemPromptFinancialHealth = fs.readFileSync(
  path.join(PROMPTS_DIR, "system_prompt_FinancialHealth.md"),
  "utf-8",
);
const knowledgeBaseFinancialHealth = fs.readFileSync(
  path.join(PROMPTS_DIR, "knowledge_base_FinancialHealth.md"),
  "utf-8",
);

export const FULL_SYSTEM_INSTRUCTION_FINANCIAL_HEALTH = `${systemPromptFinancialHealth}

---

# LAMPIRAN: knowledge_base_FinancialHealth.md

${knowledgeBaseFinancialHealth}`;