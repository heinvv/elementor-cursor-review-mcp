import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import { z } from 'zod';

const ruleMetadataSchema = z.object({
  title: z.string().optional(),
  severity: z.enum(['error', 'warning', 'info']).default('warning'),
  category: z.string().default('general'),
  filePatterns: z.array(z.string()).default(['*']),
  examples: z.array(z.object({
    bad: z.string().optional(),
    good: z.string().optional(),
  })).default([]),
});

export type RuleMetadata = z.infer<typeof ruleMetadataSchema>;

export interface Rule {
  id: string;
  metadata: RuleMetadata;
  content: string;
  filePath: string;
}

export class RuleLoader {
  private rulesDirectory: string;
  private rules: Map<string, Rule> = new Map();

  constructor(rulesDirectory: string = './rules') {
    this.rulesDirectory = path.resolve(rulesDirectory);
  }

  loadRules(): Rule[] {
    try {
      if (!fs.existsSync(this.rulesDirectory)) {
        console.warn(`Rules directory not found: ${this.rulesDirectory}`);
        return [];
      }

      const files = fs.readdirSync(this.rulesDirectory)
        .filter(file => file.endsWith('.md'))
        .sort();

      this.rules.clear();

      for (const file of files) {
        try {
          const rule = this.loadRule(file);
          if (rule) {
            this.rules.set(rule.id, rule);
          }
        } catch (error) {
          console.error(`Failed to load rule from ${file}:`, error instanceof Error ? error.message : error);
        }
      }

      return Array.from(this.rules.values());
    } catch (error) {
      console.error('Failed to load rules:', error instanceof Error ? error.message : error);
      return [];
    }
  }

  private loadRule(filename: string): Rule | null {
    const filePath = path.join(this.rulesDirectory, filename);
    const ruleId = path.basename(filename, '.md');

    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const { data, content } = matter(fileContent);

      const validationResult = ruleMetadataSchema.safeParse(data);
      if (!validationResult.success) {
        console.error(`Invalid metadata in ${filename}:`, validationResult.error.message);
        return null;
      }

      const metadata = validationResult.data;
      
      // Use filename as title if not provided
      if (!metadata.title) {
        metadata.title = ruleId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      }

      return {
        id: ruleId,
        metadata,
        content: content.trim(),
        filePath,
      };
    } catch (error) {
      console.error(`Error reading rule file ${filename}:`, error instanceof Error ? error.message : error);
      return null;
    }
  }

  getRule(id: string): Rule | undefined {
    return this.rules.get(id);
  }

  getRulesByCategory(category: string): Rule[] {
    return Array.from(this.rules.values()).filter(rule => rule.metadata.category === category);
  }

  getRulesBySeverity(severity: 'error' | 'warning' | 'info'): Rule[] {
    return Array.from(this.rules.values()).filter(rule => rule.metadata.severity === severity);
  }

  formatRulesForLLM(rules: Rule[]): string {
    if (rules.length === 0) {
      return 'No coding rules provided.';
    }

    let formatted = 'CODING GUIDELINES:\n\n';
    
    for (const rule of rules) {
      formatted += `## ${rule.metadata.title} (${rule.metadata.severity})\n`;
      formatted += `Category: ${rule.metadata.category}\n`;
      formatted += `File patterns: ${rule.metadata.filePatterns.join(', ')}\n\n`;
      formatted += `${rule.content}\n`;
      
      if (rule.metadata.examples.length > 0) {
        formatted += '\nExamples:\n';
        for (const example of rule.metadata.examples) {
          if (example.bad) {
            formatted += `❌ Bad: ${example.bad}\n`;
          }
          if (example.good) {
            formatted += `✅ Good: ${example.good}\n`;
          }
        }
      }
      
      formatted += '\n---\n\n';
    }

    return formatted;
  }
}
