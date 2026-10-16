import fs from "fs";
import path from "path";

const PROMPTS_DIR = path.join(__dirname, "../prompts");

const systemPromptOJK = fs.readFileSync(
  path.join(PROMPTS_DIR, "system_promptOJK.md"),
  "utf-8",
);
const knowledgeBaseOJK = fs.readFileSync(
  path.join(PROMPTS_DIR, "knowledge_base_OJK.md"),
  "utf-8",
);

export const FULL_SYSTEM_INSTRUCTION_OJK = `${systemPromptOJK}

---

# LAMPIRAN: knowledge_base_OJK.md

${knowledgeBaseOJK}`;
