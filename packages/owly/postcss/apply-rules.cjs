const fs = require('fs')
const postcss = require('postcss')
const applyDefinitions = new Map()

function getAllApplyDefinitions() {
  const filesWithApplyDefinitions = [
    'styles/tokens/typography.css',
  ]

  for (const file of filesWithApplyDefinitions) {
    const css = fs.readFileSync(file, 'utf-8')

    const parsedCss = postcss.parse(css)
    
    parsedCss.walkRules((rule) => {
      if (rule.selector.startsWith('--apply-')) {
        applyDefinitions.set(`--${rule.selector.slice(8)}`, rule)
      }
    })
  }

}

module.exports = (opts = {}) => {
  getAllApplyDefinitions()

  return {
    postcssPlugin: 'postcss-apply-rules',
    AtRule(rule, postcss) {
      if (rule.name !== 'apply') {
        return
      }

      const definition = applyDefinitions.get(rule.params)

      if (!definition) {
        throw new Error(`No definition found for @apply ${rule.params}`)
      }

      definition.walkDecls((decl) => {
        rule.parent.insertBefore(rule, decl.clone())
      })

      rule.remove()
    },
  }
}

module.exports.postcss = true