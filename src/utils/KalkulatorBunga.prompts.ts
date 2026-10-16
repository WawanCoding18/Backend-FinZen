import fs from "fs";
import path from "path";

const PROMPTS_DIR = path.join(__dirname, "../prompts");

const systemPromptKalkulatorBunga = fs.readFileSync(
  path.join(PROMPTS_DIR, "system_prompt_KalkulatorBunga.md"),
  "utf-8",
);
const knowledgeBaseKalkulatorBunga = fs.readFileSync(
  path.join(PROMPTS_DIR, "knowledge_base_KalkulatorBunga.md"),
  "utf-8",
);

export const FULL_SYSTEM_INSTRUCTION_KALKULATOR_BUNGA = `${systemPromptKalkulatorBunga}

---

# LAMPIRAN: knowledge_base_KalkulatorBunga.md

${knowledgeBaseKalkulatorBunga}`;
