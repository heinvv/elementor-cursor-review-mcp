import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import type { Severity } from './types.js'

export interface Rule {
  id: string
  pattern: string
  negativePattern?: string
  message: string
  severity: Severity
}

export interface RuleFile {
  title: string
  severity: Severity
  category: string
  filePatterns: string[]
  rules?: Rule[]
}

export class RuleLoader {
  private rulesCache: Map<string, RuleFile> = new Map()
  private rulesDir: string

  constructor(rulesDir: string = './rules') {
    this.rulesDir = rulesDir
  }

  private parseMarkdownFile(filePath: string): RuleFile | null {
    try {
      const content = readFileSync(filePath, 'utf-8')
      const lines = content.split('\n')
      
      if (!lines[0].startsWith('---')) {
        return null
      }

      let yamlEndIndex = -1
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].startsWith('---')) {
          yamlEndIndex = i
          break
        }
      }

      if (yamlEndIndex === -1) {
        return null
      }

      const yamlContent = lines.slice(1, yamlEndIndex).join('\n')
      const frontmatter = this.parseYaml(yamlContent)

      return {
        title: frontmatter.title || '',
        severity: frontmatter.severity || 'info',
        category: frontmatter.category || 'general',
        filePatterns: frontmatter.filePatterns || ['**/*'],
        rules: frontmatter.rules || []
      }
    } catch (error) {
      console.warn(`Failed to parse rule file ${filePath}:`, error)
      return null
    }
  }

  private parseYaml(yamlContent: string): any {
    const result: any = {}
    const lines = yamlContent.split('\n')
    let currentKey: string | null = null
    let currentArray: any[] = []
    let inArray = false
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      if (line.trim() === '' || line.trim().startsWith('#')) continue
      
      // Check if this is an array item
      if (line.trim().startsWith('- ')) {
        if (!inArray) {
          inArray = true
          currentArray = []
        }
        
        const itemContent = line.trim().substring(2)
        if (itemContent.includes(':')) {
          // Object in array
          const obj: any = {}
          const key = itemContent.split(':')[0].trim()
          let value = itemContent.split(':').slice(1).join(':').trim().replace(/['"]/g, '')
          // Handle escaped characters in regex patterns
          if (key === 'pattern' || key === 'negativePattern') {
            value = value.replace(/\\\\/g, '\\')
          }
          obj[key] = value
          
          // Look ahead for more properties of this object
          let j = i + 1
          while (j < lines.length && lines[j].trim() && !lines[j].trim().startsWith('- ') && lines[j].startsWith('  ')) {
            const propLine = lines[j].trim()
            if (propLine.includes(':')) {
              const [propKey, ...propValueParts] = propLine.split(':')
              let propValue = propValueParts.join(':').trim().replace(/['"]/g, '')
              // Handle escaped characters in regex patterns
              if (propKey.trim() === 'pattern' || propKey.trim() === 'negativePattern') {
                propValue = propValue.replace(/\\\\/g, '\\')
              }
              obj[propKey.trim()] = propValue
            }
            j++
          }
          i = j - 1
          currentArray.push(obj)
        } else {
          // Simple value in array
          currentArray.push(itemContent.replace(/['"]/g, ''))
        }
        continue
      }
      
      // If we were in an array and now we're not, save the array
      if (inArray && !line.trim().startsWith('- ') && currentKey) {
        result[currentKey] = currentArray
        inArray = false
        currentArray = []
        currentKey = null
      }
      
      if (line.includes(':')) {
        const [key, ...valueParts] = line.split(':')
        const value = valueParts.join(':').trim()
        const cleanKey = key.trim()
        
        if (value === '' || value === '[]') {
          // This might be the start of an array
          currentKey = cleanKey
          if (value === '[]') {
            result[cleanKey] = []
          }
        } else if (value.startsWith('[') && value.endsWith(']')) {
          // Inline array
          const arrayContent = value.slice(1, -1)
          result[cleanKey] = arrayContent.split(',').map(s => s.trim().replace(/['"]/g, ''))
        } else if (value.startsWith('"') && value.endsWith('"')) {
          // String
          result[cleanKey] = value.slice(1, -1)
        } else if (value === 'true' || value === 'false') {
          // Boolean
          result[cleanKey] = value === 'true'
        } else if (value.match(/^\d+$/)) {
          // Number
          result[cleanKey] = parseInt(value, 10)
        } else {
          // Default to string
          result[cleanKey] = value.replace(/['"]/g, '')
        }
      }
    }
    
    // Handle final array if we ended while in one
    if (inArray && currentKey) {
      result[currentKey] = currentArray
    }

    return result
  }

  loadRules(): RuleFile[] {
    try {
      const files = readdirSync(this.rulesDir)
      const rules: RuleFile[] = []

      for (const file of files) {
        if (!file.endsWith('.md')) continue
        
        const filePath = join(this.rulesDir, file)
        const ruleFile = this.parseMarkdownFile(filePath)
        
        if (ruleFile) {
          this.rulesCache.set(file, ruleFile)
          rules.push(ruleFile)
        }
      }

      return rules
    } catch (error) {
      console.warn('Failed to load rules directory:', error)
      return []
    }
  }

  getRulesForFile(filePath: string): Rule[] {
    const allRules: Rule[] = []
    
    for (const ruleFile of this.rulesCache.values()) {
      if (this.matchesFilePattern(filePath, ruleFile.filePatterns)) {
        if (ruleFile.rules) {
          allRules.push(...ruleFile.rules)
        }
      }
    }

    return allRules
  }

  private matchesFilePattern(filePath: string, patterns: string[]): boolean {
    for (const pattern of patterns) {
      if (pattern === '**/*') return true
      
      // Simple pattern matching
      const regex = pattern
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*')
        .replace(/\./g, '\\.')
      
      if (new RegExp(regex).test(filePath)) {
        return true
      }
    }
    return false
  }
}
