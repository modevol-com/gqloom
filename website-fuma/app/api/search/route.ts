import { i18n } from "@/lib/i18n"
import { source } from "@/lib/source"
import { Jieba } from "@node-rs/jieba"
import { dict } from "@node-rs/jieba/dict"
import type {
  DefaultTokenizer,
  DefaultTokenizerConfig,
  Optional,
  Stemmer,
} from "@orama/orama"
import { normalizeToken } from "@orama/orama/internals"
import { createI18nSearchAPI } from "fumadocs-core/search/server"

class ChineseTokenizer implements DefaultTokenizer {
  language = "chinese"
  normalizationCache: Map<string, string>
  tokenizeSkipProperties: Set<string>
  stemmerSkipProperties: Set<string>
  allowDuplicates: boolean
  stemmer?: Stemmer
  stopWords?: string[]
  protected jieba: Jieba
  constructor(config: DefaultTokenizerConfig = {}) {
    this.tokenizeSkipProperties = new Set(config.tokenizeSkipProperties)
    this.stemmerSkipProperties = new Set(config.stemmerSkipProperties)
    this.allowDuplicates = config.allowDuplicates ?? false
    this.normalizationCache = new Map()
    this.stemmer = config.stemmer
    this.stopWords = config.stopWords as string[]

    this.jieba = Jieba.withDict(dict)
  }

  normalizeToken(
    this: DefaultTokenizer,
    prop: Optional<string>,
    token: string,
    withCache: Optional<boolean>
  ): string {
    return normalizeToken.call(this, prop ?? "", token, withCache)
  }

  tokenize(
    input: string,
    _language?: string,
    prop?: string,
    withCache?: boolean
  ): string[] {
    if (typeof input !== "string") {
      return [input]
    }
    let tokens: string[]
    if (prop && this?.tokenizeSkipProperties?.has(prop)) {
      tokens = [this.normalizeToken(prop, input, withCache)]
    } else {
      tokens = this.jieba.cut(input)
    }

    const trimTokens = ChineseTokenizer.trim(tokens)

    if (!this.allowDuplicates) {
      return Array.from(new Set(trimTokens))
    }

    return trimTokens
  }

  static trim(text: string[]): string[] {
    while (text[text.length - 1] === "") {
      text.pop()
    }
    while (text[0] === "") {
      text.shift()
    }
    return text
  }
}

export const { GET } = createI18nSearchAPI("advanced", {
  i18n,
  indexes: source.getLanguages().flatMap((entry) =>
    entry.pages.map((page) => ({
      title: page.data.title,
      description: page.data.description,
      structuredData: page.data.structuredData,
      id: page.url,
      url: page.url,
      locale: entry.language,
    }))
  ),
  localeMap: {
    // the prop name should be its locale code in your i18n config, (e.g. `zh`)
    zh: {
      // options for the language
      tokenizer: new ChineseTokenizer(),
    },
  },
})
