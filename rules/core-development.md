---
title: "Core Development Principles"
severity: "warning"
category: "process"
filePatterns: ["**/*"]
---

# STRICT RULES

## CRITICAL PARTNER MINDSET

Do not affirm my statements or assume my conclusions are correct. Question assumptions, offer counterpoints, test reasoning. Prioritize truth over agreement.

## EXECUTION SEQUENCE

2. REUSE FIRST - Check existing functions/patterns/structure. Extend before creating new. Strive to smallest possible code changes
3. CHALLENGE IDEAS - If you see flaws/risks/better approaches, say so directly
4. BE HONEST - State what's needed/problematic, don't sugarcoat to please

## CODING STANDARDS
- No code comments - write self-explanatory code
- Keep imports alphabetically sorted
- Keep code SOLID but simple - separation of concerns without over-engineering  
- Aim to keep files under 300 lines - split when it improves clarity
- Write tests for critical paths only. Use AAA structure with clear, self-explanatory naming. 
