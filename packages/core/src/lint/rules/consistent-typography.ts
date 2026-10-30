import { defineRule } from '#core/lint/rule'
import { nearestValue } from '#core/lint/utils'

/** Even sizes of a common type scale; set `sizes` to the scale of the design system. */
const DEFAULT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 96]

interface Options {
  /** Allowed font sizes in px. */
  sizes?: number[]
  /** Allowed weights per size; a size not listed here may use any weight. */
  styles?: { size: number; weights: number[] }[]
}

export default defineRule({
  meta: {
    id: 'consistent-typography',
    category: 'typography',
    description: 'Font size and weight should follow the type scale'
  },
  match: ['TEXT'],
  check(node, context) {
    const options = (context.getConfig() as Options | undefined) ?? {}
    const sizes = options.sizes ?? DEFAULT_SIZES
    const styles = node.textStyles ?? [{ fontSize: node.fontSize, fontWeight: 400 }]
    const reported = new Set<string>()
    for (const { fontSize, fontWeight } of styles) {
      const rule = options.styles?.find((entry) => entry.size === fontSize)
      if (sizes.includes(fontSize)) {
        if (!rule || rule.weights.includes(fontWeight)) continue
        const key = `${fontSize}/${fontWeight}`
        if (reported.has(key)) continue
        reported.add(key)
        context.report({
          node,
          message: `Font weight ${fontWeight} is not allowed at ${fontSize}px`,
          suggest: `Use one of the weights ${rule.weights.join(', ')} at ${fontSize}px`,
          data: { fontSize, fontWeight }
        })
        continue
      }
      const key = String(fontSize)
      if (reported.has(key)) continue
      reported.add(key)
      const suggested = nearestValue(fontSize, sizes)
      context.report({
        node,
        message: `Font size ${fontSize}px is not in the type scale`,
        suggest: 'Use a text style or a size from the type scale',
        data: { fontSize },
        suggestions:
          suggested === null || node.styleRunCount > 0
            ? undefined
            : [{ kind: 'set', changes: { fontSize: suggested } }]
      })
    }
  }
})
