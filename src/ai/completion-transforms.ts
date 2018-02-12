import { CompletionOption, CompletionKind } from '../ai/completions'
import { is } from '../support/utils'
import { parse } from 'path'

export interface CompletionTransformRequest {
  completionKind: CompletionKind,
  lineContent: string,
  leftChar: string,
  query: string,
  line: number,
  column: number,
  startIndex: number,
  completionOptions: CompletionOption[],
}

type Transformer = (request: CompletionTransformRequest) => CompletionOption[]
const transforms = new Map<string, Transformer>()

export default (filetype: string, request: CompletionTransformRequest) => {
  const transformer = transforms.get(filetype)
  const callable = is.function(transformer) || is.asyncfunction(transformer)
  if (transformer && callable) return transformer(request)
  return request.completionOptions
}

const isModuleImport = (lineContent: string, column: number) => {
  const fragment = lineContent.slice(0, column)
  return /\b(from|import)\s*["'][^'"]*$/.test(fragment)
    || /\b(import|require)\(['"][^'"]*$/.test(fragment)
}

transforms.set('typescript', m => {
  // in the future these can be separated into different modules and organized
  // better. for MVP this will be good enough
  if (m.completionKind !== CompletionKind.Path) return m.completionOptions

  const tryingToCompleteInsideImportPath = isModuleImport(m.lineContent, m.column)
  if (!tryingToCompleteInsideImportPath) return m.completionOptions

  return m.completionOptions.map(o => ({
    ...o,
    insertText: parse(o.text).name,
  }))
})