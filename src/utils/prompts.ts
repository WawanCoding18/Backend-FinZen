import fs from "fs";
import path from "path";

const PROMPTS_DIR = path.join(__dirname, "../prompts");

export const getFullSystemInstruction = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const todayDate = `${year}-${month}-${day}`;
  return todayDate;
};

const systemPrompt = fs.readFileSync(
  path.join(PROMPTS_DIR, "system_prompt.md"),
  "utf-8",
);
const knowledgeBase = fs.readFileSync(
  path.join(PROMPTS_DIR, "knowledge_base.md"),
  "utf-8",
);

export const FULL_SYSTEM_INSTRUCTION = `${systemPrompt}

---

# LAMPIRAN: knowledge_base.md

${knowledgeBase}`;
